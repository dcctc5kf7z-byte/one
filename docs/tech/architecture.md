# 技术架构 · 写作诊断工具

> 最后更新：2026-06-24
> 关联文件：[product-spec.md](../requirements/product-spec.md)

---

## 1. 架构概述

MVP 阶段采用**纯前端架构**——诊断逻辑由 LLM（Claude API）在服务端执行，前端仅负责输入/输出和 UI 渲染。

```
用户浏览器
    ↓
前端页面（输入框 + 诊断报告渲染）
    ↓
Claude API（携带 System Prompt + 用户文字）
    ↓
返回诊断报告（Markdown）
    ↓
前端渲染为格式化输出
```

---

## 2. 技术选型

### 选项 A：lovable.dev（推荐用于快速 MVP）✅ 已选定
- **定位**：AI 驱动的全栈应用生成器
- **优势**：从描述直接生成页面，适合单人快速原型
- **劣势**：定制化受限，复杂交互需要手动调整
- **适合场景**：MVP 快速验证
- **初始 prompt**：[lovable-prompt-v1.md](../execution/lovable-prompt-v1.md)

### 选项 B：Cursor + 手动开发（精调阶段使用）
- **定位**：AI 辅助的 IDE
- **优势**：完全控制代码，可做任意定制
- **劣势**：需要更多时间和前端能力
- **适合场景**：需要精细交互控制的正式产品

### 选定方案：混合路径
1. Lovable 生成 MVP 骨架（React + Tailwind + Supabase Edge Function）
2. 导出到 GitHub
3. Cursor 中精调设计细节（镜子美学、排版、边界状态）

### 技术栈（无论选 A 还是 B）
| 层 | 技术 | 说明 |
|----|------|------|
| 前端框架 | React / Next.js | 或 lovable.dev 生成的等效方案 |
| UI 组件 | Tailwind CSS + shadcn/ui | 轻量、可定制 |
| LLM 调用 | Anthropic API (Claude) | 携带 System Prompt |
| 部署 | Vercel | 免费层足够 MVP |
| 域名 | 待定 | 国内访问需考虑备案 |
| 支付 | 爱发电 | 10 个付费用户后接入 |

---

## 3. 组件架构（前端）

```
App
├── Header（工具名称 + 一句话说明）
├── InputPanel
│   ├── TextArea（用户粘贴文字）
│   ├── CharCounter（字数统计）
│   └── DiagnoseButton（"开始诊断"）
├── OutputPanel
│   ├── InsightSection（"我注意到"——诊断依据）
│   ├── EffectSection（读者效果）
│   ├── GapSection（执行缺口）
│   ├── ActionSection（约束问题 + 动作指令）
│   └── DimensionsSection（三个维度观察）
└── ActionBar
    ├── RetryButton（"不对，换一个角度"）
    └── ResetButton（"重新开始"）
```

---

## 4. 数据流

```
1. 用户粘贴文字 → 前端 state.text
2. 用户点击"开始诊断" → 前端校验（≥20字，<500字截取提示）
3. 前端构建 API 请求：
   {
     system: "你是一个写作诊断工具...[完整 System Prompt]",
     messages: [{ role: "user", content: 用户文字 }]
   }
4. 调用 Anthropic Messages API
5. 接收 Markdown 格式诊断报告
6. 前端解析 Markdown → 渲染各 Section
7. 用户交互（"不对"/"重新开始"）→ 回到步骤 3
```

### 状态管理
```
{
  text: string,           // 用户输入的文字
  diagnosis: {            // 诊断结果
    insight: string,      // 我注意到
    xEffect: string,      // 读者效果
    yGap: string,         // 执行缺口
    question: string,     // 约束问题
    action: string,       // 动作指令
    dimensions: {         // 三个维度
      causality: string,
      drive: string,
      attention: string
    }
  },
  previousText: string,   // 上一轮的文字（用于进步指认）
  retryCount: number,     // 追问次数
  isLoading: boolean,     // 等待 API 返回
  error: string | null    // 错误信息
}
```

---

## 5. API 设计

### 诊断接口（后端 API，调用 Claude）
```
POST /api/diagnose
Content-Type: application/json

Request:
{
  "text": "用户粘贴的文字...",
  "previousText": "上一轮的文字（可选，用于进步指认）",
  "retryCount": 0  // 追问次数
}

Response:
{
  "diagnosis": {
    "insight": "我注意到...",
    "xEffect": "...",
    "yGap": "...",
    "question": "...",
    "action": "...",
    "dimensions": {
      "causality": "...",
      "drive": "...",
      "attention": "..."
    },
    "allTight": false  // 三角全紧标志
  }
}

Error:
{
  "error": "TEXT_TOO_SHORT",  // ≤20字
  "message": "需要至少一个完整的场景（20字以上）来做诊断。"
}
```

### 应对国内访问的考虑
- 如果使用 Anthropic API，国内用户可能需要代理
- 备选方案：服务端中转 API，或使用国内可访问的 LLM 作为后备
- 参见 [国内环境适配方案](../../.claude/skills/writer/国内环境适配方案.md)

---

## 6. 安全考虑

| 风险 | 缓解措施 |
|------|---------|
| API Key 暴露 | Key 仅存服务端，前端不直接调用 Anthropic |
| 滥用（大量请求） | Vercel 自带速率限制；可按需加 reCAPTCHA |
| 用户文字隐私 | 不做持久化存储（v1），每轮诊断后丢弃 |
| Prompt 注入 | 用户文字作为 data 而非 instruction 处理 |

---

## 7. 性能指标（MVP 目标）

| 指标 | 目标 |
|------|------|
| 首次诊断延迟 | < 5 秒（含 Claude API 响应时间） |
| 页面加载 | < 2 秒 |
| 追问（换 Y）延迟 | < 5 秒 |
