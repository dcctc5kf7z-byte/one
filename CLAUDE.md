# CLAUDE.md — 通用文本透视镜 · 项目导航

> 最后更新：2026-06-29
> **当前阶段**：Phase 3 Skill 优先统一 — 迁移完成，队列清空
> **上一阶段收尾**：Hermes→Skill 迁移全部完成（M-1/M-2/M-3）+ 项目大扫除（-5117 行）
> **下一会话起点**：Open Design 安装 → OD 发布 text-lens → 下一阶段规划

---

## 项目概述

本项目开发了一款**通用文本透视镜**（`/text-lens`）——基于 X→Y→Z 诊断模型的镜像式文本分析代理。核心定位：镜子不是导师。反射文本，让用户看见文字里本已存在但他自己还没意识到的东西。

**产品形态**：Claude Code Skill（主产品） + Web App（试吃入口，降级维护）

**核心差异化**：多轮对话写作陪伴 × 7 体裁透镜 × X→Y→Z 路由。Claude Code Skill 中文写作分析类目空白，Web 文本分析为红海（Grammarly/秘塔写作猫/火龙果）。

**产品 System Prompt**：[docs/product/产品MVP方案-v3.md](docs/product/产品MVP方案-v3.md)（v3.1 三层重构·最新）

**Skill 入口**：[.claude/skills/writer/SKILL.md](.claude/skills/writer/SKILL.md)（v5.0.4 通用文本透视·11 条铁律·写作指纹·G-1 焦距集成）

---

## 项目结构

```
one/
├── CLAUDE.md                           # ← 你在这里
├── devlog/                             # 开发者日志（每日自动创建）
│   └── YYYY-MM-DD.md                   # 按日期命名的日志文件
├── docs/                               # 项目文档
│   ├── product/                         # 产品文档
│   │   ├── 产品MVP方案-v3.md            # 核心产品文档（v3.1 三层重构）
│   │   └── market-research-2026-06-29.md # 市场调研报告
│   ├── tech/                           # 技术方案
│   │   ├── architecture.md             # 技术架构文档
│   │   ├── architecture-review-2026-06-29.md # 架构审视报告
│   │   ├── focal-engine-spec.md        # G-1 六维焦距分析引擎规格
│   │   └── action-sentence-templates.md # G-5 动作句生成模板
│   ├── design/                         # 设计规划
│   │   └── ui-design.md                # UI/UX 设计规范
│   ├── execution/                      # 执行文档
│   │   └── skill-migration-plan.md     # Hermes→Skill 迁移计划（已完成）
│   └── archive/                        # 归档文档（历史参考）
│       └── superpowers/                # v4 时代设计档案
├── web-app/                            # Web App 技术资产（降级维护）
│   ├── src/
│   │   ├── App.tsx                     # 前端状态机
│   │   ├── lib/                        # API + 类型 + 指纹管理
│   │   └── components/                 # UI 组件（温墨·纸本风格）
│   └── supabase/functions/
│       ├── anthropic-diagnose/         # 旧 Edge Function（保留兼容）
│       └── hermes-diagnose/            # Hermes Edge Function（v6 已部署）
├── test/                               # 测试脚本
│   ├── hermes-smoke.mjs                # Hermes 冒烟测试
│   ├── hermes-smoke.sh                 # Bash wrapper
│   └── ollama-spike/                   # Ollama 可行性 spike（暂缓）
├── .claude/skills/writer/              # ★ /text-lens Skill（v5.0.4）
│   ├── SKILL.md                        # 入口（体裁路由 + X→Y→Z + 铁律 + 指纹协议）
│   ├── iron-laws.md                    # 铁律详细展开
│   ├── lenses/                         # 7 种体裁分析透镜（含焦距优先级 + 动作句方向库）
│   ├── reference/                      # 深层武器库（按需加载）
│   ├── tables/                         # 诊断表
│   ├── personas/                       # v4 角色归档（lenses 的源材料）
│   └── profile/                        # 用户写作指纹 + DNA + 配置
└── .gitignore
```

---

## 工作约定

### 开发流程
1. **每个工作日开始时**：检查 `devlog/` 是否有今日日志，没有则创建
2. **每次改动后**：更新当日 `devlog/YYYY-MM-DD.md`，记录完成事项和待办
3. **修改产品逻辑前**：先读 [产品MVP方案-v3.md](docs/product/产品MVP方案-v3.md)
4. **修改技术方案前**：先读 [docs/tech/architecture.md](docs/tech/architecture.md)
5. **修改 UI 前**：先读 [docs/design/ui-design.md](docs/design/ui-design.md)
6. **不确定执行顺序时**：查 [CLAUDE.md](CLAUDE.md) 当前状态表

### 开发者日志规范
- 文件命名：`devlog/YYYY-MM-DD.md`
- 每天第一件事：检查今日日志是否存在，不存在则从模板创建
- 每次完成一个子任务后更新对应条目
- 日志格式：完成事项 / 待办事项 / 遇到的问题 / 备注
- 每周日归档本周日志摘要

### 文档更新原则
- `docs/` 下的文件是**标准文件**——反映当前最新的开发共识
- 产品需求变化 → 更新 `docs/product/产品MVP方案-v3.md`
- 技术选型变化 → 更新 `docs/tech/architecture.md`
- 设计方案变化 → 更新 `docs/design/ui-design.md`
- 执行计划调整 → 更新 `CLAUDE.md` 当前状态表
- 每次更新文档时，在文件头部的"最后更新"日期处记录

### 产品迭代原则
- X→Y→Z 方法论和"镜子不是导师"是不可偏离的核心
- **Skill 优先**：Claude Code Skill 是主产品，所有新功能先上 Skill，Web App 跟进（2026-06-29 决策）
- 修改 System Prompt 前，必须通过 Edge Function + curl 脚本完成至少 3 段文字的测试（claude.ai 不可用——不走网页端验证路径）
- 所有 System Prompt 修改必须有对应的修订对照表和测试清单更新

### 部署注意
- **Supabase CLI `--use-api` 不打包多文件 import**：部署时必须使用合并后的单文件 `index.ts`（~2000 行，114KB，自包含），`engine.ts` 和 `layers.ts` 保留为源码参考
- **Bash 中文编码**：`curl -d '{"userText":"中文"}'` 会损坏 UTF-8 字节为 U+FFFD，测试脚本必须使用 `printf` + `--data-binary @temp_file` 方式构造请求体

---

## 当前状态

| 项 | 状态 |
|----|------|
| **🎯 产品方向** | **✅ Skill 优先** — Claude Code Skill 为主产品，Web App 降为试吃入口（2026-06-29 决策） |
| Skill v5.0.4 | **✅ 已发布** — 11 条铁律 + 7 体裁透镜 + G-1 焦距集成 + G-5 动作句 + 6 色信号 + 写作指纹 + OD 适配 |
| 产品 Skill 入口 | [SKILL.md](.claude/skills/writer/SKILL.md)（v5.0.4，~200 行自包含入口） |
| Web App | **⏸️ 降级** — 保留 Netlify 部署，引导用户安装 Skill，不再独立演进 |
| Edge Function (hermes-diagnose) | **⏸️ 降级** — v6 保留部署 |
| Edge Function (anthropic-diagnose) | **✅ v5.0.2**（v30，保留兼容） |
| Hermes 冒烟测试 | 12/14 (85.7%) |
| G-1 焦距引擎 | **✅ 已集成** — [规格](docs/tech/focal-engine-spec.md) + 7 透镜引用 + 焦距选择理由 |
| G-5 动作句模板 | **✅ 已集成** — 7 透镜均已集成 |
| 6 色信号 | **✅ 已集成** — [参考文档](.claude/skills/writer/reference/hermes-color-signals.md) + 7 透镜引用 |
| 写作指纹 | **✅ 已集成** — [fingerprint.md](.claude/skills/writer/profile/fingerprint.md) + SKILL.md 指纹协议 |
| Open Design 适配 | **✅ 已完成** — YAML frontmatter + `od.mode: utility` |
| 架构审视 | **✅ 已完成** — [报告](docs/tech/architecture-review-2026-06-29.md) |
| 市场调研 | **✅ 已完成** — [报告](docs/product/market-research-2026-06-29.md)：蓝海确认 |
| Git 仓库 | **✅ 已同步** — GitHub: [dcctc5kf7z-byte/one](https://github.com/dcctc5kf7z-byte/one) |
| 项目清理 | **✅ 已完成** — 删除 27 个过时文件（-5117 行），归档 superpowers |
| Supabase DB | **⏸️ 延后** |
| 微信生态 | **⏸️ 暂停** |
| Ollama spike | **⏸️ 暂缓** — 框架就绪，Qwen 2.5 14B 待下载 |

**下一会话起点**：Open Design 安装 → OD 发布 text-lens → 下一阶段规划
**Skill v5.0.4 架构**：[SKILL.md](.claude/skills/writer/SKILL.md) — 体裁预判路由 → 7 透镜按需加载（含 G-1 焦距优先级 + G-5 动作句方向库）→ X→Y→Z 诊断 → 结构化输出 → 写作指纹更新
**产品决策**：Skill 优先（2026-06-29）。Web 文本分析为红海，Claude Code Skill 中文写作分析为蓝海。
**Token 预算（Skill）**：最小 ~600t（通用透镜）/ 典型 ~1,200t（一体裁透镜）/ 最坏 ~3,000t（多透镜并行 + 深层分析）+ 指纹 ~500-800t
**API 降级链**：🦾 Claude Opus 4.8 (灵眸·Anthropic 原生) → GPT-4o → GPT-4o-mini → DeepSeek-V3（Tier 2-4 通过 API2D `oa.api2d.net`）
