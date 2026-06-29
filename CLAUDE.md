# CLAUDE.md — 通用文本透视镜 · 项目导航

> 最后更新：2026-06-29
> **当前阶段**：Phase 3 Skill 优先统一 — Web App 降为试吃入口，不再独立演进
> **上一阶段收尾**：Phase 2 前端重设计完成 + 架构审视发现 4 核心问题 + P0-1/2/3 全部处理
> **下一会话起点**：git push → Open Design 安装 → Skill OD 适配 → Skill 迁移规划（Hermes 资产提取）

---

## 项目概述

本项目开发了一款**通用文本透视镜**（`/text-lens`）——基于 X→Y→Z 诊断模型的镜像式文本分析代理。核心定位：镜子不是导师。反射文本，让用户看见文字里本已存在但他自己还没意识到的东西。

**产品形态**：Claude Code Skill（主产品） + Web App（试吃入口，降级维护）

**核心差异化**：多轮对话写作陪伴 × 7 体裁透镜 × X→Y→Z 路由。Claude Code Skill 中文写作分析类目空白，Web 文本分析为红海（Grammarly/秘塔写作猫/火龙果）。

**产品 System Prompt**：[docs/product/产品MVP方案-v3.md](docs/product/产品MVP方案-v3.md)（v3.1 三层重构·最新）

**Skill 入口**：[.claude/skills/writer/SKILL.md](.claude/skills/writer/SKILL.md)（v5.0.2 通用文本透视·11 条铁律）

---

## 项目结构

```
one/
├── CLAUDE.md                           # ← 你在这里
├── devlog/                             # 开发者日志（每日自动创建）
│   └── YYYY-MM-DD.md                   # 按日期命名的日志文件
├── docs/                               # 项目标准文件
│   ├── requirements/                   # 开发需求
│   │   └── product-spec.md             # 产品规格说明
│   ├── product/                         # 产品文档（不打包进 Skill）
│   │   ├── 产品MVP方案-v3.md            # 核心产品文档（v3.1 三层重构）
│   │   ├── 产品MVP方案-修订版.md         # v2（归档）
│   │   ├── 产品MVP方案.md               # v1 原始版本（归档）
│   │   ├── 变现蓝图.md                  # 商业模式文档
│   │   ├── 国内环境适配方案.md           # 国内部署适配
│   │   └── 小白变现第一步.md            # 入门指南
│   ├── tech/                           # 技术方案
│   │   ├── architecture.md             # 技术架构文档（2026-06-29 重写）
│   │   ├── architecture-review-2026-06-29.md # 架构审视 + 压力测试报告
│   │   ├── focal-engine-spec.md        # G-1 六维焦距分析引擎规格
│   │   └── action-sentence-templates.md # G-5 L4 动作句生成模板
│   ├── design/                         # 设计规划
│   │   └── ui-design.md                # UI/UX 设计规范
│   ├── execution/                      # 执行步骤
│   │   └── implementation-plan.md      # 分阶段实施计划
│   └── superpowers/                    # 原始设计档案
│       ├── specs/
│       │   └── 2026-06-23-writing-skill-design.md
│       └── layers/                      # ★ 四层 System Prompt
│           ├── layer-0-core-identity.md          # L0 核心身份 (~400t)
│           ├── layer-1-state-detection.md        # L1 状态识别 (~390t)
│           ├── layer-2-state-x-y-z-mapping.md    # L2 X→Y→Z映射 (~530t)
│           ├── layer-3-full-diagnosis.md         # L3 完整诊断协议 (~3150t)
│           └── layer-4-fault-handling.md         # L4 故障处理 (~2000t)
├── web-app/                             # Web App 源码（React 19 + TypeScript + Tailwind CSS 4 + Vite 8）
│   ├── src/
│   │   ├── App.tsx                      # ★ 前端状态机（3-phase：idle → analyzing → results_shown + orthogonal mode）
│   │   ├── lib/
│   │   │   ├── api.ts                   # API 层（hermesDiagnose + 旧 diagnose 兼容）
│   │   │   ├── types.ts                 # 类型定义（新 Hermes 类型 + 旧 v3.1 类型分界线标注）
│   │   │   ├── hermes-types.ts          # ★ Hermes 6 色信号 / ViewMode / SentenceAnalysis / GutterBlock / HermesHistoryEntry / FingerprintData
│   │   │   └── FingerprintManager.ts    # localStorage 指纹 CRUD + 松绿阈值 + 导入/导出
│   │   └── components/
│   │       ├── Header.tsx               # 标题 + 笔图标 + ColorBar 嵌入（衬线字体）
│   │       ├── EditorWithGutter.tsx     # ★ textarea + 左侧 48px gutter + 笔记本横线 + 装订线 + 主导色渐变边
│   │       ├── GutterBlock.tsx          # ★ 书签条（4×28px 圆角矩形 + 同色微发光）+ 紧迫度排序 + "+N" 展开
│   │       ├── ColorBar.tsx             # 常驻六色圆点条（替换弹窗 ColorLegend），hover 展开详情
│   │       ├── SignalBar.tsx            # 诊断面板顶部信号频率分布横向色条（按紧迫度排序）
│   │       ├── ModeSlider.tsx           # 两态滑动切换（透视模式 ↔ 我的文字），颜色关联（steel_blue ↔ pine_green）
│   │       ├── AnalyzeButton.tsx        # "透视这段文字"，墨水印章风格（暖深棕底 + 笔图标 + 加载 spinner）
│   │       ├── DiagnosisPanel.tsx       # ★ 诊断结果面板：顶部 3px 主导色条 + SignalBar + 两节颜色染边（steel_blue / crimson/amber）+ Markdown 渲染
│   │       ├── HistoryPanel.tsx         # 可折叠诊断记录 + 左侧颜色光谱条 + 指纹导入/导出
│   │       ├── PrivacyNotice.tsx        # 隐私声明（脚注风格）
│   │       └── Footer.tsx              # 页脚（暖色分隔线 + italic 文字 + 松绿指纹计数）
│   └── supabase/functions/
│       ├── anthropic-diagnose/          # 旧 v3.1 Edge Function（v5.0.2 五层条件注入·已部署 v30，保留兼容）
│       │   ├── index.ts                 # 入口（单文件合并版）
│       │   ├── layers.ts                # L0–L4 Prompt 常量（源码参考）
│       │   └── engine.ts                # Engine 层（源码参考）
│       └── hermes-diagnose/             # ★ Hermes Edge Function（v6 已部署，结构化 JSON 输出）
│           └── index.ts                 # ~300 行，Hermes System Prompt + safeJSONParse 4层回退 + 灵眸→API2D 降级链
├── handoffs/                            # 会话交接日志
│   └── 2026-06-28.md                    # Phase 1 收尾 handoff
├── test/                                # 测试脚本
│   ├── diagnose.sh                      # 五状态单轮测试（15 用例：5 状态 × 3 段文字）
│   ├── flow.sh                          # 状态流转多轮测试（13 条流转路径）
│   ├── deploy.sh                        # Supabase Edge Function 一键部署（含冒烟测试）
│   ├── hermes-smoke.mjs                 # Hermes 冒烟测试（Node.js，14 文本，7 体裁 × 2 语言）
│   ├── hermes-smoke.sh                  # Hermes 冒烟 Bash wrapper
│   └── ollama-spike/                    # Ollama 可行性 spike（Qwen 2.5 14B vs Claude）
│       ├── README.md                    # 方法+标准+环境准备
│       ├── test-texts.json              # 14 条测试用例
│       ├── run-spike.sh                 # Bash wrapper
│       ├── run-spike.mjs                # Node.js 测试执行器
│       ├── evaluate.mjs                 # 7 维自动评估脚本
│       └── results/                     # 运行时结果（gitignore）
├── .claude/                            # Claude 配置
│   ├── settings.json                   # 权限和钩子配置
│   └── skills/writer/                  # ★ /text-lens Skill（v5.0 通用文本透视）
│       ├── SKILL.md                    # 入口（体裁预判路由 + X→Y→Z 模型 + 铁律）
│       ├── iron-laws.md                # 铁律详细展开
│       ├── lenses/                     # ★ 7 种体裁分析透镜（v1.1，含焦距优先级与动作句方向库）
│       │   ├── poetic.md               # 诗性/意象文本
│       │   ├── narrative.md            # 叙事/故事文本
│       │   ├── argument.md             # 论述/观点文本
│       │   ├── technical.md            # 技术/学术文本
│       │   ├── dialogue.md             # 对话/交流文本
│       │   ├── personal.md             # 日记/内省文本
│       │   └── general.md              # 通用兜底
│       ├── personas/                   # 原始写作教练角色（v4 归档，lenses 的源材料）
│       ├── tables/                     # 诊断表
│       │   ├── diagnosis.md            # 叙事体裁 X→Y→Z 详细表
│       │   ├── thresholds.md           # 推阻计数器 + 阈值（仅交互式写作诊断时使用）
│       │   └── dead-ends.md            # 死胡同路由 + 回滚协议（仅交互式写作诊断时使用）
│       ├── reference/                  # 深层武器库（按需加载）
│       │   ├── cognitive-functions.md  # 荣格八维认知功能
│       │   ├── archetypes.md           # 原型四层
│       │   ├── philosophical-lens.md   # 哲学视角
│       │   ├── narrative-theory.md     # 叙事理论
│       │   ├── diagnoses.md            # 诊断参照（AI 自校准）
│       │   └── anti-patterns.md        # 反模式（AI 自校准）
│       └── profile/                    # 用户写作指纹数据
└── skills-lock.json
```

---

## 工作约定

### 开发流程
1. **每个工作日开始时**：检查 `devlog/` 是否有今日日志，没有则创建
2. **每次改动后**：更新当日 `devlog/YYYY-MM-DD.md`，记录完成事项和待办
3. **修改产品逻辑前**：先读 [产品MVP方案-修订版.md](.claude/skills/writer/产品MVP方案-修订版.md)
4. **修改技术方案前**：先读 [docs/tech/architecture.md](docs/tech/architecture.md)
5. **修改 UI 前**：先读 [docs/design/ui-design.md](docs/design/ui-design.md)
6. **不确定执行顺序时**：查 [docs/tech/architecture.md](docs/tech/architecture.md) 和 [CLAUDE.md](CLAUDE.md) 当前状态表（implementation-plan.md 已废弃）

### 开发者日志规范
- 文件命名：`devlog/YYYY-MM-DD.md`
- 每天第一件事：检查今日日志是否存在，不存在则从模板创建
- 每次完成一个子任务后更新对应条目
- 日志格式：完成事项 / 待办事项 / 遇到的问题 / 备注
- 每周日归档本周日志摘要

### 文档更新原则
- `docs/` 下的文件是**标准文件**——反映当前最新的开发共识
- 产品需求变化 → 更新 `docs/requirements/product-spec.md`
- 技术选型变化 → 更新 `docs/tech/architecture.md`
- 设计方案变化 → 更新 `docs/design/ui-design.md`
- 执行计划调整 → 更新 `CLAUDE.md` 当前状态表（implementation-plan.md 已废弃，不再使用分阶段计划文档）
- 每次更新文档时，在文件头部的"最后更新"日期处记录

### 产品迭代原则
- X→Y→Z 方法论和"镜子不是导师"是不可偏离的核心
- **Skill 优先**：Claude Code Skill 是主产品，所有新功能先上 Skill，Web App 跟进（2026-06-29 决策）
- 修改 System Prompt 前，必须通过 Edge Function + curl 脚本完成至少 3 段文字的测试（claude.ai 不可用——不走网页端验证路径）
- 所有 System Prompt 修改必须有对应的修订对照表和测试清单更新

### 部署注意
- **Supabase CLI `--use-api` 不打包多文件 import**：部署时必须使用合并后的单文件 `index.ts`（~2000 行，114KB，自包含，v5.0.2），`engine.ts` 和 `layers.ts` 保留为源码参考
- **Bash 中文编码**：`curl -d '{"userText":"中文"}'` 会损坏 UTF-8 字节为 U+FFFD，测试脚本必须使用 `printf` + `--data-binary @temp_file` 方式构造请求体
- **测试依赖**：`diagnose.sh` 和 `deploy.sh` 需要 `SUPABASE_ANON_KEY` 环境变量（Supabase Dashboard → Project Settings → API → anon/public）

---

## 当前状态

| 项 | 状态 |
|----|------|
| **🎯 产品方向** | **✅ Skill 优先** — Claude Code Skill 为主产品，Web App 降为试吃入口（2026-06-29 决策） |
| 全状态设计规格 | **✅ 已定稿**（[设计文档](docs/superpowers/specs/2026-06-26-full-state-x-y-z-redesign.md)） |
| Skill v5.0.2 | **✅ 已发布** — 11 条铁律 + 7 体裁透镜 + G-5 集成 + GitHub Release → [text-lens](https://github.com/dcctc5kf7z-byte/text-lens) |
| 产品 Skill 入口 | [SKILL.md](.claude/skills/writer/SKILL.md)（v5.0.2，~170 行自包含入口） |
| Web App (Hermes) | **⏸️ 降级** — 保留 Netlify 部署，不再独立演进 System Prompt，改为引导用户安装 Skill |
| Web App 代码 | `web-app/` — 「温墨·纸本」风格，React 19 + Tailwind 4 + Vite 8，保留为技术资产 |
| Edge Function (hermes-diagnose) | **⏸️ 降级** — v6 保留部署，后续不再更新 System Prompt |
| Edge Function (anthropic-diagnose) | **✅ v5.0.2**（v30，保留兼容） |
| Hermes 冒烟测试 | 12/14 (85.7%)，personal 截断不再修复（产品方向已转） |
| 单轮测试 (旧) | **✅ 15/15 通过（100%）** |
| 流转测试 (旧) | **✅ 13/13 全部可达** |
| G-1 焦距引擎规格 | **✅ 已定稿** — [958 行](docs/tech/focal-engine-spec.md)，待集成至 7 透镜（P2） |
| G-5 动作句模板 | **✅ 已完成** — 已集成至 7 个透镜文件 |
| 架构审视 | **✅ 已完成** — [报告](docs/tech/architecture-review-2026-06-29.md)，4 核心问题 + 7 压测 + 12 行动项 |
| 文档止血 (P0) | **✅ P0-1/2/3 全部完成** — architecture.md 重写 + implementation-plan.md 废弃 + Skill/Web 关系决策 |
| 市场调研 | **✅ 已完成** — [报告](docs/product/market-research-2026-06-29.md)：Claude Code Skill 中文写作诊断蓝海确认，零直接竞品 |
| Open Design 适配 | **🔜 待做** — 安装 OD → 添加 YAML frontmatter → `od.mode: utility` |
| Skill 迁移规划 | **🔜 待做** — 从 Hermes 提取可复用资产（6色信号/焦距集成/指纹）到 Skill |
| Git 仓库 | **⚠️ 未 push** — 本地 commits 待推送到 GitHub remote |
| Supabase DB | **⏸️ 延后** — 原 C.1.1/C.1.2 |
| 微信生态 | **⏸️ 暂停** — Skill 优先，Web 分发不是当前重点 |
| Ollama 可行性 spike | **⏸️ 暂缓** — 框架就绪，Qwen 2.5 14B 待下载 |

**下一会话起点**：git push → Open Design 安装 → Skill OD 适配 → Skill 迁移规划（Hermes 资产提取 → Skill）
**Skill v5.0.2 架构**：[SKILL.md](.claude/skills/writer/SKILL.md) — 体裁预判路由 → 7 透镜按需加载（含焦距优先级与动作句方向库）→ X→Y→Z 诊断 → 结构化输出（Z 层引用 G-5）
**v5.0.2 变更**：铁律 9→11 条 + G-5 动作句模板集成至 7 透镜 + SKILL.md 输出格式引用 G-5
**产品决策**：Skill 优先（2026-06-29）。Web 文本分析为红海，Claude Code Skill 中文写作分析为蓝海。多轮对话形态天然适配"镜子"定位。
**Web App 定位**：试吃入口，引导用户安装 Skill。不再独立演进 System Prompt。代码保留为技术资产。
**暂缓清单**：见 [devlog/2026-06-26.md](devlog/2026-06-26.md) DEFER-01 ~ DEFER-08
**Token 预算（Skill）**：最小 ~600t（通用透镜）/ 典型 ~1,200t（一体裁透镜）/ 最坏 ~3,000t（多透镜并行 + 深层分析）
**API 降级链**：🦾 Claude Opus 4.8 (灵眸·Anthropic 原生) → GPT-4o → GPT-4o-mini → DeepSeek-V3（Tier 2-4 通过 API2D `oa.api2d.net`）
