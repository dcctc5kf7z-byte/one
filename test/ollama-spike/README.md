# Ollama 可行性 Spike — Qwen 2.5 14B vs Claude Opus

> **目的**：判断 Qwen 2.5 14B（通过 Ollama 本地部署）能否承载 `/text-lens` 文本透视镜的推理负载。
> **若通过** → Skill 发布时包含 Ollama 本地部署方案。
> **若不通过** → Skill 仅标注"需要 Claude API"，并记录 Qwen 的具体不足点。

---

## 测试方法

### 模型对比

| 模型 | 通道 | 备注 |
|------|------|------|
| **Claude Opus 4.8** | 灵眸 API（已集成） | 基线：14/14 PASS (100%) |
| **Qwen 2.5 14B** | Ollama 本地 `qwen2.5:14b` | 待测试 |

### 测试语料

14 段文字 = 7 体裁 × 2 语言（中文 ZH + 英文 EN），全部来自 v5.0.1 冒烟测试的已验证用例。

| ID | 体裁 | 语言 | 字数 |
|----|------|------|------|
| T01 | 诗性/意象 | ZH | ~120 |
| T02 | Poetic | EN | ~130 |
| T03 | 叙事/故事 | ZH | ~180 |
| T04 | Narrative | EN | ~140 |
| T05 | 论述/观点 | ZH | ~200 |
| T06 | Argument | EN | ~170 |
| T07 | 技术/学术 | ZH | ~180 |
| T08 | Technical | EN | ~170 |
| T09 | 对话/交流 | ZH | ~150 |
| T10 | Dialogue | EN | ~130 |
| T11 | 日记/内省 | ZH | ~250 |
| T12 | Personal/Diary | EN | ~210 |
| T13 | 混合→通用 | ZH | ~170 |
| T14 | Mixed→General | EN | ~160 |

### Prompt 构造

每次测试向 Ollama 发送完整的 Skill prompt：

```
[System]
{SKILL.md 全文 (~170 行)} + {对应透镜文件全文} + {iron-laws.md 全文}

[User]
{测试文字}
```

这模拟了 `/text-lens` Skill 的完整加载路径——体裁预判交给模型自己完成（System Prompt 中已包含路由表）。

### 评估维度（7 维，与冒烟测试一致）

| 维度 | 标准 | 类型 |
|------|------|------|
| **G — 体裁判定** | 输出中体裁识别正确（或合理标注混合/不确定） | 一票否决 |
| **X — 表面效果** | 输出 1-3 个具体信号，锚定文本位置 | 通过/不通过 |
| **Y — 结构动力学** | 从 X 往下走一层，归因到适当的结构成因 | 通过/不通过 |
| **Z — 揭示与方向** | 指向已写出但未展开的东西，不替决定 | 通过/不通过 |
| **L — 语言一致** | 输出语言 = 输入语言，不引用外文术语 | 通过/不通过 |
| **W — 字数合规** | 中文 ≤500 字 / 英文 ≤250 词 | 通过/不通过 |
| **I — 铁律合规** | 无评价、替写、空鼓励、人格标签、命令语气 | 通过/不通过 |

**判定**：G 必须通过；X/Y/Z/L/W/I 中 ≥4/6 通过 → 整体 PASS。

### 通过标准（spike 判定）

**Spike 通过条件**：≥10/14 用例整体 PASS（~71%，对比 Claude 100% 基线）。

低于 Claude 基线是预期内的——核心问题是 Qwen 能否达到"有用"的门槛：
- ≥12/14 → 优秀，强烈推荐 Ollama 本地部署
- 10-11/14 → 可用，包含 Ollama 方案但标注限制
- 7-9/14 → 勉强可用，仅推荐高级用户尝试
- <7/14 → 不推荐，Skill 仅标注 Claude API

---

## 环境准备

### 1. 安装 Ollama

**Windows**：
```
# 下载安装包：https://ollama.com/download/windows
# 或通过 winget：
winget install Ollama.Ollama
```

**macOS**：
```
brew install ollama
```

**Linux**：
```
curl -fsSL https://ollama.com/install.sh | sh
```

**国内用户注意**：若 ollama.com 不可达，可能需要代理或从镜像下载。

### 2. 拉取模型

```bash
# Qwen 2.5 14B (~8.5GB, 4-bit quantized)
ollama pull qwen2.5:14b

# 可选：更小变体用于对比
ollama pull qwen2.5:7b     # ~4.5GB
ollama pull qwen2.5:32b    # ~19GB (需要 ≥32GB RAM)
```

### 3. 验证 Ollama 运行

```bash
ollama serve          # 启动服务（默认 http://localhost:11434）
ollama list           # 列出已安装模型
```

### 4. 设置环境变量

```bash
export OLLAMA_HOST="http://localhost:11434"   # Ollama API 地址
export OLLAMA_MODEL="qwen2.5:14b"            # 目标模型
```

---

## 运行测试

```bash
cd test/ollama-spike
chmod +x run-spike.sh
./run-spike.sh
```

脚本会：
1. 逐条加载 SKILL.md + 对应透镜 + iron-laws.md 组装 System Prompt
2. 调用 Ollama API 发送测试文字
3. 将输出保存到 `results/{ID}.md`
4. 生成汇总日志 `results/_summary.log`

### 运行后评估

```bash
node evaluate.mjs
```

评估脚本会：
1. 读取所有 `results/*.md` 输出
2. 逐条评估 7 个维度（G/X/Y/Z/L/W/I）
3. 生成对比报告 `results/_evaluation.md`
4. 输出 spike 结论（PASS/FAIL + 详细分析）

---

## 评估示例

对 T01（诗性 ZH）的 Claude 基线输出：

```
【体裁】诗性/意象文本（高）

"水在夜里站起来"——读者从第一句就被放进了不可能的情境。水、夜、站立三个日常词组的这个排列，让读者同时接收了"水"的柔软和"站"的骨感——这两个感觉在打架，但打架本身产生了注意力。

四个意象（站起的水、碎成鳞片的月光、裹着名字的鳞片、伸进水里探寻的手）从物的异化走向感官的蔓延再走向记忆的迷失——这是一条从外到内的路径，但第五句"不知道自己在找什么"之后，这个路径没有出口。意象链在第四句已经到达了"不记得"的核心——第五句的"不知道"是重复这个到达，不是推进它。

【特征】"站起来"和"凉"在不同句中形成垂直轴——身体从直立到被凉意攀爬，方向是向下的。这个下降运动没有被文本本身标注，但它是读者感受到的隐线。
```

Qwen 输出需要达到：体裁正确、锚定文本、归因结构、方向不替写、中文一致、字数合规、无违禁。

---

## 预期发现与风险

### 预期 Qwen 能做到的
- 体裁识别（模式匹配型任务）
- X 层表面效果描述（文本锚定）
- 语言一致性（中文→中文）

### 预期 Qwen 可能困难的
- Y 层深层结构归因（需要跨越性的推理）
- Z 层方向性语言（推≠替写、动作句优先——需要精确的语气控制）
- 铁律 #9/#10 的一致性执行
- 英文输出质量（训练数据以中文为主）

### 已知风险
- Qwen 2.5 14B 在复杂指令遵循上弱于 Claude Opus
- 本地推理速度：14B 模型在 16GB RAM + 无 GPU 环境下每次诊断 ~2-5 分钟
- 输出格式漂移：可能不遵守"先体裁后诊断"的结构

---

## 文件清单

```
test/ollama-spike/
├── README.md              # 本文件 — 方法与标准
├── test-texts.json        # 14 条测试用例（含预期体裁）
├── run-spike.sh           # 测试执行脚本
├── evaluate.mjs           # 评估脚本
└── results/               # 输出目录（gitignore）
    ├── T01.md ~ T14.md    # 单条输出
    ├── _summary.log       # 运行日志
    └── _evaluation.md     # 评估报告
```
