# 市场调研报告 — 通用文本透视镜

> 日期：2026-06-29
> 目的：在 Skill 优先定位确立后，评估 Claude Code Skill 生态、竞品格局、目标用户与分发渠道
> 方法：WebSearch × 8 次，覆盖 Skill 生态、中文写作工具、国内 Claude Code 用户群、Open Design 渠道

---

## 一、Claude Code Skill 生态（2026年中）

### 规模

| 指标 | 数据 |
|------|------|
| 索引仓库 | 15,000+ |
| 最大市场 | Tons of Skills — 432 plugins, 2,769 skills, 297 agents |
| 中文技能合集 | claude-code-skills-zh — 340+ skills |
| 月度下载 | ~14,130 npm downloads (Tons of Skills) |
| 安装方式 | `/plugin install name@marketplace` 或手动复制到 `.claude/skills/` |

### 质量危机

- **22%** 的技能无法通过基础验证
- **52%** 的 skill tokens 是非功能性内容（license、构建产物、schema 文件）
- 生态共识：**编码团队自定义 skill 的 ROI 远高于堆砌社区通用 skill**

### 品类分布

生态以**开发者工具**为绝对主导：

| 品类 | 代表 | 占比估计 |
|------|------|---------|
| 代码审查 | commit-commands, pr-review-toolkit | ~35% |
| 测试/调试 | LSP 集成, perf-profiler | ~20% |
| Git 工作流 | git, branch-manager | ~15% |
| 文档/RFC | README writer, ADR | ~10% |
| CI/CD 部署 | deploy-checklists | ~8% |
| 写作/内容 | claude-writing-skills, ai-text-humaniser | ~5% |
| **文本分析/诊断** | **空位** | **~0%** |

> 🔑 **关键发现**：Claude Code Skill 生态里**不存在**中文写作诊断/分析类 Skill。现有写作相关 skill 全部是"辅助写作"（生成、润色、改写），没有任何一个是"反射分析"（镜子式诊断）。

---

## 二、竞品格局

### 2.1 Claude Code Skill 层（直接竞品）

| 项目 | Stars | 定位 | 与 text-lens 差异 |
|------|-------|------|-------------------|
| [claude-writing-skills](https://github.com/xiaomoBoy/claude-writing-skills) | 小型 | 长文写作工作流（素材→评分→改写→发布） | **替代写作**，不是反射分析 |
| [writing-assistant-skill](https://github.com/Agentchengfeng/writing-assistant-skill) | 小型 | 自媒体写作助手（选题→大纲→正文→标题） | **替写**，不是镜子 |
| [floodsung-skill](https://github.com/floodsung/floodsung-skill) | 小型 | 知乎语料人格克隆 | **风格复刻**，不是诊断 |
| [claude-code-skills-zh](https://github.com/laolaoshiren/claude-code-skills-zh) | 340+ skills | 中文开发者技能合集 | 全部是代码工具，无一写作分析 |

> 🔑 **空位确认**：X→Y→Z 诊断模型 + "镜子不是导师"定位 + 7 体裁透镜 + 11 铁律 — 在 Claude Code Skill 生态中**零竞争**。

### 2.2 Web 文本分析层（间接竞品）

| 产品 | 定位 | 与 text-lens 差异 |
|------|------|-------------------|
| 文修 (WenXiu) | 浏览器校对插件（语法/字词/标点） | 改错字，不做深层分析 |
| mAI Mind | 港大 K-12 作文评改系统 | 打分+纠错，教育场景 |
| 知网研学 | 学术论文 AI 写作平台 | 替写，学术场景 |
| paperwo | 论文查重+AIGC检测 | 检测，不是分析 |
| Hemingway App | 英文可读性分析 | 仅英文，仅可读性 |
| Grammarly | 英文语法+风格建议 | 仅英文，纠错导向 |

> 🔑 **差异化确认**：所有竞品要么是"纠错工具"，要么是"替写工具"。text-lens 的"镜子反射"——让用户看见文字里本已存在但他自己还没意识到的东西——在中文和英文市场都是**独一无二的定位**。

---

## 三、目标用户画像

### 3.1 国内 Claude Code 用户群

**规模信号**：
- 阿里云、华为云、腾讯云三个国内开发者社区均有 Claude Code 专题教程
- `claude-code-chinese/claude-code-guide` 专门的中文教程仓库
- 中转站（灵芽、API2D 等）市场需求旺盛，说明用户基数可观
- CC Switch 等国产模型适配工具的流行确认了用户存在

**用户特征推断**：
- 中文母语开发者 + 创作者
- 已解决 Claude Code 的国内访问问题（中转站/代理/国产模型）
- 技术能力强（能配置中转站的人不会是小白）
- 可能有写作需求（技术博客、文档、创意写作）

### 3.2 text-lens 理想用户

| 用户类型 | 场景 | 频率 |
|---------|------|------|
| 技术写作者 | 写技术博客/文档，想看清自己文字的隐藏结构 | 周级 |
| 创意写作者 | 写小说/散文/诗歌，需要镜子反射而非编辑建议 | 周级 |
| 内省型写作者 | 写日记/随笔，想通过文字理解自己的思维模式 | 日级 |
| Claude Code 重度用户 | 已经在用 Claude Code 写代码，自然延伸到写作 | 月级 |

### 3.3 用户获取路径

```
Claude Code 用户
  → 在 Claude Code 中自然发现或听说 /text-lens
  → 搜索 "Claude Code skills 写作"
  → GitHub 仓库 / Open Design marketplace
  → 一键安装 → 贴文字 → 看到反射 → 分享
```

---

## 四、分发渠道分析

### 4.1 Open Design（高优先）

| 维度 | 评估 |
|------|------|
| 规模 | 72.5k ⭐，Apache-2.0，259+ skills |
| 安装方式 | `od skill add https://github.com/dcctc5kf7z-byte/text-lens` |
| 适配成本 | ~30 分钟 — 添加 YAML frontmatter（`name` + `description` + `triggers` + `od.mode: utility`） |
| 竞品 | **零** — OD 目前无中文写作分析 skill |
| 风险 | OD 生态以设计模板为主（prototype/deck/image），utility 类 skill 曝光率待验证 |

**结论**：低成本、高杠杆。应该是 text-lens 的**第二个分发渠道**（GitHub 是第一渠道）。

### 4.2 Claude Code Plugin Marketplace（中优先）

| 维度 | 评估 |
|------|------|
| 入口 | 34+ curated marketplaces |
| 提交方式 | PR 到 marketplace 仓库（如 `claude-plugins-official`、`claude-plugins-community`） |
| 适配成本 | ~1-2 小时 — 需要 `.claude-plugin/plugin.json` + `marketplace.json` |
| 优势 | 内置在 Claude Code 中，`/plugin install` 即可 |
| 风险 | 需 Anthropic 审核（official marketplace）或社区安全筛查（community marketplace） |

**结论**：值得进入，但不是当前最紧急的。等 Skill 稳定到 v5.1 或 v6 后再提交。

### 4.3 GitHub（主渠道，已就绪）

| 维度 | 评估 |
|------|------|
| 仓库 | [text-lens](https://github.com/dcctc5kf7z-byte/text-lens) |
| 安装方式 | `git clone` → 复制到 `.claude/skills/writer/` |
| 发现性 | 依赖 README + 关键词搜索 + 社区推荐 |
| 现状 | **v5.0.2 已发布** |

**结论**：保持为主渠道。完善 README（增加截图、示例诊断、安装指南）。

---

## 五、竞争壁垒评估

| 壁垒 | 强度 | 说明 |
|------|------|------|
| X→Y→Z 方法论 | **高** | 不是 prompt engineering 能快速复制的——需要理解写作状态机、X→Y→Z 路由表、7 种体裁的焦距差异 |
| 7 体裁透镜 | **高** | 诗性/叙事/论述/技术/对话/个人/通用 — 每种体裁有独立的焦距优先级和动作句方向库，需要大量测试迭代 |
| 11 条铁律 | **中高** | 铁律是产品哲学的编码——"镜子不是导师""推≠替写""动作句优先"——竞品可以抄文案但抄不了执行细节 |
| G-1 焦距引擎 | **中** | 958 行规格已存在，但尚未集成到透镜——集成后壁垒大幅提升 |
| 中文优先 | **中** | 中文写作的独特性（意象密度、语气词、流水句）需要专门调校——英文竞品难以迁移 |
| 先发优势 | **中** | 第一个发布在 Claude Code Skill 生态的中文写作诊断工具——生态有记忆效应 |
| 网络效应 | **低** | 单人项目，无社区贡献者，无用户增长飞轮 |

---

## 六、风险与机会

### 机会

1. **蓝海窗口期** — Claude Code Skill 生态仍在早期（2025年10月插件系统才发布），中文写作诊断类目完全空白。窗口期预计 6-12 个月。
2. **Open Design 作为分发加速器** — 72.5k star 的生态，成为第一个中文写作分析 skill 可以借力
3. **国内 Claude Code 用户增长的顺风车** — 中转站降低门槛 → 用户基数增长 → skill 需求增长
4. **"反 AI 写作"趋势** — paperwo 的 AIGC 检测功能火爆（1M+ 用户）说明用户开始关注"AI 写了什么"而非"AI 帮我写"——text-lens 的"反射而非替代"恰好踩中这个趋势

### 风险

1. **Anthropic 可能推出官方写作 skill** — 一旦 Anthropic 下场，独立 skill 被挤压。缓解：聚焦中文 + 镜子差异化（Anthropic 大概率先做英文 + 替写）
2. **Claude Code 国内用户群可能不及预期** — 中转站不稳定的现实可能限制用户增长。缓解：Open Design 渠道覆盖全球用户
3. **Skill 分发路径分散** — GitHub + Open Design + Plugin Marketplace 三个渠道需要分别维护。缓解：优先 GitHub + OD，marketplace 后续再评估
4. **单人维护瓶颈** — 7 体裁透镜 + X→Y→Z 模型 + 持续测试 + 社区支持，一个人能否 hold 住？缓解：聚焦核心体裁（叙事/论述/个人），其余体裁渐进完善

---

## 七、战略建议

### 优先级

| 优先级 | 行动 | 理由 |
|--------|------|------|
| **P0** | 完成 Open Design 适配 | 30 分钟投入 → 72.5k 星渠道曝光，ROI 极高 |
| **P1** | SKILL.md 增强（示例诊断、中文触发词） | 提升发现性和首次使用体验 |
| **P1** | G-1 焦距引擎集成到 1-2 个核心透镜 | 叙事+论述先集成，形成壁垒后再扩展到其余透镜 |
| **P2** | text-lens 仓库 README 完善 | 截图、安装指南、对比竞品、示例输出 |
| **P2** | 社区推广 | 在 Claude Code 中文社区/微信群/即刻等渠道分享 |
| **P3** | Plugin Marketplace 提交 | 等 Skill 稳定后，提交到 community marketplace |
| **Watch** | Anthropic 官方写作 skill 动向 | 持续观察，调整差异化策略 |

### 不做的事

- ❌ 不做 Web 独立产品（红海，与 Skill 定位冲突）
- ❌ 不做"替写"功能（与镜子定位冲突）
- ❌ 不做英文优先（英文写作工具饱和）
- ❌ 不做移动 App（用户群在终端/IDE）

---

## 附录：信息来源

- [Claude Code Skills Marketplace — Ultimate Guide (skywork.ai)](https://skywork.ai/blog/claude-code-skills-market-ultimate-guide/)
- [Claude Code Skills Marketplace — Ultimate Guide (skywork.ai)](https://skywork.ai/blog/ai-bot/claude-code-skills-marketplace-ultimate-guide/)
- [7 Claude Code Plugins From the Marketplace Worth Your Time (securityboulevard.com)](https://securityboulevard.com/2026/06/7-claude-code-plugins-from-the-marketplace-worth-your-time/)
- [jeremylongshore/claude-code-plugins-plus-skills](https://github.com/jeremylongshore/claude-code-plugins-plus-skills)
- [laolaoshiren/claude-code-skills-zh](https://github.com/laolaoshiren/claude-code-skills-zh)
- [xiaomoBoy/claude-writing-skills](https://github.com/xiaomoBoy/claude-writing-skills)
- [Agentchengfeng/writing-assistant-skill](https://github.com/Agentchengfeng/writing-assistant-skill)
- [floodsung/floodsung-skill](https://github.com/floodsung/floodsung-skill)
- [nexu-io/open-design](https://github.com/nexu-io/open-design)
- [claude-code-chinese/claude-code-guide](https://github.com/claude-code-chinese/claude-code-guide)
- [Writing Your Own Claude Code Skill in 2026 (dev.to)](https://dev.to/alexcloudstar/writing-your-own-claude-code-skill-in-2026-the-practical-guide-2f24)
- [Customize Claude Code with plugins (claude.com)](https://claude.com/blog/claude-code-plugins)
