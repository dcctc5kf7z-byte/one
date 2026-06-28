/**
 * Hermes Phase 2 类型定义 — 六色信号 + 结构化诊断
 *
 * 替代 v3.1 五状态 WritingState/AppPhase 模型
 * 新模型：六维焦距分析 → 六色信号映射 → 结构化输出
 */

// ── 六色信号 ──
export type HermesColor =
  | 'crimson'     // 胭脂红 — 卡点：停下来
  | 'amber'       // 琥珀黄 — 模式：看见重复
  | 'steel_blue'  // 钢蓝   — 推进：有方向
  | 'violet'      // 堇紫   — 暗层：隐含未说
  | 'slate_gray'  // 鼠灰   — 数据：量化指标
  | 'pine_green'  // 松绿   — 惯性：跨文本模式

export const COLOR_MAP: Record<HermesColor, { hex: string; signal: string; meaning: string }> = {
  crimson:    { hex: '#E03E3E', signal: '卡点', meaning: '此处有阻力——停下看看' },
  amber:      { hex: '#D4A017', signal: '模式', meaning: '一个模式在重复' },
  steel_blue: { hex: '#3B82C4', signal: '推进', meaning: '这里有方向可以走' },
  violet:     { hex: '#7C3AED', signal: '暗层', meaning: '文字下面还有东西' },
  slate_gray: { hex: '#6B7280', signal: '数据', meaning: '量化指标' },
  pine_green: { hex: '#10B981', signal: '惯性', meaning: '跨文本模式' },
}

// 颜色紧迫度排序：红 > 黄 > 蓝 > 紫 > 灰 > 绿
export const COLOR_URGENCY: HermesColor[] = [
  'crimson', 'amber', 'steel_blue', 'violet', 'slate_gray', 'pine_green',
]

// ── 模式 ──
export type ViewMode = 'perspective' | 'my_text'

// ── 逐句分析 ──
export interface SentenceAnalysis {
  index: number
  text: string
  colors: HermesColor[]
  analysis: {
    linguistic?: string   // 语言层：句法、选词、节奏
    semantic?: string     // 语义层：主题连贯、意象链
    sentiment?: string    // 情感层：调性、转向、密度
    structural?: string   // 结构层：文本架构、逻辑链
    pragmatic?: string    // 语用层：读者效果、修辞目的
    critical?: string     // 批判层：隐含假设、未说之物
    digital?: string      // 数字层：可读性分、句长统计
  }
}

// ── Gutter 色块 ──
export interface GutterBlock {
  color: HermesColor
  signal: string    // 中文信号名：卡点/模式/推进/暗层/数据/惯性
  detail: string    // 简短说明
}

// ── API 响应 ──
export interface HermesDiagnoseResponse {
  sentences: SentenceAnalysis[]
  gutter_blocks: GutterBlock[][]   // 外层数组 = 每行，内层 = 该行的色块列表
  diagnosis: {
    analysis: string   // X→Y 层分析 (Markdown)
    push: string       // Z 层推进建议 (Markdown)
  }
  meta: {
    mode: ViewMode
    text_length: number
    fingerprint_id?: string
    pine_green_active: boolean
    endpoint: string
    layers: string[]
  }
  fingerprint?: {
    pine_green_patterns?: Array<{ pattern: string; frequency: number }>
    plant_state?: 'sprout' | 'growing' | 'blooming' | 'fruiting'
  }
}

export interface HermesDiagnoseError {
  error: string
  message: string
}

// ── App 状态机（简化） ──
export type HermesPhase = 'idle' | 'analyzing' | 'results_shown'

// ── 会话历史 ──
export interface HermesHistoryEntry {
  id: string
  timestamp: number
  mode: ViewMode
  textSnippet: string       // 输入前 50 字
  text: string               // 完整输入文本
  sentences: SentenceAnalysis[]
  diagnosis: {
    analysis: string
    push: string
  }
  fingerprint_id?: string
}

// ── 写作指纹（localStorage） ──
export interface FingerprintData {
  fingerprint_id: string
  created: string
  updated: string
  texts_analyzed: number
  patterns: FingerprintPattern[]
  dimension_profile: Record<string, unknown>
}

export interface FingerprintPattern {
  id: string
  type: string              // 模式类型：节奏/句法/意象/逻辑/情感/语用
  trigger: string           // 触发条件描述
  frequency: number         // 出现次数
  first_seen: string        // ISO 日期
  last_seen: string         // ISO 日期
  across_texts: string[]   // 出现在哪些文本 ID 中
  pine_green: boolean       // 是否点亮松绿
}

// ── 植物状态机（Phase 2 定义数据模型，Phase 3 可视化） ──
export type PlantState = 'sprout' | 'growing' | 'blooming' | 'fruiting'

export const PLANT_STATE_LABELS: Record<PlantState, string> = {
  sprout: '🌱 萌芽',
  growing: '🌿 生长',
  blooming: '🌸 开花',
  fruiting: '🍊 结果',
}
