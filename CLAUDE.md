# CLAUDE.md — 通用文本透视镜 · 项目导航

> 最后更新：2026-06-28
> **当前阶段**：Phase 1 — Ollama spike 框架就绪（`test/ollama-spike/`），待有 Ollama 环境中运行后评估
> **上一阶段收尾**：Ollama spike 测试框架搭建 — 14 用例 × 7 体裁 × 2 语言 + 自动化评估脚本 + 判定标准
> **下一会话起点**：用户在有 Ollama 环境中 `./run-spike.sh` → `node evaluate.mjs` → 若 ≥10/14 通过则进入 Skill 独立仓库提取

---

## 项目概述

本项目开发了一款**通用文本透视镜**（`/text-lens`）——基于 X→Y→Z 诊断模型的镜像式文本分析代理。核心定位：镜子不是导师。反射文本，让用户看见文字里本已存在但他自己还没意识到的东西。

**产品 System Prompt**：[docs/product/产品MVP方案-v3.md](docs/product/产品MVP方案-v3.md)（v3.1 三层重构·最新）

**Skill 入口**：[.claude/skills/writer/SKILL.md](.claude/skills/writer/SKILL.md)（v5.0.1 通用文本透视·精简完成）

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
│   │   └── architecture.md             # 技术架构文档
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
│   │   ├── App.tsx                      # ★ 前端状态机（7 AppPhase：input → diagnosing → confirming → correcting → re_diagnosing → diagnosis_shown + exhausted）
│   │   ├── lib/
│   │   │   ├── api.ts                   # API 层（DiagnoseResponse + conversationId + correctedState）
│   │   │   ├── types.ts                 # 全状态类型（WritingState / AppPhase / DiagnosisMeta / ParsedConfirmation / HistoryEntry）
│   │   │   └── state-parser.ts          # 状态确认句解析（正则匹配 + 五状态映射）
│   │   └── components/
│   │       ├── Header.tsx               # 标题 "用文字看清自己"
│   │       ├── InputPanel.tsx           # 无字数限制，五状态通用 placeholder
│   │       ├── DiagnoseButton.tsx       # 仅 loading 时禁用
│   │       ├── DiagnosticReport.tsx     # 按 AppPhase 切换展示
│   │       ├── StateConfirmation.tsx    # "我注意到你现在是**状态**——对吗？" + [确认]/[不对]
│   │       ├── StatePicker.tsx          # 五状态选择面板（纠正用）
│   │       ├── ActionBar.tsx            # [继续写] + [不满意，换个角度]（重试计数/上限）
│   │       ├── QuotaBadge.tsx           # "今日剩余 N 次"
│   │       ├── PaymentWall.tsx          # 配额耗尽替代 UI
│   │       ├── HistoryPanel.tsx         # 可折叠诊断记录
│   │       ├── PrivacyNotice.tsx        # 隐私声明
│   │       ├── Footer.tsx              # 页脚
│   │       └── RetryButton.tsx          # ❌ 已删除（被 ActionBar 取代）
│   └── supabase/functions/anthropic-diagnose/
│       ├── index.ts                     # ★ Edge Function 入口（v5.0.2 五层条件注入·单文件合并·已部署 v30）
│       ├── layers.ts                    # L0–L4 Prompt 常量 + 组装（源码参考）
│       └── engine.ts                    # Engine 层：预分类 + 条件注入 + 状态追踪（源码参考）
├── test/                                # 测试脚本
│   ├── diagnose.sh                      # 五状态单轮测试（15 用例：5 状态 × 3 段文字）
│   ├── flow.sh                          # 状态流转多轮测试（13 条流转路径）
│   └── deploy.sh                        # Supabase Edge Function 一键部署（含冒烟测试）
├── .claude/                            # Claude 配置
│   ├── settings.json                   # 权限和钩子配置
│   └── skills/writer/                  # ★ /text-lens Skill（v5.0 通用文本透视）
│       ├── SKILL.md                    # 入口（体裁预判路由 + X→Y→Z 模型 + 铁律）
│       ├── iron-laws.md                # 铁律详细展开
│       ├── lenses/                     # ★ 7 种体裁分析透镜（按需加载）
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
6. **不确定执行顺序时**：查 [docs/execution/implementation-plan.md](docs/execution/implementation-plan.md)

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
- 执行计划调整 → 更新 `docs/execution/implementation-plan.md`
- 每次更新文档时，在文件头部的"最后更新"日期处记录

### 产品迭代原则
- X→Y→Z 方法论和"推进不是陪伴"是不可偏离的核心
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
| 全状态设计规格 | **✅ 已定稿**（[设计文档](docs/superpowers/specs/2026-06-26-full-state-x-y-z-redesign.md)） |
| Skill v5.0.2 铁律扩充 | **✅ 已完成** — v5.0.1 + 铁律 #9 推≠替写 + #10 动作句优先 |
| 产品 Skill 入口 | [SKILL.md](.claude/skills/writer/SKILL.md)（v5.0.2，11 条铁律，~170 行自包含入口） |
| 网页版代码 | **✅ v4.0 全状态 + antd**（`web-app/` — Netlify: `eloquent-swan-c78519.netlify.app`） |
| Edge Function | **✅ v5.0.2 已部署**（v30，单文件合并版，五层条件注入） |
| 单轮测试 | **✅ 15/15 通过（100%）** |
| 流转测试 | **✅ 13/13 全部可达** |
| Hermes 设计文档 | **✅ v1.2 已定稿**（[16 章完整设计](docs/superpowers/specs/2026-06-28-hermes-full-product-design.md)） |
| Git 仓库 | **✅ 已初始化** — 2 commits，227 文件 |
| 设计-实施间隙 | **✅ 已盘点** — 4 核心问题 + 6 间隙 + 8 阶段困难 + 跨阶段风险，全部记录 |
| 优先级重排 | **✅ 已定稿** — Phase 1→2→停→评估，Phase 4 延后，Phase 5/6 暂停 |
| Phase 1 冒烟测试 | **✅ 已完成** — 14/14 全部通过 (100%) |
| G-1 焦距引擎规格 | **✅ 已完成** — [docs/tech/focal-engine-spec.md](docs/tech/focal-engine-spec.md) |
| G-5 动作句模板 | **✅ 已完成** — [docs/tech/action-sentence-templates.md](docs/tech/action-sentence-templates.md)，已集成至 7 个透镜文件 |
| Supabase DB | **⏸️ 延后** — 原 C.1.1/C.1.2，Phase 4 启动时再做 |
| 微信生态 | **⏸️ 暂停** — 转为以 Skill 形式优先发布 |
| Skill 发布 | **🔜 Phase 1** — 冒烟测试 ✅ → 铁律 ✅ → G-5 集成 ✅ → Ollama spike 框架 ✅ → 运行测试 → 提取独立仓库 → GitHub 发布 |

**下一会话起点**：在有 Ollama 的环境中运行 `test/ollama-spike/run-spike.sh` → `node evaluate.mjs` → 若 ≥10/14 PASS 则进入 Skill 独立仓库提取
**Skill v5.0 架构**：[SKILL.md](.claude/skills/writer/SKILL.md) — 体裁预判路由 → 7 透镜按需加载（含焦距优先级与动作句方向库）→ X→Y→Z 诊断 → 结构化输出（Z 层引用 G-5）
**v5.0.2 变更**：铁律 8→10 条 + G-5 动作句模板集成至 7 透镜 + SKILL.md 输出格式引用 G-5
**v5.0.1 变更**：语言一致性规则 / 输出长度 ≤500 字 / 透镜英文术语内部参考化 / 输出模板去 X/Y/Z 标签
**前端状态机**：`input → diagnosing → confirming → correcting → re_diagnosing → diagnosis_shown`（+ `exhausted` 终端态）
**前端计费规则**：确认状态 → 计费 / 换个角度 → 不计费 / 纠正状态 → 不计费 / 连续 2 轮同状态 → 第 3 轮跳过确认
**暂缓清单**：见 [devlog/2026-06-26.md](devlog/2026-06-26.md) DEFER-01 ~ DEFER-08
**Token 预算（Skill）**：最小 ~600t（通用透镜）/ 典型 ~1,200t（一体裁透镜）/ 最坏 ~3,000t（多透镜并行 + 深层分析）
**API 降级链**：🦾 Claude Opus 4.8 (灵眸·Anthropic 原生) → GPT-4o → GPT-4o-mini → DeepSeek-V3 → GPT-3.5（Tier 2-5 通过 API2D `oa.api2d.net`）
**国内 Claude 通道**：灵芽 `api.lingyaai.cn` ⭐ / 灵眸AI `api.lmuai.com` ⭐（均已调研，灵眸已集成到 Edge Function v5.0.2，max 分组后可用率 100%）
