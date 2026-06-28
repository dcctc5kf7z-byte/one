/**
 * Engine 层 — 启发式预分类 + 条件层注入 + 会话状态追踪
 *
 * 职责：
 *   1. 在 LLM 调用前以简单规则粗判状态（避免两轮 LLM 调用的延迟和成本翻倍）
 *   2. 根据预分类结果 + 会话上下文决定注入哪些层
 *   3. 维护会话级状态追踪（stuck计数、出口序列、镜子消隐计数）
 *
 * 设计决策（见实施计划 B.6 关键设计决策 #4）：
 *   启发式预分类允许误判——LLM 收到 Layer 1 状态确认规则后会在首句公开判断状态，
 *   用户纠正即可。误判的成本远低于两轮调用的延迟和费用。
 *
 * 依赖：layers.ts（L0-L4 常量 + assemblePrompt）
 */

import { assemblePrompt, TOKEN_BUDGET } from "./layers.ts";

// ============================================================
// 类型定义
// ============================================================

/** 五状态枚举（含弱起子状态） */
export enum FiveState {
  EMPTY = "空虚",
  VAGUE_IDEA = "模糊念头",
  WRITING = "写作中",
  WEAK_START = "写作中·弱起",
  STUCK = "卡住了",
  FINISHED = "写完了",
}

/** 诊断出口类型 */
export type ExitType = "一" | "二" | "三";

/** 用户对上一轮诊断的响应类型 */
export type UserResponse =
  | "confirm_state"       // 用户确认状态判断
  | "negate_diagnosis"    // 用户否定诊断（"不对""不是这样"）
  | "correct_state"       // 用户纠正状态（"不是空虚，我是..."）
  | "new_text"            // 用户贴了新文字
  | "continue_writing"    // 用户继续写（正常流转）
  | "end";                // 用户明确结束

/** Engine 输入（来自 HTTP 请求体） */
export interface EngineRequest {
  userText: string;
  conversationId?: string;
  /** 用户对上一轮的反馈类型 */
  userResponse?: UserResponse;
  /** 如果用户纠正了状态，这里是被纠正为的状态 */
  correctedState?: FiveState;
  /** 上一轮诊断的出口类型（用于回退路由） */
  lastExitType?: ExitType;
}

/** Engine 输出（交给 Edge Function 组装 LLM 调用） */
export interface EngineOutput {
  /** 预分类状态 */
  preClassifiedState: FiveState;
  /** 应注入的层 ID 列表 */
  layers: string[];
  /** 组装后的 System Prompt */
  systemPrompt: string;
  /** 预估 token 数 */
  estimatedTokens: number;
  /** 更新后的会话上下文（Edge Function 需回存到 Store） */
  updatedContext: ConversationContext;
}

/** 会话上下文（Engine 在内存中维护，不持久化） */
export interface ConversationContext {
  /** 当前确认的状态 */
  currentState: FiveState;
  /** 卡住了出现次数（每确认一次 +1） */
  stuckCount: number;
  /** 连续出口类型追踪 */
  consecutiveExitTypes: ExitType[];
  /** 连续出口二计数（用于偏倚→结构回检） */
  consecutiveExitTwoCount: number;
  /** 连续出口三计数（用于镜子消隐） */
  consecutiveExitThreeCount: number;
  /** 镜子消隐是否已触发 */
  mirrorFadeTriggered: boolean;
  /** 镜子消隐冷却期剩余轮数 */
  mirrorFadeCooldown: number;
  /** 用户上一轮提交的文字 */
  lastUserText: string;
  /** 状态确认跳过标志（连续两轮同状态未否定后启用） */
  confirmationSkippable: boolean;
  /** 连续同状态轮数（用于 confirmationSkippable 判定） */
  consecutiveSameStateCount: number;
  /** 上一轮诊断出口（用于本轮回退路由判定） */
  lastExitType?: ExitType;
}

/** 层注入规则 */
interface LayerRule {
  /** 始终加载的层 */
  always: string[];
  /** 条件加载的层 */
  conditional?: string[];
  /** 条件说明 */
  condition?: string;
}

// ============================================================
// 启发式预分类
// ============================================================

/** 方向词（模糊念头识别） */
const DIRECTION_WORDS = [
  "关于", "想写", "打算写", "有个想法", "构思", "灵感",
  "主题", "题材", "写什么", "要写", "准备写",
];

/** 叙事元素关键词类别 */
const NARRATIVE_ELEMENTS = {
  person: ["他", "她", "它", "我", "你", "他们", "她们", "我们", "你们",
           "父亲", "母亲", "爸爸", "妈妈", "儿子", "女儿", "朋友", "男人", "女人",
           "老人", "孩子", "少年", "少女", "老板", "同事", "陌生人", "司机"],
  action: ["走", "跑", "跳", "说", "看", "听", "想", "做", "拿", "放",
           "来", "去", "离开", "回来", "打开", "关上", "坐下", "站起", "回头",
           "走进", "走出", "推开", "拉上", "举起", "放下", "告诉", "回答"],
  dialogue: ["「", "」", "\"", "\"", "：“", "：“", "：", "道：", "说：", "问："],
  scene: ["房间", "门", "窗", "街", "路", "车", "楼", "灯", "雨", "雪",
          "天", "夜", "早晨", "傍晚", "山", "河", "海", "树", "桌", "椅",
          "床", "杯", "书", "手机", "烟", "酒", "花", "光", "影", "风"],
  object: ["信", "钥匙", "照片", "钱", "包", "衣服", "戒指", "手表",
           "刀", "枪", "笔记本", "手机", "电脑", "盒子", "袋子"],
  time: ["那年", "那天", "那时", "后来", "之后", "之前", "过了",
         "几年前", "三天后", "第二天", "早上", "晚上", "午夜", "凌晨",
         "春天", "夏天", "秋天", "冬天", "去年", "明年"],
};

/**
 * 卡住了否定词——修改过程中反复否定的信号。
 * 注意：不含"不对"作为独立词条。
 * "不对，" / "不对。" 等变体在 preClassify() 中有语境区分：
 *   - 前面是"哪里"/"感觉哪里" → 整体评估（写完了 Pri2），不计为修改否定
 *   - 否则 → 修改否定（卡住了 Pri1）
 * "还是不对"不受语境影响——它在任何语境中都是修改否定信号。
 */
const STUCK_EXPLICIT_NEGATION = [
  "还是不对", "不是这个意思", "重来", "不是这样的", "不是这个感觉",
  "不对，", "不对。", "不对 ", "不对\n", "不对！", "不对~",
];

/**
 * 空虚元信号——显式表达"没东西可写"的短语。
 * L1 规范明确将此类短语归为空虚 Pri3：包括"不知道写什么""脑子空白""没想法"等元描述。
 * 这些短语中的"想"可能被 NARRATIVE_ELEMENTS.action 误匹配，故在空虚判定前优先检测。
 */
const EMPTY_META_SIGNALS = [
  "不知道写什么", "不知道写", "脑子空", "脑子一片空", "一片空白",
  "没想法", "没有想法", "写不出", "什么都写不出", "什么都没有",
  "想不到写什么", "啥也写不出",
];

/** 写完了不确定词 */
const FINISHED_UNCERTAINTY_WORDS = [
  "你觉得怎么样", "会不会太", "这样可以吗", "总感觉哪里不对",
  "帮我看看", "怎么样", "可以吗", "行不行", "好不好",
  "感觉哪里不对", "哪里不对", "不对劲",
];

/**
 * 启发式预分类
 *
 * 按照 L1 优先级顺序（卡住了→写完了→空虚→模糊念头→写作中）依次匹配。
 * 允许误判——LLM 在首句确认状态，用户纠正即可。
 *
 * 关键词区分（来自 L1）：
 *   - "不对"在修改过程中反复否定语境 → 卡住了 Pri1
 *   - "总感觉哪里不对"是整体评估 → 写完了 Pri2
 *   - 若同时包含修改否定和整体不确定 → 取优先级更高者（卡住了 Pri1 > 写完了 Pri2）
 *
 * @param userText 用户输入文字
 * @param context 可选会话上下文（用于"连续差异 < 20%"判定）
 * @returns 预分类状态
 */
export function preClassify(userText: string, context?: ConversationContext): FiveState {
  const trimmed = userText.trim();
  const length = trimmed.length;

  // ── 卡住了 · Pri 1 ──
  // L1 关键词区分：卡住了 Pri1 的"不对"限定在"修改过程中反复否定"语境
  // "总感觉哪里不对""哪里不对"是整体评估 → 写完了 Pri2（不触发卡住了）
  const isGlobalAssessment = (
    trimmed.includes("感觉哪里不对") ||
    trimmed.includes("总感觉哪里不对") ||
    trimmed.includes("哪里不对") ||
    trimmed.includes("不对劲")
  );

  // 条件 A: 用户消息含显式修改否定词
  // 排除：当"不对，" / "不对。" 出现在"哪里不对"整体评估语境中时不计为修改否定
  const hasStuckNegation = STUCK_EXPLICIT_NEGATION.some((w) => {
    if (!trimmed.includes(w)) return false;
    // "不对，" / "不对。" / "不对 " / "不对\n" / "不对！" — 当出现在整体评估语境中时排除
    if (isGlobalAssessment && (
      w === "不对，" || w === "不对。" || w === "不对 " ||
      w === "不对\n" || w === "不对！" || w === "不对~"
    )) {
      return false; // "总感觉哪里不对，xxx" → 写完了 Pri2，不触发卡住了
    }
    return true;
  });

  // 对"不对"做语境区分：作为独立否定词出现时才是卡住了
  // "总感觉哪里不对""哪里不对"中的"不对"是整体评估，不是修改否定
  const hasStandaloneBudui = (
    trimmed.startsWith("不对") ||
    trimmed.includes("不对，") ||
    trimmed.includes("不对。") ||
    trimmed.includes("不对 ") ||
    trimmed.includes("不对！") ||
    trimmed.includes("\n不对") ||
    trimmed === "不对"
  ) && !isGlobalAssessment;

  // 条件 B: 与上一轮相比长度变化 < 20% 且内容重复高
  let lowDiff = false;
  if (context?.lastUserText) {
    const lenDiff = Math.abs(length - context.lastUserText.length) / Math.max(context.lastUserText.length, 1);
    if (lenDiff < 0.2) {
      // 简易相似度：共同子串占比
      const commonChars = [...trimmed].filter((c) => context.lastUserText.includes(c)).length;
      const similarity = commonChars / Math.max(length, 1);
      lowDiff = similarity > 0.7;
    }
  }

  if (hasStuckNegation || hasStandaloneBudui || lowDiff) {
    return FiveState.STUCK;
  }

  // ── 写完了 · Pri 2 ──
  if (length > 50) {
    const hasUncertainty = FINISHED_UNCERTAINTY_WORDS.some((w) => trimmed.includes(w));
    if (hasUncertainty) {
      return FiveState.FINISHED;
    }
  }

  // ── 空虚 · Pri 3 ──
  // 先检测显式空虚元信号（"没想法""不知道写什么"等——L1 规范明确归为空虚）
  // 放宽长度上限到 30 字（元描述可能比纯粹空白稍长，如"脑子里一片空白什么都写不出"）
  const hasEmptySignal = EMPTY_META_SIGNALS.some((w) => trimmed.includes(w));
  if (hasEmptySignal && length < 30) {
    // 额外保护：如果同时有丰富的叙事元素（人物+场景+动作），可能是在描述而非元表达
    const narrativeScore = [
      NARRATIVE_ELEMENTS.person.some((w) => trimmed.includes(w)),
      NARRATIVE_ELEMENTS.scene.some((w) => trimmed.includes(w)),
      NARRATIVE_ELEMENTS.object.some((w) => trimmed.includes(w)),
      NARRATIVE_ELEMENTS.action.some((w) => trimmed.includes(w)),
    ].filter(Boolean).length;
    if (narrativeScore < 2) {
      return FiveState.EMPTY;
    }
    // narrativeScore >= 2 → 虽然出现了空虚词，但同时有具体叙事元素
    // → 可能是在叙事中使用这些词（如"他想不到她会来"）→ 继续往下判定
  }

  if (length < 20) {
    // 检查是否有具体名词或动词
    const hasConcreteNoun = NARRATIVE_ELEMENTS.person.some((w) => trimmed.includes(w)) ||
      NARRATIVE_ELEMENTS.scene.some((w) => trimmed.includes(w)) ||
      NARRATIVE_ELEMENTS.object.some((w) => trimmed.includes(w));
    const hasConcreteVerb = NARRATIVE_ELEMENTS.action.some((w) => trimmed.includes(w));

    if (!hasConcreteNoun && !hasConcreteVerb) {
      return FiveState.EMPTY;
    }
  }

  // ── 模糊念头 · Pri 4 ──
  const hasDirectionWord = DIRECTION_WORDS.some((w) => trimmed.includes(w));
  if (hasDirectionWord) {
    // 检查是否有具体场景/人物/动作
    const hasScene = NARRATIVE_ELEMENTS.scene.some((w) => trimmed.includes(w));
    const hasPerson = NARRATIVE_ELEMENTS.person.some((w) => trimmed.includes(w));
    const hasAction = NARRATIVE_ELEMENTS.action.some((w) => trimmed.includes(w));

    // 有方向但没有内容 → 模糊念头
    if (!hasScene && !hasPerson && !hasAction) {
      return FiveState.VAGUE_IDEA;
    }
  }

  // ── 写作中 · Pri 5（默认） ──
  // 检查是否为弱起
  if (context?.currentState === FiveState.VAGUE_IDEA ||
      context?.currentState === FiveState.WEAK_START) {
    // 从模糊念头过来——检查是否仍是弱起
    const hasNarrativeChain = checkNarrativeChain(trimmed);
    if (!hasNarrativeChain) {
      // 有物件描述但无叙事链条 → 弱起
      const hasObjectDesc = NARRATIVE_ELEMENTS.object.some((w) => trimmed.includes(w)) ||
        NARRATIVE_ELEMENTS.scene.some((w) => trimmed.includes(w));
      if (hasObjectDesc && length > 20) {
        return FiveState.WEAK_START;
      }
    }
  }

  return FiveState.WRITING;
}

/**
 * 检查文字是否具有叙事链条（人物关系/时间序列/事件因果）
 */
function checkNarrativeChain(text: string): boolean {
  // 人物关系：同时出现人物词和动作词
  const hasPerson = NARRATIVE_ELEMENTS.person.some((w) => text.includes(w));
  const hasAction = NARRATIVE_ELEMENTS.action.some((w) => text.includes(w));
  const hasTime = NARRATIVE_ELEMENTS.time.some((w) => text.includes(w));
  const hasDialogue = NARRATIVE_ELEMENTS.dialogue.some((w) => text.includes(w));

  // 叙事元素 ≥ 2 项
  const elementCount = [hasPerson, hasAction, hasTime, hasDialogue].filter(Boolean).length;
  return elementCount >= 2;
}

// ============================================================
// 条件层注入决策
// ============================================================

/**
 * 根据预分类状态 + 会话上下文决定注入哪些层
 *
 * 层注入规则：
 *   - L0+L1+L2 始终加载（~1,320 tokens）
 *   - L3：写作中 / 写完了 加载（~3,150 tokens，总计 ~4,470）
 *   - L4：以下条件之一满足时加载（~2,000 tokens，总计 ~6,470）：
 *         1. 用户否定上轮出口诊断 + 上轮出口为 一/二/三
 *         2. 连续出口二达到偏倚→结构回检触发
 *         3. 连续出口三达到镜子消隐触发
 *         4. 用户贴了新文字
 *
 * @param state 预分类状态
 * @param context 当前会话上下文
 * @param request 完整 Engine 请求
 * @returns 应注入的层 ID 列表 + 预估 token
 */
export function determineLayers(
  state: FiveState,
  context: ConversationContext,
  request: EngineRequest,
): { layers: string[]; estimatedTokens: number } {
  const layers: string[] = ["L0", "L1", "L2"];

  // ── L3 条件：写作中 或 写完了。弱起不加载 L3（Z 动作已在 L2 弱起节定义）──
  const needsL3 = state === FiveState.WRITING || state === FiveState.FINISHED;
  if (needsL3) {
    layers.push("L3");
  }

  // ── L4 条件判定 ──
  let needsL4 = false;

  // 条件 1：用户否定上轮出口诊断
  if (request.userResponse === "negate_diagnosis" && request.lastExitType) {
    // 仅当上轮出口为一/二/三时触发。弱起 Z 否定 / 卡住了朗读拒绝由 L2 流转规则处理
    needsL4 = true;
  }

  // 条件 2：预防性加载——偏倚→结构回检触发
  if (context.consecutiveExitTwoCount >= 2) {
    // 同一信号连续两轮（强触发）= 2，不同信号连续两轮（弱触发）也在这里
    // 或累积触发：三轮不同偏倚信号
    needsL4 = true;
  }

  // 条件 3：状态性加载——镜像消隐
  if (context.consecutiveExitThreeCount >= 3 && context.mirrorFadeCooldown <= 0) {
    needsL4 = true;
  }

  // 条件 4：用户贴了新文字
  if (request.userResponse === "new_text") {
    needsL4 = true;
  }

  if (needsL4) {
    layers.push("L4");
  }

  // 计算预估 token
  let estimatedTokens = TOKEN_BUDGET.alwaysLoaded;
  if (layers.includes("L3")) estimatedTokens += TOKEN_BUDGET.L3;
  if (layers.includes("L4")) estimatedTokens += TOKEN_BUDGET.L4;

  return { layers, estimatedTokens };
}

// ============================================================
// 会话上下文管理
// ============================================================

/** 创建新的空会话上下文 */
export function createContext(userText: string, state: FiveState): ConversationContext {
  return {
    currentState: state,
    stuckCount: 0,
    consecutiveExitTypes: [],
    consecutiveExitTwoCount: 0,
    consecutiveExitThreeCount: 0,
    mirrorFadeTriggered: false,
    mirrorFadeCooldown: 0,
    lastUserText: userText,
    confirmationSkippable: false,
    consecutiveSameStateCount: 0,
    lastExitType: undefined,
  };
}

/**
 * 更新会话上下文（诊断完成后调用）
 *
 * Edge Function 应从 LLM 响应中解析出实际确认的状态和出口类型，
 * 然后调用此函数更新上下文。
 *
 * @param context 当前上下文
 * @param updates 更新内容
 * @returns 新的上下文（不可变更新）
 */
export function updateContext(
  context: ConversationContext,
  updates: {
    userText: string;
    confirmedState?: FiveState;
    exitType?: ExitType;
    userResponse?: UserResponse;
    correctedState?: FiveState;
  },
): ConversationContext {
  const next = { ...context, lastUserText: updates.userText };

  // ── 状态更新 ──
  if (updates.userResponse === "correct_state" && updates.correctedState) {
    // 用户纠正状态 → 以用户描述为准
    next.currentState = updates.correctedState;
    next.confirmationSkippable = false;
    // FIX-11: 纠正状态 → 重置同状态计数器
    next.consecutiveSameStateCount = 0;
    // 状态变化 → 重置计数
    if (updates.correctedState !== context.currentState) {
      next.stuckCount = 0;
      next.consecutiveExitTwoCount = 0;
      next.consecutiveExitThreeCount = 0;
    }
  } else if (updates.confirmedState) {
    // 状态已确认
    const prevState = context.currentState;
    next.currentState = updates.confirmedState;

    // 状态变化 → 重置相关计数
    if (updates.confirmedState !== prevState) {
      next.stuckCount = 0;
      next.confirmationSkippable = false;

      // 状态变化时重置出口序列追踪
      if (updates.confirmedState !== FiveState.WRITING && updates.confirmedState !== FiveState.FINISHED) {
        next.consecutiveExitTwoCount = 0;
        next.consecutiveExitThreeCount = 0;
      }
    }

    // 卡住了计数：每次确认用户处于卡住了状态后 +1
    if (updates.confirmedState === FiveState.STUCK) {
      next.stuckCount = context.stuckCount + 1;
    }

    // FIX-11: 确认频率豁免——连续两轮同状态未被否定后启用
    // 连续同状态 且 未否定/纠正 → consecutiveSameStateCount +1
    // ≥2 轮 → confirmationSkippable = true（LLM 可根据 L1 跳过状态确认开场白）
    if (updates.confirmedState === prevState &&
        updates.userResponse !== "negate_diagnosis" &&
        updates.userResponse !== "correct_state") {
      next.consecutiveSameStateCount = context.consecutiveSameStateCount + 1;
      if (next.consecutiveSameStateCount >= 2) {
        next.confirmationSkippable = true;
      } else {
        next.confirmationSkippable = false;
      }
    } else {
      // 状态变化或用户否定/纠正 → 重置计数和跳过标志
      next.consecutiveSameStateCount = 0;
      next.confirmationSkippable = false;
    }
  }

  // ── 出口类型追踪 ──
  if (updates.exitType) {
    next.lastExitType = updates.exitType;
    next.consecutiveExitTypes = [...context.consecutiveExitTypes, updates.exitType].slice(-5);

    // 出口二计数（用于偏倚→结构回检）
    if (updates.exitType === "二") {
      next.consecutiveExitTwoCount = context.consecutiveExitTwoCount + 1;
      // 出口二不重置出口三计数
    } else if (updates.exitType === "一") {
      // 出口一插入 → 重置出口二和出口三计数
      next.consecutiveExitTwoCount = 0;
      next.consecutiveExitThreeCount = 0;
    } else if (updates.exitType === "三") {
      next.consecutiveExitThreeCount = context.consecutiveExitThreeCount + 1;
      // 出口三不重置出口二计数
    }
  }

  // ── 用户贴新文字 → 重置回退追踪，更新文字 ──
  if (updates.userResponse === "new_text") {
    next.consecutiveExitTwoCount = 0;
    next.consecutiveExitThreeCount = 0;
  }

  // ── 镜子消隐冷却期递减 ──
  if (context.mirrorFadeCooldown > 0) {
    next.mirrorFadeCooldown = context.mirrorFadeCooldown - 1;
  }

  // ── 结束 → 归零 ──
  if (updates.userResponse === "end") {
    next.stuckCount = 0;
    next.consecutiveExitTwoCount = 0;
    next.consecutiveExitThreeCount = 0;
    next.mirrorFadeCooldown = 0;
  }

  return next;
}

/**
 * 标记镜子消隐已触发 + 设置冷却期（2 轮）
 */
export function triggerMirrorFade(context: ConversationContext): ConversationContext {
  return {
    ...context,
    mirrorFadeTriggered: true,
    mirrorFadeCooldown: 2,
    consecutiveExitThreeCount: 0, // 消隐后重置计数
  };
}

// ============================================================
// Engine 主入口
// ============================================================

/**
 * Engine 主处理流程
 *
 * 1. 接收用户输入 + 会话上下文
 * 2. 启发式预分类 → 粗判状态
 * 3. 根据预分类 + 上下文决定注入层
 * 4. 组装 System Prompt
 * 5. 返回 EngineOutput（含更新后的上下文）
 */
export function processRequest(request: EngineRequest, context?: ConversationContext): EngineOutput {
  // Step 1: 启发式预分类
  const preClassifiedState = preClassify(request.userText, context);

  // Step 2: 如无上下文，创建新上下文
  const ctx = context ?? createContext(request.userText, preClassifiedState);

  // Step 3: 决定注入层
  const { layers, estimatedTokens } = determineLayers(preClassifiedState, ctx, request);

  // Step 4: 组装 System Prompt
  const systemPrompt = assemblePrompt(layers);

  // Step 5: 预更新上下文（实际确认的状态由 LLM 输出后再次更新）
  const updatedContext: ConversationContext = {
    ...ctx,
    lastUserText: request.userText,
  };

  return {
    preClassifiedState,
    layers,
    systemPrompt,
    estimatedTokens,
    updatedContext,
  };
}

// ============================================================
// 会话存储（Deno 内存，不持久化）
// ============================================================

/**
 * 会话存储——按 conversationId 索引。
 * Deno 内存存储，Edge Function 实例重启后丢失。
 * 设计规格约定：不持久化对话历史，只维护最近 3 轮上下文。
 */
class ConversationStore {
  private store = new Map<string, ConversationContext>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(id: string): ConversationContext | undefined {
    // FIX-12: 真 LRU——get 时将条目移至末尾（最近使用）
    const ctx = this.store.get(id);
    if (ctx !== undefined) {
      this.store.delete(id);
      this.store.set(id, ctx);
    }
    return ctx;
  }

  set(id: string, context: ConversationContext): void {
    // 简易 LRU：超过上限时删除最早条目
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(id, context);
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  get size(): number {
    return this.store.size;
  }
}

/** 全局会话存储实例 */
export const conversationStore = new ConversationStore();

// ============================================================
// 调试辅助：层注入决策的可解释日志
// ============================================================

export function formatDecisionLog(
  userText: string,
  state: FiveState,
  layers: string[],
  estimatedTokens: number,
): string {
  const preview = userText.length > 80 ? userText.slice(0, 80) + "…" : userText;
  return [
    `[Engine] input="${preview}"`,
    `  → state=${state}`,
    `  → layers=[${layers.join(", ")}]`,
    `  → tokens=~${estimatedTokens}`,
  ].join("\n");
}
