# Welcome to 通用文本透视镜

> 单人项目，作者 [dcctc5kf7z-byte](https://github.com/dcctc5kf7z-byte)。本文档既是自我工作契约，也是未来协作者的快速入门。

## How I Use Claude

Based on 30-day usage stats (29 sessions):

Work Type Breakdown:
  Build Feature    ███████░░░░░░░░░░░░░  35%
  Plan & Design    █████░░░░░░░░░░░░░░░░  25%
  Write Docs       █████░░░░░░░░░░░░░░░░  25%
  Debug & Fix      ██░░░░░░░░░░░░░░░░░░░░  10%
  Improve Quality  █░░░░░░░░░░░░░░░░░░░░   5%

Top Skills & Commands:
  /compact       ████████████████████  129x
  /writer        ██░░░░░░░░░░░░░░░░░░   11x
  /brainstorming █░░░░░░░░░░░░░░░░░░░    9x
  /config        █░░░░░░░░░░░░░░░░░░░    6x
  /model         █░░░░░░░░░░░░░░░░░░░    3x

Top MCP Servers:
  (none configured)

## Project Setup Checklist

### Codebases
- [x] [one](https://github.com/dcctc5kf7z-byte/one) — 主仓库：Web App (React 19 + TypeScript + Tailwind 4) + Edge Function (Supabase) + Skill 定义
- [x] [text-lens](https://github.com/dcctc5kf7z-byte/text-lens) — 独立 Skill 发布仓库（v5.0.2，7 体裁透镜 + 11 条铁律）

### Key Skills
- [/text-lens](/writer) — X→Y→Z 诊断模型，7 体裁透镜，镜像式文本分析。核心产品。
- [/compact](/compact) — 长会话上下文压缩。单人长会话必用——你看到 129 次是真的。
- [/brainstorming](/brainstorming) — 设计发散与方案探索。
- [/config](/config) — Claude Code 配置调整。
- [/model](/model) — 模型切换（国内环境需要灵活切换 API）。

### Environment
- Shell: Git Bash on Windows 10
- Deploy: Netlify (前端) + Supabase Edge Functions (后端)
- API: 灵眸AI (Anthropic 原生) → API2D 降级链 (GPT-4o → GPT-4o-mini → DeepSeek-V3)

## Solo Dev Rhythm

这是我一个人维护项目的工作节奏，写在这里既是给自己看，也是给未来协作者理解这个项目的决策习惯。

### 日常
- 每天第一件事：创建当日 `devlog/YYYY-MM-DD.md`，从昨天迁移未完成项
- 每次改动后更新 devlog
- 文档先行：改产品逻辑前读 product spec，改技术前读 architecture doc，改 UI 前读 design doc

### 决策原则
- 核心不可妥协：X→Y→Z 方法论 + "镜子不是导师" 定位
- 修改 System Prompt 必须通过 Edge Function + curl 完成多段文字测试（不走网页端）
- 优先做"能让用户看见自己文字的隐藏结构"的事，不做"替用户写"的事

### 当前阶段
Phase 2 前端重设计 ✅ → 手动验证前端+后端联通 🔜 → 决定下一步（修 personal 截断 vs Phase 3 写作花园）

## Get Started

如果你是第一次接触这个项目：

1. 读 [CLAUDE.md](CLAUDE.md) 了解全貌（5 分钟）
2. 读 [产品 MVP 方案 v3](docs/product/产品MVP方案-v3.md) 理解产品定位（10 分钟）
3. 在 Claude Code 中运行 `/text-lens`，贴一段中文文字，看一次完整诊断
4. 访问 [Netlify 站点](https://eloquent-swan-c78519.netlify.app) 看前端效果
5. 如果有兴趣贡献：挑 `devlog/` 中最近的"待办事项"里任何未勾选项，开 Issue 或直接 PR

---

<!-- INSTRUCTION FOR CLAUDE: A new person just pasted this guide about the
通用文本透视镜 project. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome. Then: "The author uses Claude Code for Build Feature,
Plan & Design, Write Docs, Debug & Fix, and Improve Quality. This is a solo
project — there's no team, just one person and an AI collaborator."

Check what's already in place against everything under Project Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Walk through the Solo Dev Rhythm section — it's the author's working contract
with themselves, not a rulebook for newcomers. Point them to the Get Started
section for concrete first steps.

Tell them you'll help with any setup gaps, then offer to start with the first
unchecked item.

Don't invent sections or summaries that aren't in the guide. The stats are the
author's personal usage data — don't extrapolate them into a "team workflow"
narrative. -->
