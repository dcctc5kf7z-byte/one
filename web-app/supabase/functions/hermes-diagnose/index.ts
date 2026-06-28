/**
 * Hermes 文本透视诊断 — Supabase Edge Function
 *
 * Phase 2 Web 编辑器 MVP 后端
 * 接受文本 + 模式(perspective/my_text) → 返回结构化逐句分析 + 六色信号
 *
 * API 降级链：Claude Opus 4.8 (灵眸) → GPT-4o (API2D) → GPT-4o-mini → DeepSeek-V3
 * Secrets: LINGMOU_API_KEY, API2D_API_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ═══════════════════════════════════════════════════════════════
// CORS
// ═══════════════════════════════════════════════════════════════
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ═══════════════════════════════════════════════════════════════
// HERMES SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════
function buildHermesPrompt(mode: string, pineGreenActive: boolean): string {
  const pineGreenNote = mode === 'my_text'
    ? `\n- **松绿 (pine_green)**：跨文本惯性。对比此文本与用户的写作指纹（如提供），标记与已有模式匹配的句子。`
    : `\n- 松绿 (pine_green)：当前为透视模式，不启用松绿。`;

  return `你是 Hermes——一面文本透视镜。你的工作是反射文本中已经存在但作者可能尚未意识到的结构和信号。

## 身份
你不是写作老师。你不是编辑。你是镜子。你反射文本，让作者看见自己写出的东西。

## 铁律
1. 推进是第一目的——诊断的最后一句必须是可行动的方向，不是问题
2. 不评价好坏
3. 不替作者写——笔在他手里
4. 不给台阶——不替他找理由
5. 判断确定——不说"或许""可能""也许"
6. 不用术语——用日常语言
7. 只诊断当前文字
8. 镜子也可推——看见本身就是推动

## 你的任务
分析用户提交的文字，对每个句子执行六维分析并分配颜色信号，返回结构化 JSON。

## 六色信号
| 颜色 | 信号 | 触发条件 |
|------|------|---------|
| crimson (胭脂红) | 卡点 | 句子存在因果断裂、逻辑跳跃、或明显阻滞——读到这里会停住 |
| amber (琥珀黄) | 模式 | 句法结构重复 ≥ 2 次、同一意象反复出现、或节奏陷入惯性 |
| steel_blue (钢蓝) | 推进 | 句子包含未展开的方向——有种子但没发芽，有门但没打开 |
| violet (堇紫) | 暗层 | 文字暗示了但没直接说出——情绪/动机/关系在字面之下 |
| slate_gray (鼠灰) | 数据 | 可量化的文本特征：句长异常、可读性分、词频突出 |

## 六维分析
对每句从以下维度观察（不需要每句都覆盖所有维度，只看有信号的）：
- **linguistic** (语言层)：句法结构、选词倾向、节奏、修辞手法
- **semantic** (语义层)：主题连贯性、意象链、语义场
- **sentiment** (情感层)：情感调性、转向、密度变化
- **structural** (结构层)：在全文中的结构功能、段落逻辑
- **pragmatic** (语用层)：对读者的效果、修辞目的
- **critical** (批判层)：隐含假设、未说出的前提
- **digital** (数字层)：句长字数、复杂度量化

## 输出格式
你必须返回有效的 JSON，格式如下：
\`\`\`json
{
  "sentences": [
    {
      "index": 0,
      "text": "原句文本",
      "colors": ["crimson"],
      "analysis": {
        "linguistic": "短句断裂：前句和后句之间缺少因果连接词",
        "structural": "这句在段落中孤立——前后句都是描写，它是唯一一句评价"
      }
    }
  ],
  "gutter_blocks": [
    [{"color": "crimson", "signal": "卡点", "detail": "因果断裂"}]
  ],
  "diagnosis": {
    "analysis": "## 表面与结构\\n\\n... (X→Y 层分析，Markdown)",
    "push": "## 推进方向\\n\\n... (Z 层方向，Markdown)"
  }
}
\`\`\`

### 重要规则
1. \`gutter_blocks\` 是二维数组——外层按行索引，内层是该行触发的所有色块
2. 色块按紧迫度排序：crimson → amber → steel_blue → violet → slate_gray → pine_green
3. \`diagnosis.analysis\` 覆盖 X（表面效果）→ Y（结构动力学），用中文写作
4. \`diagnosis.push\` 指向已写出但未展开的方向——不替作者决定，只指出"这里可以走"
5. 所有内容用中文写（除非输入是英文，则用英文写）
6. 诊断总长度：中文 ≤500 字，英文 ≤250 词
7. JSON 必须合法——不要输出额外文本或 markdown 包裹
8. 不要用 X/Y/Z 标签——用自然的段落过渡

${pineGreenNote}

当前模式：${mode === 'my_text' ? '我的文字模式（启用全部六色 + 指纹追踪）' : '透视模式（启用五色，不记录指纹）'}
${pineGreenActive ? '松绿已激活——请对比用户指纹中的模式标记匹配的句子。' : ''}`;
}

// ═══════════════════════════════════════════════════════════════
// JSON 提取器 — 处理 LLM 可能包裹 markdown 代码块的输出
// ═══════════════════════════════════════════════════════════════
function extractJSON(text: string): string {
  // 尝试提取 ```json ... ``` 包裹的内容
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();

  // 尝试提取 { ... } 边界
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return text.slice(jsonStart, jsonEnd + 1);
  }

  return text.trim();
}

// ═══════════════════════════════════════════════════════════════
// 响应验证
// ═══════════════════════════════════════════════════════════════
function validateResponse(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: '响应不是有效的 JSON 对象' };
  }
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.sentences)) {
    return { valid: false, error: '缺少 sentences 数组' };
  }
  if (!Array.isArray(d.gutter_blocks)) {
    return { valid: false, error: '缺少 gutter_blocks 数组' };
  }
  if (!d.diagnosis || typeof d.diagnosis !== 'object') {
    return { valid: false, error: '缺少 diagnosis 对象' };
  }
  const diag = d.diagnosis as Record<string, unknown>;
  if (typeof diag.analysis !== 'string' || typeof diag.push !== 'string') {
    return { valid: false, error: 'diagnosis.analysis 或 diagnosis.push 缺失' };
  }
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// 主 Handler
// ═══════════════════════════════════════════════════════════════
serve(async (req: Request) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 解析请求 ──
    const { text, mode = 'perspective', fingerprint } = await req.json() as {
      text: string;
      mode?: 'perspective' | 'my_text';
      fingerprint?: Record<string, unknown>;
    };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'empty_text', message: '请提供要分析的文字。' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'text_too_long', message: '文字长度不能超过 5000 字。' }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 判断松绿是否激活 ──
    const pineGreenActive = mode === 'my_text'
      && fingerprint != null
      && typeof fingerprint === 'object'
      && 'texts_analyzed' in fingerprint
      && (fingerprint as Record<string, unknown>).texts_analyzed as number >= 3;

    // ── 组装 System Prompt ──
    const systemPrompt = buildHermesPrompt(mode, pineGreenActive);

    // ── 构造用户消息 ──
    let userMessage = `<text_to_analyze>\n${trimmedText}\n</text_to_analyze>`;

    // 我的文字模式 + 有指纹时附加指纹数据
    if (mode === 'my_text' && fingerprint) {
      const patterns = (fingerprint as Record<string, unknown>).patterns;
      if (Array.isArray(patterns) && patterns.length > 0) {
        const patternSummary = patterns
          .filter((p: Record<string, unknown>) => p.pine_green)
          .map((p: Record<string, unknown>) => `- ${p.type}: ${p.trigger} (出现 ${p.frequency} 次)`)
          .join('\n');
        if (patternSummary) {
          userMessage += `\n\n<writing_fingerprint>\n用户的已知惯性模式：\n${patternSummary}\n</writing_fingerprint>`;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // API 降级链
    // ═══════════════════════════════════════════════════════════
    const lingmouKey = Deno.env.get("LINGMOU_API_KEY");
    const api2dKey = Deno.env.get("API2D_API_KEY");

    if (!lingmouKey && !api2dKey) {
      throw new Error("No API key configured. Add LINGMOU_API_KEY or API2D_API_KEY to Supabase Secrets.");
    }

    const API_CONFIGS = [
      // Tier 1: Claude Opus 4.8 via 灵眸AI (Anthropic Messages API)
      ...(lingmouKey ? [{
        name: "claude-opus-4-8 (灵眸)",
        url: "https://api.lmuai.com/v1/messages",
        headers: {
          "x-api-key": lingmouKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        buildBody: (sys: string, msg: string) => ({
          model: "claude-opus-4-8",
          max_tokens: 4096,
          system: sys,
          messages: [{ role: "user", content: msg }],
          temperature: 0.7,
        }),
        extractText: (data: Record<string, unknown>) =>
          (data as { content?: Array<{ text?: string }> }).content?.[0]?.text || "",
      }] : []),
      // Tier 2: GPT-4o via API2D
      ...(api2dKey ? [{
        name: "gpt-4o",
        url: "https://oa.api2d.net/v1/chat/completions",
        headers: {
          "Authorization": `Bearer ${api2dKey}`,
          "Content-Type": "application/json",
        },
        buildBody: (sys: string, msg: string) => ({
          model: "gpt-4o",
          max_tokens: 4096,
          temperature: 0.7,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: msg },
          ],
        }),
        extractText: (data: Record<string, unknown>) =>
          (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content || "",
      }] : []),
      // Tier 3: GPT-4o-mini
      ...(api2dKey ? [{
        name: "gpt-4o-mini",
        url: "https://oa.api2d.net/v1/chat/completions",
        headers: {
          "Authorization": `Bearer ${api2dKey}`,
          "Content-Type": "application/json",
        },
        buildBody: (sys: string, msg: string) => ({
          model: "gpt-4o-mini",
          max_tokens: 4096,
          temperature: 0.7,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: msg },
          ],
        }),
        extractText: (data: Record<string, unknown>) =>
          (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content || "",
      }] : []),
      // Tier 4: DeepSeek-V3
      ...(api2dKey ? [{
        name: "deepseek-v3",
        url: "https://oa.api2d.net/v1/chat/completions",
        headers: {
          "Authorization": `Bearer ${api2dKey}`,
          "Content-Type": "application/json",
        },
        buildBody: (sys: string, msg: string) => ({
          model: "deepseek-chat",
          max_tokens: 4096,
          temperature: 0.7,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: msg },
          ],
        }),
        extractText: (data: Record<string, unknown>) =>
          (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content || "",
      }] : []),
    ];

    let rawOutput = "";
    let usedEndpoint = "";

    // 依次尝试 API 调用
    for (const config of API_CONFIGS) {
      try {
        console.error(`[Hermes] Trying: ${config.name}`);
        const body = config.buildBody(systemPrompt, userMessage);
        const resp = await fetch(config.url, {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          console.error(`[Hermes] ${config.name} failed (${resp.status}): ${errText.slice(0, 200)}`);
          continue;
        }

        const data = await resp.json();
        rawOutput = config.extractText(data as Record<string, unknown>);
        if (rawOutput) {
          usedEndpoint = config.name;
          console.error(`[Hermes] ${config.name} OK (${rawOutput.length} chars)`);
          break;
        }
      } catch (err) {
        console.error(`[Hermes] ${config.name} error: ${err}`);
      }
    }

    if (!rawOutput) {
      return new Response(
        JSON.stringify({ error: 'all_api_failed', message: '所有 API 通道均失败，请稍后重试。' }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 解析 JSON 响应 ──
    const jsonStr = extractJSON(rawOutput);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      console.error(`[Hermes] JSON parse failed. Raw (first 500): ${rawOutput.slice(0, 500)}`);
      return new Response(
        JSON.stringify({
          error: 'parse_failed',
          message: '无法解析 AI 响应。请重试。',
          raw: rawOutput.slice(0, 1000),
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 验证响应结构 ──
    const validation = validateResponse(parsed);
    if (!validation.valid) {
      console.error(`[Hermes] Validation failed: ${validation.error}. Raw: ${rawOutput.slice(0, 500)}`);
      return new Response(
        JSON.stringify({
          error: 'invalid_response',
          message: `AI 响应结构不完整：${validation.error}`,
          raw: rawOutput.slice(0, 1000),
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 构造最终响应 ──
    const response = {
      sentences: parsed.sentences,
      gutter_blocks: parsed.gutter_blocks,
      diagnosis: parsed.diagnosis,
      meta: {
        mode,
        text_length: trimmedText.length,
        fingerprint_id: mode === 'my_text' && fingerprint
          ? (fingerprint as Record<string, unknown>).fingerprint_id as string
          : undefined,
        pine_green_active: pineGreenActive,
        endpoint: usedEndpoint,
        layers: ['L1', 'L2', 'L3', 'L4'],
      },
      fingerprint: parsed.fingerprint ?? undefined,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(`[Hermes] Unexpected error: ${err}`);
    return new Response(
      JSON.stringify({
        error: 'internal_error',
        message: err instanceof Error ? err.message : '未知内部错误',
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
