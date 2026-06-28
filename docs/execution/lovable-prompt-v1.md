# Lovable 初始 Prompt · 写作诊断工具 MVP

> 版本：v1 · 2026-06-25
> 用途：粘贴到 Lovable.dev 聊天框，生成 MVP 骨架

---

## 使用前确认

在开始之前，确保你有：
- [ ] Lovable.dev 账号（免费层即可，5 credits/天）
- [ ] Anthropic API Key（https://console.anthropic.com/）
- [ ] 准备好本项目的 System Prompt 文件：`.claude/skills/writer/产品MVP方案-v3.md`

---

## Lovable Prompt（直接粘贴）

```
Build a single-page web app for writers called "写作诊断工具" (Writing Diagnostic Tool). 

=== WHAT IT DOES ===
A user pastes their writing (a scene, a passage) into a textarea. They click a button. The app sends the text to Claude API with a specialized system prompt (a "mirror" diagnostic system), receives a markdown-formatted diagnostic report, and renders it beautifully. The user can ask for a second opinion ("换一个角度").

=== TECH STACK ===
- React + TypeScript + Vite
- Tailwind CSS for styling
- Supabase for backend (Edge Functions as API proxy + hosting)
- Deploy to lovable.app domain initially

=== UI LAYOUT ===

Desktop (≥1024px): Two-column layout
- Left column (40% width): Input area
- Right column (60% width): Diagnostic report

Mobile (<1024px): Single column, stacked
- Input area on top
- Diagnostic report below

=== COMPONENTS ===

**1. Header**
- Title: "写作诊断工具" (18px, font-weight 600, system-ui sans-serif)
- Subtitle: "贴一段文字，看看它把你带去哪" (13px, secondary gray)
- Minimal, no logo, no navigation

**2. InputPanel (left column on desktop, top on mobile)**
- A textarea labeled "把你觉得不对劲的文字贴过来..." (with proper <label htmlFor>)
- Min height: 200px, resizable vertically
- Font: serif (Source Serif 4 or system serif), 15px, line-height 1.75
- Character counter at bottom-right: "{n} 字" (13px, secondary gray)
- When chars ≤ 20: counter text dims, diagnose button becomes disabled (opacity-40, cursor-not-allowed)
- When chars > 500: show hint "文字较长，系统会挑出最需要诊断的段落"
- Focus ring: outline-2 outline-offset-2 outline-neutral-900

**3. DiagnoseButton**
- Text: "开始诊断"
- Black background (#1A1A1A), white text, 48px height, min 140px width
- States:
  - Normal: bg-[#1A1A1A] text-white, cursor-pointer
  - Hover: bg-[#0D0D0D]
  - Loading: disabled + three-dot pulse animation + cursor-not-allowed
  - Disabled (too few chars): opacity-40, cursor-not-allowed
- On click: immediately disable (prevent double submit), show loading state

**4. DiagnosticReport (right column on desktop, below input on mobile)**
- Min height: 300px (prevents layout jump during loading)
- Content max-width: 65ch (max-w-prose)
- Report is rendered from markdown returned by Claude API
- Three possible report formats (all start with "📋 写作诊断报告"):

  Format A - Full diagnosis (出口一):
  Sections: "我注意到" → "这让读者感受到" → "我的推理是" → "问题出在" → "下一步" + "→ 动作指令" → "三个维度" (3 bullet items) → closing poetic line

  Format B - Abbreviated diagnosis (出口二):
  Sections: "我注意到" → "这让读者感受到" → "下一步" + "→ 动作指令" → closing poetic line

  Format C - Clean diagnosis (出口三):
  Sections: "我注意到" → "这让读者感受到" → "你现在站的位置" → "下一步" + "→ 动作指令" → closing poetic line

- Styling for report sections:
  - "我注意到" section: left border (border-l-2 border-neutral-900, pl-4) to distinguish it
  - "→ 动作指令": font-medium, bold styling (this is the most actionable part)
  - "三个维度": smaller text (13px), secondary color (#525252)
  - Section spacing: mb-6 between sections
  - Overall: line-height 1.6 for readability

**5. RetryButton ("换一个角度")**
- Only visible after a diagnosis is displayed
- Text: "不对，换一个角度"
- Style: outline button (transparent bg + #1A1A1A border), 44px height
- Shows retry count: "角度 1/2" next to button
- After 3rd retry: button text changes to "换一段文字试试"
- Loading state same as DiagnoseButton

**6. Footer**
- Fixed text: "这是镜子，不是答案。笔在你手里。" (13px, secondary gray)
- Subtle, not a footer bar — just text below the report

=== DATA FLOW ===

1. User pastes text → stored in React state
2. User clicks "开始诊断" → validate (≥20 chars) → button instantly disabled
3. Show loading skeleton in report area (3 gray pulse bars, 300px min height)
4. Call Supabase Edge Function `anthropic-diagnose` with { userText: string }
5. Edge Function combines userText with the SYSTEM PROMPT (see below), calls Anthropic API
6. Edge Function returns the Claude response (markdown text)
7. Frontend renders the markdown as HTML with custom section styling
8. If user clicks "换一个角度": calls Edge Function again with { userText, retryCount: n+1 }
9. If API fails: show error message with role="alert", re-enable button

=== SUPABASE EDGE FUNCTION ===

Create a Supabase Edge Function at `supabase/functions/anthropic-diagnose/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// SYSTEM PROMPT — COPY FROM .claude/skills/writer/产品MVP方案-v3.md
// Replace the placeholder below with the FULL v3.1 System Prompt
// ============================================================
const SYSTEM_PROMPT = `PLACEHOLDER — REPLACE WITH FULL v3.1 SYSTEM PROMPT FROM 产品MVP方案-v3.md`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userText, retryCount } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      throw new Error("Anthropic API key not configured. Add ANTHROPIC_API_KEY to Supabase Secrets.");
    }

    if (!userText || userText.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "TEXT_TOO_SHORT", message: "需要至少一个完整的场景（20字以上）来做诊断。" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user message — include retry context if applicable
    let userMessage = userText;
    if (retryCount && retryCount > 0) {
      userMessage = `[用户说上一次诊断不准——这是第${retryCount}次尝试。从不同角度重新诊断。]\n\n${userText}`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `Anthropic API error: ${response.status}`);
    }

    // Extract the text content from Claude's response
    const diagnosisText = data.content?.[0]?.text || JSON.stringify(data);

    return new Response(
      JSON.stringify({ diagnosis: diagnosisText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "API_ERROR", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

IMPORTANT: After Lovable generates the app, the user MUST:
1. Choose their API path (see below) and set up the Supabase Secret
2. Open the Edge Function file and replace the `PLACEHOLDER` SYSTEM_PROMPT with the full content from `.claude/skills/writer/产品MVP方案-v3.md` (the markdown inside the code block starting with "你是一个写作诊断工具...")
3. Deploy the Edge Function: `supabase functions deploy anthropic-diagnose`

---

## ⚠️ 国内用户必读：API2D 版 Edge Function

以上 Lovable prompt 中的 Edge Function 模板是**直连 Anthropic 官方 API** 的版本——仅适合海外用户。

如果你使用的是 **API2D**（或任何 OpenAI 兼容格式的国内中转 API），生成应用后，**把 Edge Function 文件替换为以下版本**：

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// SYSTEM PROMPT — 复制 .claude/skills/writer/产品MVP方案-v3.md
// 中代码块内的完整 System Prompt 替换下面的 PLACEHOLDER
// ============================================================
const SYSTEM_PROMPT = `PLACEHOLDER — 用完整 v3.1 System Prompt 替换`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userText, retryCount } = await req.json();

    // API2D 的 Key 存在 Supabase Secrets 中
    const apiKey = Deno.env.get("API2D_API_KEY");

    if (!apiKey) {
      throw new Error("API key not configured. Add API2D_API_KEY to Supabase Secrets.");
    }

    if (!userText || userText.trim().length < 20) {
      return new Response(
        JSON.stringify({
          error: "TEXT_TOO_SHORT",
          message: "需要至少一个完整的场景（20字以上）来做诊断。",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // retry 上下文
    let userMessage = userText;
    if (retryCount && retryCount > 0) {
      userMessage = `[用户说上一次诊断不准——这是第${retryCount}次尝试。从不同角度重新诊断。]\n\n${userText}`;
    }

    // ============================================================
    // API2D 使用 OpenAI 兼容格式（不是 Anthropic 原生格式）
    // 如果你用的是其他中转（AIHub / OpenRouter / 302.AI），
    // 把下面这行 URL 换成对应的地址即可，其余格式不变
    // ============================================================
    const API_URL = "https://api.api2d.com/v1/chat/completions";

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `API error: ${response.status}`);
    }

    // OpenAI 兼容格式的响应：choices[0].message.content
    const diagnosisText = data.choices?.[0]?.message?.content || "";

    if (!diagnosisText) {
      throw new Error("API 返回了空内容——可能是模型不支持或 Key 无效。");
    }

    return new Response(
      JSON.stringify({ diagnosis: diagnosisText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "API_ERROR", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### API2D 版的配置步骤

1. 在 Supabase → Settings → Secrets 中添加 **`API2D_API_KEY`** = 你的 API2D Key
2. 把 Edge Function 文件内容替换为上面这段代码
3. 把 `SYSTEM_PROMPT` 的 PLACEHOLDER 替换为完整 v3.1 System Prompt
4. 部署：`supabase functions deploy anthropic-diagnose`

### 如果你用的是其他中转平台

只改一行——把 `API_URL` 换成对应地址：

| 平台 | API_URL |
|------|---------|
| **API2D** | `https://api.api2d.com/v1/chat/completions` |
| **AIHub** | `https://ai-hub.chat/v1/chat/completions` |
| **OpenRouter** | `https://openrouter.ai/api/v1/chat/completions` |
| **302.AI** | `https://api.302.ai/v1/chat/completions` |

其余代码不变——这些平台都使用 OpenAI 兼容格式。

=== DESIGN SYSTEM ===

Colors (BLACK, WHITE, GRAY ONLY — no accent colors, no green, no red):
- Background: #FAFAF9 (warm stone — not pure white)
- Text: #1A1A1A (near-black)
- Secondary text: #525252 (dark gray)
- Placeholder/disabled: #8A8A8A
- Borders/dividers: #0D0D0D (pure black)
- Action button bg: #1A1A1A, text: #FFFFFF
- Outline button: transparent bg, #1A1A1A border

Typography:
- UI text: system-ui sans-serif
- User input text: serif (system serif or Source Serif 4)
- Title: 18px, weight 600
- Body: 15px (16px on mobile <768px)
- Secondary/small: 13px, weight 400
- Line-height: 1.6 (report), 1.75 (input)

Spacing:
- Section gap: mb-6 (24px)
- List item gap: space-y-2 (8px)
- Content max-width: max-w-prose (~65ch)

Icons:
- Use Lucide icons (SVG, 24x24, w-6 h-6)
- NEVER use emoji as functional icons
- Edit icon (edit-3) for input panel label
- Clipboard icon (clipboard-list) for report panel label

Accessibility:
- All interactive elements: min 44x44px touch target
- Focus ring on all interactive elements: outline-2 outline-offset-2 outline-neutral-900
- Loading state: aria-busy="true"
- Error messages: role="alert"
- All form inputs must have associated <label>
- Tab order = visual order (input → button → report → retry button)
- prefers-reduced-motion: disable animations, use static indicators

=== LOADING / ERROR / EDGE STATES ===

Loading skeleton (shown in report area while waiting for API):
- 3 gray pulse bars (animate-pulse, 2s cycle)
- Different widths to simulate text lines (80%, 60%, 70%)
- Min height: 300px
- On prefers-reduced-motion: static gray bars, no animation
- When API returns: skeleton fades out (opacity transition, 200ms), report fades in

Error states:
- API timeout (>30s): "等待超时——再试一次。"
- API error: show the error message from the Edge Function
- Text too short (≤20 chars): button disabled + inline hint below textarea (NO red color — use bold dark gray)
- Network error: "网络连接失败——检查你的网络后再试。"

Empty state (initial):
- Input area shows placeholder text
- Report area hidden or shows subtle placeholder: "诊断结果会显示在这里"

Retry flow:
- 1st retry: button shows "角度 1/2"
- 2nd retry: button shows "角度 2/2"
- 3rd retry: button text changes to "换一段文字试试", no more retries
- Counter resets when user changes the input text

=== WHAT NOT TO DO ===
- No green, red, gold, or any accent color — ONLY black/white/gray
- No emoji as icons — use Lucide SVG icons
- No "写得好", "很棒", "有潜力" anywhere in UI copy
- No cheerful/encouraging tone in UI copy
- No navigation bar, no multi-page routing
- No user authentication (v1 is anonymous)
- No database/persistence (v1 is stateless per session)
- No example sentences in UI copy (the tool doesn't demonstrate — it diagnoses)

=== RESPONSIVE BREAKPOINTS ===
- Mobile: 375px–767px → stacked layout, font-size ≥16px
- Tablet: 768px–1023px → stacked, content max-w-2xl centered
- Desktop: 1024px–1439px → two-column (40% input / 60% report)
- Wide: ≥1440px → two-column, max-w-7xl centered overall
- NO horizontal overflow at any breakpoint
```

---

## 生成后操作清单

Lovable 生成应用骨架后，按以下步骤完成配置：

### 1. 设置 API Key
- 进入 Supabase 项目 → Settings → Secrets
- 添加 `ANTHROPIC_API_KEY` = 你的 Anthropic API Key

### 2. 替换 System Prompt
- 打开 Supabase Edge Function 文件（`supabase/functions/anthropic-diagnose/index.ts`）
- 找到 `const SYSTEM_PROMPT = \`PLACEHOLDER ...\``
- 复制 `.claude/skills/writer/产品MVP方案-v3.md` 中代码块内的完整 System Prompt（从 `你是一个写作诊断工具。` 开始，到案例三结束）
- 粘贴替换 PLACEHOLDER 行

### 3. 部署 Edge Function
- 在 Lovable 中或 Supabase CLI 中运行 `supabase functions deploy anthropic-diagnose`

### 4. 测试
- 粘贴一段文字（≥20 字）
- 点击"开始诊断"
- 检查诊断报告格式是否正确渲染

### 5. 导出到 GitHub
- Lovable → Settings → GitHub sync
- 代码归你所有，后续可以在 Cursor 中精调

---

## 预计结果

Lovable 生成后你会有：
- 一个可访问的 URL（`xxx.lovable.app`）
- React + TypeScript + Tailwind 前端代码
- Supabase Edge Function 模板
- 可以粘贴文字并获得 AI 诊断的完整流程

需要手动完成的部分：
- System Prompt 替换（核心 IP，不适合放在 Lovable prompt 里）
- API Key 配置
- 设计细节微调（后续在 Cursor 中完成）
