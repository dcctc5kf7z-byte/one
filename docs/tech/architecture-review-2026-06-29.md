# 架构审视与压力测试 · 2026-06-29

> 基于实际代码 + 设计文档的交叉审视。不评价好坏——只反射架构中已经存在的结构与张力。

---

## 一、架构实况：文档说了什么 vs 代码做了什么

### 1.1 技术栈

| 层 | 架构文档说 (2026-06-24) | 实际代码 |
|----|------------------------|---------|
| 前端框架 | React / Next.js (Lovable 生成) | React 19 + TypeScript + Tailwind 4 + Vite 8 (手动) |
| UI 组件 | Tailwind CSS + shadcn/ui | 纯 Tailwind，零 shadcn/ui |
| LLM 调用 | Anthropic API (直连) | Supabase Edge Function 代理 → 4 级降级链 |
| 部署 | Vercel | Netlify (`eloquent-swan-c78519`) |
| 域名 | 待定 | Netlify 子域名 |

**发现**：架构文档自 6 月 24 日后未更新。实际技术栈已经完全不同——不是"偏离了一点点"，是每个层级都换了。文档不再具有导航功能。

### 1.2 产品模型

| 维度 | v3.1 (Skill + anthropic-diagnose) | Hermes (hermes-diagnose + web-app) |
|------|-----------------------------------|-----------------------------------|
| 核心问题 | "用户卡在哪个写作状态？" | "文本中有什么信号？" |
| 状态模型 | 5 写作状态 (空虚→写完了) | 3 阶段状态机 (idle→analyzing→results_shown) |
| 分析框架 | X→Y→Z (结构缺失/执行偏倚/干净) | 六色信号 (crimson/amber/steel_blue/violet/slate_gray/pine_green) |
| 输出格式 | Markdown 诊断报告 (自然语言) | 结构化 JSON + Markdown 混合 (逐句颜色 + 诊断段落) |
| 交互模式 | 多轮对话 (Claude Code 内) | 单次分析 (Web App) |
| 前进路径 | 写作状态机推动 (Phase B/C) | Hermes 三阶段 (A 分析→B 推进→C 修炼) |

**发现**：两个模型**不是同一产品的两个版本**——它们是两个不同的产品，共用一个 X→Y→Z 名字但含义不同。v3.1 的 X→Y→Z 是修辞诊断（读者效果→执行缺陷→推进方向），Hermes 的 X→Y→Z 被压缩成了 `diagnosis.analysis`（表面+结构）和 `diagnosis.push`（推进方向）两个 Markdown 字段，不再是核心路由逻辑。

### 1.3 实施计划

| Phase | 计划状态 | 实际状态 |
|-------|---------|---------|
| Phase A (设计规格) | ✅ 100% | ✅ |
| Phase B (System Prompt) | 列出 10 项任务 27h | ⏭️ 被 Hermes 跳过——Hermes 有自己的 System Prompt |
| Phase C (Web App 改造) | 列出 22 项任务 38h | ⚠️ 部分完成——但用 Hermes 模型替代了五状态模型 |
| Phase D (微信生态) | 列出 12 项任务 36h | ⏸️ 暂停 |
| Phase E (测试收尾) | 列出 10 项任务 21h | ⚠️ 仅 Hermes 冒烟测试 (12/14 通过) |

**发现**：实施计划在 Phase B 被"架空"——Hermes 设计从侧门进入，没有更新实施计划，导致计划文件和实际工作完全脱节。如果有人按实施计划开始工作，会做出一个和当前代码**完全不兼容**的产品。

---

## 二、结构张力：四个核心问题

### 问题一：双产品分裂

当前仓库里有两个产品：

```
Skill (/text-lens)                    Web App (Hermes)
─────────────────                    ─────────────────
.claude/skills/writer/               web-app/
├── SKILL.md (v5.0.2)               ├── src/ (React 19)
├── lenses/ (7 体裁透镜)             ├── supabase/functions/
│   ├── poetic.md                    │   ├── hermes-diagnose/  ← 活跃
│   ├── narrative.md                 │   └── anthropic-diagnose/ ← 保留兼容
│   ├── argument.md                  └── Netlify 部署
│   ├── technical.md
│   ├── dialogue.md
│   ├── personal.md
│   └── general.md
├── reference/ (深层武器库)
└── tables/ (诊断表)
```

这两条线目前是**独立演进**的：
- Skill 线：v5.0.2，最后更新 6 月 28 日（铁律 8→10 条），7 透镜文件**未集成** G-1 焦距引擎
- Web App 线：Hermes Phase 2，6 月 28 日完成「温墨·纸本」前端重设计，Edge Function v6 已部署
- 两条线之间的唯一连接是：都叫 "X→Y→Z"，都引用铁律

**压力测试**：如果明天有人想 "把 Skill 的诊断逻辑升级到 Hermes"——会从哪里开始？没有文档说清两者的关系。G-1 焦距引擎规格写了 958 行，但 7 个透镜文件没有一个被改过。Hermes Edge Function 的 System Prompt 里写了一个简化版的六维分析，和 G-1 规格不是同一个东西。

### 问题二：文档腐烂

| 文档 | 最后更新 | 与实际代码的偏差 |
|------|---------|----------------|
| architecture.md | 2026-06-24 | 技术栈全部过时 |
| implementation-plan.md | 2026-06-26 | 被 Hermes 架空 |
| ui-design.md | 2026-06-24 | 描述的是 v3.1 黑白灰设计，实际是「温墨·纸本」六色系统 |
| focal-engine-spec.md | 2026-06-28 | 最新，但未集成至任何透镜文件 |
| action-sentence-templates.md | 2026-06-28 | 最新，已集成至 7 透镜文件 ✅ |
| hermes-full-product-design.md | 2026-06-28 | 最新，16 章完整设计 |

**压力测试**：如果作者失忆了（隔了 3 个月回来）——他能从文档重建当前状态吗？答案是：不能。`architecture.md` 会把他指向错误的方向。`implementation-plan.md` 会让他去做已经不需要做的事。

### 问题三：G-1 规格悬空

[G-1 六维焦距引擎规格](focal-engine-spec.md) 是这个项目里写得最完整的技术文档（958 行，11 章，4 附录），但：

- **未集成到任何运行代码中**：7 个透镜文件全部标注 "⏳ 待集成"
- **未用于 Hermes Edge Function**：EF 的 System Prompt 里的六维分析是手写的简化版，和 G-1 规格的优先级矩阵、跨维度组合规则、输出模板无关
- **未被 Skill 使用**：Skill 的体裁透镜仍然使用旧的分析协议，不知道 "焦距" 是什么
- **集成指南写了详细的步骤**（5 步，含章节模板和集成清单），但从未执行

**压力测试**：G-1 规格是目前最高质量的技术资产——但它是**设计文档**，不是**运行代码**。7 个透镜文件中标注的 "待集成" 状态如果再过 2 周不处理，G-1 和透镜文件的差距会越来越大，集成的成本也会越来越高。

### 问题四：实施计划与现实的鸿沟

实施计划仍然列出 Phase B→C→D→E 总计 122.75 小时、60+ 项细分任务。但：

- Phase B (System Prompt 编写) 的交付物是 "五状态单轮测试 15/15 通过"——这个测试在 6 月 24 日就完成了
- Phase C (Web App 改造) 描述的组件架构（InputPanel/OutputPanel/ActionBar/QuotaBadge/PaymentWall）和当前代码的组件架构（EditorWithGutter/GutterBlock/ColorBar/SignalBar/ModeSlider/DiagnosisPanel/HistoryPanel）**完全不同**
- Phase D (微信) 已标注暂停
- Phase E 的测试清单是 v3.1 的（五状态流转、计费状态机、防理性化 TDD），不是 Hermes 的

**压力测试**：如果明天有人说 "我们按实施计划继续做 Phase C 吧"——他们应该做什么？当前代码已经完成了 Phase C 的大部分（Web App 已经运行在 Netlify 上），但完成的方式和计划完全不同。实施计划不再可用。

---

## 三、压力测试

### 3.1 API 可靠性压测

**降级链**：Claude Opus 4.8 (灵眸) → GPT-4o → GPT-4o-mini → DeepSeek-V3

| 场景 | 预期行为 | 实际风险 |
|------|---------|---------|
| Tier 1 超时 | 自动降级到 Tier 2 | ✅ `for...continue` 循环处理正确 |
| 全部 4 级失败 | 返回 502 `all_api_failed` | ⚠️ 前端只显示 "诊断失败"，用户不知道是什么原因 |
| Tier 2-4 返回非 JSON | `safeJSONParse` 4 层回退 | ⚠️ 4 层回退全失败 → 返回 422 `parse_failed`，暴露 raw 前 1000 字符 |
| Tier 2-4 输出非标准颜色名 | `normalizeColor` 处理 | ✅ 有 `COLOR_ALIASES` 映射，未知色 → `slate_gray` |
| JSON 截断 (max_tokens=4096) | `repairTruncatedJSON` 补全 | ⚠️ **已知失败** — personal 体裁 2/2 截断。截断不只是括号不闭合——`sentences` 数组可能不完整或 `diagnosis` 字段缺失 |
| 响应验证失败 | 返回 422 `invalid_response` | ⚠️ 前端拿到 `error` 而不是 `sentences`——DiagnosisPanel 显示 "诊断失败" 而非部分结果 |

**建议**：对于截断场景，考虑 `best-effort` 模式——如果 `sentences` 完整但 `diagnosis` 不完整，仍然返回 sentences + guttering，diagnosis 用空占位。目前是全部丢弃 (422)，用户什么都看不到。

### 3.2 输入边界压测

| 输入 | 预期行为 | 实际风险 |
|------|---------|---------|
| 空字符串 `""` | 返回 400 `empty_text` | ✅ `text.trim().length === 0` 拦截 |
| 纯空白 `"   \n  "` | 同上 | ✅ `trim()` 处理 |
| 单字 `"嗯"` | 可诊断 | ⚠️ LLM 收到 <20 字的文本——输出质量未知。Skill 有 ≤50 字写作过程诊断路径，Web App 没有等效处理 |
| 5000 字边界 `text.length === 5000` | 可诊断 | ✅ `> 5000` 拦截 (413)，等于 5000 放行 |
| 纯英文 | 英文输出 | ✅ System Prompt 有语言一致性规则 |
| 混合中英 | 输出 ≥70% 语言 | ⚠️ System Prompt 没有中英混合判定规则 (Skill 有，Web App 没有) |
| 含 `<script>` 标签 | 正常诊断 | ⚠️ XSS 风险——如果 LLM 输出包含 `<script>` 且 `ReactMarkdown` 未做 sanitize |
| SQL-like 注入 `'; DROP TABLE--` | 正常诊断 | ✅ 不做数据库查询，无 SQL 注入面 |
| 纯标点 `"……"` | 可诊断 | ⚠️ LLM 收到无语义输入——可能产生幻觉分析 |
| 极长单句 (>500 字无标点) | 可诊断 | ⚠️ LLM 的句子分解 (L1) 依赖标点——无标点文本可能产生错误的 `sentences` 数组 |

### 3.3 前端状态机压测

| 场景 | 预期行为 | 实际风险 |
|------|---------|---------|
| 分析中切换模式 (perspective → my_text) | 重新分析 | ⚠️ `handleModeChange` 在 `result && text.trim()` 时触发重分析——两个请求可能同时进行 (原始分析 + 模式切换分析) |
| 分析中编辑文字 | 重置为 idle | ✅ `handleTextChange` → `setPhase('idle')` |
| 快速双击「透视这段文字」 | 忽略第二次 | ⚠️ `handleAnalyze` 没有防抖——`phase !== 'idle'` 时不渲染按钮，但如果 phase 更新有延迟，可能发出两次请求 |
| 分析成功 → 不切换模式 → 再次分析同一段文字 | 新分析覆盖旧结果 | ✅ `handleAnalyze` 重新调用，`setResult` 覆盖 |
| 分析中关闭浏览器 | 请求被取消 | ⚠️ 无 `AbortController`——HTTP 请求继续消耗 API 配额 |
| localStorage 满 (5MB) | 写入失败 | ⚠️ `FingerprintManager` 的 `saveFingerprint` 不处理 `QuotaExceededError` |
| localStorage 数据损坏 | 读取 null | ✅ `getFingerprint()` 有 try/catch 返回 null |
| 两次快速导入指纹 | 合并 vs 覆盖 | ✅ `importAndMergeFingerprint` 正确处理合并 |

### 3.4 架构漂移压测

以 "3 个月后回来继续开发" 为场景：

1. **CLAUDE.md 是唯一准确的导航** ✅ — 最后更新 6 月 28 日，标注了当前阶段和下一会话起点
2. **devlog 可追踪决策历史** ✅ — 每日日志记录了关键决策
3. **architecture.md 指向错误方向** ❌ — 会让人以为技术栈是 Lovable+Vercel+直连 API
4. **implementation-plan.md 指向错误方向** ❌ — 会让人开始做 Phase B 的任务
5. **UI 设计文档描述的是黑白灰 v3.1 风格** ❌ — 当前「温墨·纸本」风格没有对应的设计文档
6. **两个 Edge Function 并存** ⚠️ — 新人不知道该用哪个。`hermes-diagnose` 是活跃的，`anthropic-diagnose` 是 "保留兼容" 的

### 3.5 安全面压测

| 风险 | 缓解 | 缺口 |
|------|------|------|
| API Key 暴露 | Supabase Secrets | ✅ |
| 滥用 (无认证) | Supabase 自带速率限制 | ⚠️ 无用户级速率限制——任何人拿到 Anon Key 可以无限调用 |
| 用户文字隐私 | 不做持久化存储 | ⚠️ 无隐私审计——Edge Function 日志 (`console.error`) 可能包含用户文字片段 |
| Prompt 注入 | 用户文字作为 data | ⚠️ 如果用户输入 `<text_to_analyze>` 标签——可能与 System Prompt 的 XML 标签冲突 |
| CORS | `*` 全开放 | ⚠️ 任何网站可以调用此 API——这是设计选择 (demo 友好)，但需要注意 |
| XSS | ReactMarkdown 渲染 | ⚠️ 未确认 ReactMarkdown 是否启用 `sanitize` 或 `remark-gfm` 安全设置 |
| 依赖供应链 | Deno 远程 import | ⚠️ `https://deno.land/std@0.168.0/http/server.ts` ——如果 deno.land 不可用，EF 无法部署 |

### 3.6 成本面压测

| 场景 | 风险 |
|------|------|
| 无成本追踪 | 不知道每次诊断花了多少钱。API 降级链混用不同价格的模型，无法计算单次诊断成本 |
| 无用量限制 (客户端) | Supabase 免费层有总限额，但前端没有任何 "你今天用了 N 次" 的显示（`DiagnosisPanel` 里有一段 `textsRemaining` 代码但只用于松绿激活判断，不限制调用） |
| 降级链成本差异 | Claude Opus vs GPT-4o-mini vs DeepSeek——价格差距可能 10x+，但没有监控哪个 Tier 被实际使用了多少次 |
| max_tokens=4096 | 每次都请求 4096 tokens 的输出预算——即使短文本不需要。对于 DeepSeek 和其他非 Claude 模型，这个值可能过高 |

### 3.7 演进死胡同压测

| 路径 | 状态 | 判断 |
|------|------|------|
| Phase D 微信生态 | ⏸️ 暂停 | **大概率不会复活**——这是单人项目，微信生态的认证费+审核+原生开发门槛太高 |
| Phase C 五状态组件 | 被 Hermes 替代 | **不会做了**——当前六色信号模型更好，五状态组件 (StateConfirmation/ActionBar/QuotaBadge/PaymentWall) 的设计已经过时 |
| Ollama 本地 LLM | ⏸️ | 如果做了——需要重写整个 Edge Function (它依赖 Anthropic/ChatCompletions API 格式) |
| Obsidian 集成 | 设计中有 | 尚未开始——需要插件开发技能 |
| Supabase DB | ⏸️ 延后 | 目前全部用 localStorage——无跨设备同步 |

---

## 四、优势：什么在正常工作

在指出张力之后——也需要反射架构中**已经稳固**的部分：

### 4.1 Edge Function 工程质量高

- `safeJSONParse` 4 层回退 + 截断补全：工程上很扎实
- `normalizeResponse` 颜色别名映射 + 重排序：防御性编程
- API 降级链 `for...continue` 模式：简洁且正确
- `extractJSON` 先找 code block 再找括号：经验上有效
- 这份代码经得起生产环境的意外

### 4.2 前端组件职责清晰

- `EditorWithGutter` + `GutterBlock` + `DiagnosisPanel` + `SignalBar` + `ColorBar` ——每个组件职责单一
- 六色信号通过 CSS 变量全局注入，视觉一致性通过设计系统保证
- 3-phase 状态机简单正确 (idle/analyzing/results_shown)
- 正交模式 (perspective/my_text) 处理得当——不影响核心分析流程

### 4.3 产品设计文档质量高

- G-1 焦距引擎规格：958 行，定义完整（分析入口→约束边界→输出模板→体裁适配），可以直接作为实现参考
- Hermes 全产品设计：16 章，从定位到开发阶段，全面覆盖
- 产品 MVP v3.1：三层结构设计，哲学底座扎实 (庄子+胡塞尔+皮尔士+禅宗+梅洛-庞蒂+巴赫金)
- 问题不是文档质量——是文档和代码之间的断层

### 4.4 CLAUDE.md 和 devlog 制度

- 单人项目中少见的纪律性文档实践
- "下一会话起点" 机制确保即使长时间中断也能恢复
- 暂缓清单 (DEFER-01~08) 防止 "忘了为什么没做"

---

## 五、建议的行动项

按优先级排序：

### P0 — 立即 (阻止进一步漂移)

1. **更新 architecture.md** — 反映实际技术栈 (React+Vite+Tailwind+Netlify+Supabase EF)，标注 v3.1 → Hermes 的演进
2. **废弃 implementation-plan.md** — 在文件顶部加注 "已被 Hermes Phase 2 替代，保留仅供历史参考"，防止未来误用
3. **决定 Skill 和 Web App 的关系** — 是继续独立演进（两个产品）还是统一（Skill 也走 Hermes 六色信号）

### P1 — 本周

4. **修复 JSON 截断的降级策略** — best-effort 模式：sentences 完整就返回，diagnosis 缺失用空占位而不是全部丢弃
5. **补充前端边界处理** — AbortController (中断请求)、QuotaExceededError (localStorage 满)、XSS sanitize (ReactMarkdown)
6. **UI 设计文档更新** — 记录当前的「温墨·纸本」设计系统和六色视觉语言

### P2 — 本月

7. **G-1 焦距引擎集成** — 至少集成到一个透镜文件作为试点 (推荐先做 narrative.md)，验证 "焦距章节" 的模板在实际运行中的效果
8. **成本可观测性** — Edge Function 记录每次调用使用的 Tier 和 token 消耗，前端或 Supabase Dashboard 可查看
9. **API 速率限制** — 至少加一个简单的基于 IP 的计数器 (Supabase Edge Function 可以用 Deno KV 或内存 Map)

### P3 — 考虑

10. **统一两个产品线** — 让 Skill 也输出结构化 JSON (至少可选)，让 Web App 也支持多轮对话 (至少 "换一个角度")
11. **隐私审计** — 逐行检查 Edge Function 日志和前端 console 是否泄露用户原文
12. **归档死路径** — 正式关闭 Phase D (微信) 和 Phase C (五状态组件)，清理 DEFER 列表

---

## 附录：文件交叉引用

| 文件 | 状态 | 被多少文件引用 | 建议 |
|------|------|--------------|------|
| architecture.md | 过时 | CLAUDE.md, implementation-plan.md | 重写 |
| implementation-plan.md | 被架空 | CLAUDE.md | 归档+加注 |
| ui-design.md | 过时 | CLAUDE.md | 重写 (记录温墨·纸本) |
| focal-engine-spec.md | 最新·未集成 | 0 (仅自身) | 集成到透镜文件 |
| action-sentence-templates.md | 最新·已集成 | 7 透镜文件 | 保持 |
| hermes-full-product-design.md | 最新 | CLAUDE.md | 保持 |
| 产品MVP方案-v3.md | 最新 (v3.1) | CLAUDE.md | 保持 — 但标注与 Hermes 的关系 |
| SKILL.md | 最新 (v5.0.2) | 7 透镜文件 + reference/ | 保持 — 考虑是否需要 Hermes 对齐 |
| hermes-diagnose/index.ts | 运行中 | web-app/src/lib/api.ts | 保持 — P0 修复截断 |
| anthropic-diagnose/index.ts | 保留兼容 | 无 (仅旧 diagnose() API) | 保留 — 至少一个版本 |
