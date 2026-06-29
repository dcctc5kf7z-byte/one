# 技术架构 · 通用文本透视镜

> 最后更新：2026-06-29（架构审视后重写，反映实际技术栈）
> 关联文件：[architecture-review-2026-06-29.md](architecture-review-2026-06-29.md)

---

## 1. 架构概述

项目由两个独立演进的产品组成，共享 X→Y→Z 方法论但实现路径不同：

```
                    ┌──────────────────────────────────┐
                    │   通用文本透视镜 (text-lens)       │
                    │   X→Y→Z 镜像式文本分析            │
                    └──────────┬───────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐    ┌───────▼────────┐
   │  Skill 入口  │    │  Web App 入口   │
   │  v5.0.2     │    │  Hermes Phase 2 │
   │  Claude Code│    │  浏览器单次分析  │
   │  多轮对话   │    │  Netlify 部署   │
   └──────┬──────┘    └───────┬────────┘
          │                    │
   ┌──────▼──────┐    ┌───────▼────────┐
   │ 7 体裁透镜   │    │ Supabase EF    │
   │ X→Y→Z 路由  │    │ hermes-diagnose│
   │ 11 条铁律   │    │ v6 结构化 JSON │
   └─────────────┘    └───────┬────────┘
                              │
                      ┌───────▼────────┐
                      │ 4 级 API 降级链 │
                      │ 灵眸→GPT-4o→   │
                      │ 4o-mini→DeepSeek│
                      └────────────────┘
```

---

## 2. 技术选型（实际）

| 层 | 技术 | 说明 |
|----|------|------|
| 前端框架 | React 19 + TypeScript | 手动编码，非代码生成 |
| 构建工具 | Vite 8 | 开发服务器 + 生产构建 |
| UI 样式 | Tailwind CSS 4 | 纯 utility class，无组件库 |
| 设计系统 | 「温墨·纸本」 | 暖纸底 `#F5F0E1` + 墨色 `#2C2416` + 六色信号 |
| 字体 | Source Serif 4 / Inter | 衬线标题 + 无衬线正文 |
| LLM 调用 | Supabase Edge Function 代理 | 不直连 Anthropic API |
| 部署 | Netlify | `eloquent-swan-c78519.netlify.app` |
| 后端运行时 | Deno (Supabase Edge Functions) | TypeScript，单文件部署 |
| API 供应商 | 灵眸AI (Anthropic 原生) + API2D | 4 级降级：Claude Opus 4.8 → GPT-4o → GPT-4o-mini → DeepSeek-V3 |
| 发布 | GitHub + npm (Skill 独立仓库) | [text-lens](https://github.com/dcctc5kf7z-byte/text-lens) |

---

## 3. 组件架构（前端 — Hermes Phase 2）

```
App (3-phase state machine: idle → analyzing → results_shown)
├── Header
│   ├── 标题 "通用文本透视镜" (衬线字体)
│   ├── 笔图标 (SVG)
│   └── ColorBar (常驻六色圆点条，hover 展开详情)
├── EditorWithGutter
│   ├── textarea (用户输入区，笔记本横线背景)
│   ├── 左侧 48px gutter (装订线 + 主导色渐变边)
│   └── GutterBlock[] (书签条，4×28px 圆角矩形 + 同色微发光，紧迫度排序)
├── ModeSlider
│   └── 两态滑动切换 (透视模式 ↔ 我的文字，steel_blue ↔ pine_green)
├── AnalyzeButton
│   └── "透视这段文字" (墨水印章风格，暖深棕底 + 笔图标 + 加载 spinner)
├── DiagnosisPanel
│   ├── 顶部 3px 主导色条 (computed from sentences)
│   ├── SignalBar (信号频率分布横向色条，紧迫度排序)
│   ├── 诊断正文 (Markdown 渲染，颜色染边)
│   └── 推进方向 (crimson 卡点 / amber 模式 / steel_blue 惯性)
├── HistoryPanel
│   ├── 可折叠诊断记录 (左侧颜色光谱条)
│   └── 指纹导入/导出 (JSON 文件)
├── PrivacyNotice (脚注风格隐私声明)
└── Footer (暖色分隔线 + italic 文字 + 松绿指纹计数)
```

---

## 4. 数据流（Hermes）

```
1. 用户输入文字 → React state (App.tsx)
2. 可选：切换模式 (perspective ↔ my_text)，持久化到 localStorage
3. 可选：附加写作指纹 (FingerprintManager, localStorage CRUD)
4. 用户点击「透视这段文字」→ phase = 'analyzing'
5. 前端构建 API 请求：
   POST supabase/functions/hermes-diagnose
   {
     text: string,
     mode: 'perspective' | 'my_text',
     fingerprint?: FingerprintData (可选，松绿激活条件)
   }
6. Edge Function 构建 Hermes System Prompt
   → 注入 6 色信号 + 7 维焦距 + 铁律 + 输出格式
7. 4 级 API 降级链尝试：
   Tier 1: 灵眸AI (api.lmuai.com) — Anthropic Messages API, Claude Opus 4.8
   Tier 2: API2D (oa.api2d.net) — Chat Completions, GPT-4o
   Tier 3: API2D (oa.api2d.net) — Chat Completions, GPT-4o-mini
   Tier 4: API2D (oa.api2d.net) — Chat Completions, DeepSeek-V3
8. 接收结构化 JSON (sentences[] + gutter_blocks[][] + diagnosis + meta)
9. safeJSONParse 4 层回退：直接解析 → 修复 JSON → 清理控制字符 → 补全截断括号
10. normalizeResponse(): 颜色别名修正 + 紧迫度重排
11. validateResponse(): 结构校验
12. 前端渲染 DiagnosisPanel (信号条 + 诊断正文 + 颜色染边)
13. 用户交互：切换模式 → 重新分析 / 重置 → idle / 查看历史
```

### 状态管理（Hermes 3-phase）

```typescript
{
  phase: 'idle' | 'analyzing' | 'results_shown',
  mode: 'perspective' | 'my_text',  // orthogonal, persisted to localStorage
  text: string,
  diagnosis: HermesDiagnoseResponse | null,  // 完整结构化结果
  history: HermesHistoryEntry[],             // 本轮会话诊断记录
  error: string | null,
}
```

---

## 5. API 设计（Hermes）

### 诊断接口
```
POST /functions/v1/hermes-diagnose
Content-Type: application/json

Request:
{
  "text": "用户输入的文字...",
  "mode": "perspective" | "my_text",
  "fingerprint": {            // 可选
    "texts_analyzed": 5,
    "patterns": [...],
    "activated_at": "2026-06-28T10:00:00Z",
    "across_texts": [...]
  }
}

Response (200):
{
  "sentences": [
    {
      "index": 0,
      "text": "原句...",
      "signals": ["crimson", "steel_blue"],
      "color": "crimson",               // dominant signal → color
      "linguistic": "...",
      "semantic": "...",
      "sentiment": "...",
      "structural": "...",
      "pragmatic": "...",
      "critical": "...",
      "digital": "..."
    }
  ],
  "gutter_blocks": [
    [
      { "color": "crimson", "signal": "卡点", "detail": "..." },
      { "color": "steel_blue", "signal": "推进", "detail": "..." }
    ]
  ],
  "diagnosis": {
    "analysis": "X→Y 诊断分析 (Markdown)...",
    "push": "Z 推进方向 (Markdown)..."
  },
  "meta": {
    "api_tier": 1,
    "api_provider": "lingmou",
    "model": "claude-opus-4-8-20250805",
    "processing_time_ms": 3200,
    "max_tokens": 4096
  },
  "fingerprint": { ... }   // 可选，my_text 模式下更新
}

Error (422):
{
  "error": "all_api_failed" | "no_valid_json" | "validation_failed",
  "message": "...",
  "api_errors": ["..."],
  "raw_output": "..."      // ⚠️ 可能包含原文片段（隐私风险）
}
```

### 6 色信号系统

| 颜色 | 信号 | 中文含义 | 紧迫度 |
|------|------|---------|--------|
| `crimson` | stuck_point | 卡点 | 1 (最高) |
| `amber` | pattern | 模式 | 2 |
| `steel_blue` | push | 推进 | 3 |
| `violet` | subtext | 暗层 | 4 |
| `slate_gray` | data | 数据 | 5 |
| `pine_green` | across_texts | 跨文本惯性 | 6 (最低, my_text ≥3 次后激活) |

### 7 维焦距分析

| 维度 | 字段 | 分析内容 |
|------|------|---------|
| 语言学 | `linguistic` | 词汇选择、句式结构、语体特征 |
| 语义学 | `semantic` | 意义层级、隐喻、主题线索 |
| 情感分析 | `sentiment` | 情感基调、情感转折 |
| 结构分析 | `structural` | 段落组织、逻辑衔接 |
| 语用学 | `pragmatic` | 意图与效果差距、读者感受 |
| 批判性 | `critical` | 内部矛盾、缺失元素、隐含假定 |
| 数字辅助 | `digital` | 字数/句长/重复率等量化指标 |

---

## 6. 安全考虑

| 风险 | 现状 | 缓解措施 |
|------|------|---------|
| API Key 暴露 | ✅ Key 仅存 EF 环境变量，前端不接触 | — |
| CORS | ⚠️ Supabase EF 默认 `*` | 后续收紧为 Netlify 域名白名单 |
| 用户文字隐私 | ⚠️ `console.error` 在截断场景打印 raw output | 从日志中移除原文打印 |
| 速率限制 | ⚠️ 无用户级 rate limit | Supabase 免费层有平台级限制，但非业务级 |
| Prompt 注入 | ⚠️ 用户文字直接嵌入 System Prompt | 未做输入清洗 |
| 成本攻击 | ⚠️ 无单用户用量限制 | 可无限次调用，烧配额 |
| Deno 远程依赖 | ⚠️ `import` 依赖外部 URL | 后续应考虑锁定版本 hash |

---

## 7. 实际性能

| 指标 | 现状 |
|------|------|
| 首次诊断延迟 | ~3–8 秒（取决于 API tier，Tier 1 最快，Tier 4 最慢） |
| 页面加载 | < 1 秒（Netlify CDN + 静态构建） |
| JSON 截断概率 | ~14%（2/14，仅 personal 体裁长文本，max_tokens=4096 限制） |
| 部署构建 | ~30 秒 (Vite + Netlify auto-deploy) |

---

## 8. 与 Skill 的关系

| 维度 | Skill (/text-lens) | Web App (Hermes) |
|------|-------------------|-----------------|
| 入口 | Claude Code 内 `/text-lens` | 浏览器 `eloquent-swan-c78519.netlify.app` |
| 运行环境 | Claude Code → Claude API | 浏览器 → Netlify → Supabase EF → LLM |
| 交互模式 | 多轮对话，状态流转 | 单次分析，模式切换 |
| 体裁路由 | 7 种透镜按需加载 | 通用（不做体裁预判） |
| X→Y→Z | 核心路由逻辑，逐轮推进 | 压缩为 `diagnosis.analysis` + `diagnosis.push` |
| 结构化输出 | Markdown 文本 | 6 色信号 JSON |
| System Prompt | 分散在 SKILL.md + 7 透镜 | 集中在 hermes-diagnose/index.ts |
| 状态管理 | Claude Code 会话上下文 | React useState (3-phase) |
| 写作指纹 | 无持久化 | localStorage (FingerprintManager) |
| G-1 焦距引擎 | 规格已写 (958行)，**未集成至透镜** | 简化版手写在 EF System Prompt |

---

## 9. 已知技术债务

| 编号 | 问题 | 严重度 | 位置 |
|------|------|--------|------|
| TD-01 | architecture.md 文档腐烂（已于 2026-06-29 修复） | — | 本文档 |
| TD-02 | implementation-plan.md 被 Hermes 架空（已废弃） | — | docs/execution/ |
| TD-03 | ui-design.md 描述 v3.1 黑白灰，与温墨·纸本不符 | P1 | docs/design/ |
| TD-04 | G-1 焦距引擎 958 行规格未集成至任何透镜 | P2 | docs/tech/focal-engine-spec.md |
| TD-05 | JSON 截断时无 best-effort 部分返回 | P1 | hermes-diagnose/index.ts |
| TD-06 | 前端无 AbortController (用户关闭页面，API 继续跑) | P1 | web-app/src/App.tsx |
| TD-07 | 无 cost observability (不追踪 API 费用) | P2 | hermes-diagnose/index.ts |
| TD-08 | personal 体裁 2/2 JSON 截断 (max_tokens=4096) | P1 | hermes-diagnose/index.ts |

---

## 10. 部署拓扑

```
用户浏览器
    │
    ▼
Netlify CDN (eloquent-swan-c78519.netlify.app)
    │  静态文件: React SPA (Vite build)
    │
    │  POST /functions/v1/hermes-diagnose
    ▼
Supabase Edge Function (Deno)
    │  hermes-diagnose/index.ts (578 行)
    │  - buildHermesPrompt()
    │  - safeJSONParse (4 层回退)
    │  - normalizeResponse()
    │  - validateResponse()
    │
    ├── Tier 1 ──► api.lmuai.com (灵眸AI)
    │               Anthropic Messages API
    │               claude-opus-4-8-20250805
    │
    ├── Tier 2 ──► oa.api2d.net (API2D)
    │               Chat Completions API
    │               gpt-4o
    │
    ├── Tier 3 ──► oa.api2d.net (API2D)
    │               gpt-4o-mini
    │
    └── Tier 4 ──► oa.api2d.net (API2D)
                    deepseek-chat (DeepSeek-V3)
```

---

## 版本记录

| 日期 | 变更 |
|------|------|
| 2026-06-24 | 初版：基于 v3.1 Lovable+Vercel+直连API 方案 |
| 2026-06-29 | **重写**：反映实际技术栈（React+Netlify+Supabase EF+4级降级），补充 Skill vs Web App 关系、6色信号系统、已知技术债务 |
