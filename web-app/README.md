# 写作诊断工具 — Web App

> 基于 X→Y→Z 诊断模型的镜像式写作诊断工具

## 快速开始

```bash
npm install
npm run dev
```

## 项目结构

```
web-app/
├── src/
│   ├── App.tsx                          # 主组件 + 全局状态
│   ├── main.tsx                         # 入口
│   ├── index.css                        # Tailwind + 自定义样式
│   ├── components/
│   │   ├── Header.tsx                   # 标题区
│   │   ├── InputPanel.tsx               # 文字输入区
│   │   ├── DiagnoseButton.tsx           # "开始诊断"按钮
│   │   ├── DiagnosticReport.tsx         # 诊断报告（含加载/空/错误态）
│   │   ├── RetryButton.tsx              # "换一个角度"按钮
│   │   └── Footer.tsx                   # 页脚
│   └── lib/
│       └── api.ts                       # Supabase Edge Function 调用
├── supabase/
│   └── functions/
│       └── anthropic-diagnose/
│           └── index.ts                 # Edge Function（API2D 版）
└── .env.example                         # 环境变量模板
```

## 部署步骤

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的 Supabase Edge Function URL
```

### 2. 部署 Edge Function

1. 进入 Supabase → Settings → Secrets，添加 `API2D_API_KEY`
2. 打开 `supabase/functions/anthropic-diagnose/index.ts`
3. 把 `SYSTEM_PROMPT` 的 PLACEHOLDER 替换为完整 v3.1 System Prompt
4. 部署：`supabase functions deploy anthropic-diagnose`

### 3. 部署前端

部署到 Cloudflare Pages：

```bash
npm run build
# 上传 dist/ 目录到 Cloudflare Pages
```
