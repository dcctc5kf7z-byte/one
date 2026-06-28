#!/usr/bin/env bash
# ============================================================
# Hermes 诊断 — Edge Function 冒烟测试
# Phase 2 — 7 体裁 × 2 语言 = 14 段文本
# ============================================================
set -euo pipefail

ENDPOINT="${ENDPOINT:-https://fdhqqebbfbxisnnmyerg.supabase.co/functions/v1/hermes-diagnose}"
ANON_KEY="${ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaHFxZWJiZmJ4aXNubm15ZXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzM3MTksImV4cCI6MjA5Nzk0OTcxOX0.x4-SBO6wVy4no3beJGtAYCkWRK6IXGznXasywoWC4t8}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
TOTAL=0

echo "══════════════════════════════════════════════"
echo "  Hermes Edge Function — 14 文本冒烟测试"
echo "══════════════════════════════════════════════"
echo ""
echo "  端点: ${ENDPOINT}"
echo ""

# ── 测试用例 ──
# 格式: "ID|Genre|Lang|Text" (用 | 分隔)

declare -a TESTS=(
'T01|poetic|ZH|水在夜里站起来。\n不是浪——是站。像一个睡了太久的人忽然直起身，骨头一节一节地响。\n月光照在上面，碎成鳞片。每一片都裹着一个没说完的名字。\n你把手伸进去，指尖先凉，然后是手心，然后是手腕——等凉到肘弯的时候，你忽然不记得自己在找什么了。'
'T02|poetic|EN|The rain has a name here.\nThey say it before sleep — a syllable that turns the windows damp, that fills the gutters with the sound of someone shuffling cards.\nI have tried to learn it. My mouth shapes the first letter and the air goes still, as if the house itself is holding breath.\nMaybe names are not for saying. Maybe they are for carrying, the way this town carries the rain: without comment, without complaint, into the long green afternoon.'
'T03|narrative|ZH|李建国蹲在田埂上，把最后一根烟抽到过滤嘴。太阳已经沉到山背后去了，他脚边的影子拉得很长，和玉米秆的影子搅在一起。\n\n"爸——"儿子在院子里喊，"电话！"\n\n他没应。电话是镇上打来的，他知道是什么事。一个星期前，推土机进了村东头的那片柿子林。他爷爷种的树，他爹浇过的树，他爬过的树。现在推掉了。\n\n烟头扔在地上，他用鞋底碾了又碾，碾出一个坑。然后站起来，膝盖咔嚓响了一声。他忽然想不起来自己今年多少岁了。'
'T04|narrative|EN|She found the photograph in a box of Christmas ornaments, of all places. Her mother at twenty-two, standing next to a man who was not her father. The man'\''s hand rested on her mother'\''s shoulder with a familiarity that made Sarah'\''s stomach tighten.\n\nShe turned the photo over. On the back, in blue ink faded to a whisper: M. and me, July 1968. The last good day.\n\nSarah had never heard of M. Her mother had been dead for six years. She put the photo in her pocket and closed the box. The ornaments could wait.'
'T05|argument|ZH|说"写作不能教"的人，通常是在混淆两个概念：技巧和天赋。技巧当然可以教——如何搭建段落、如何控制节奏、如何让一个比喻不只是装饰而成为结构的关节——这些都是可拆解、可练习、可迁移的东西。天赋不能教，但天赋本来也不需要教。\n\n真正的问题是：为什么这么多人坚持"写作不能教"？因为这让他们舒服。如果写作是不可传授的神秘天赋，那么写不好就不是你的责任——是命。反之，如果写作可以学，那么你写不好，就是你还没学。后者不舒服，但后者给了你路。'
'T06|argument|EN|The argument that remote work "weakens company culture" mistakes proximity for connection. Culture is not the free snacks in the break room. Culture is the set of shared assumptions about what constitutes good work, honest feedback, and fair treatment.\n\nThose assumptions do not require a shared physical space to form. They require shared experiences of collaboration, conflict, and resolution — all of which happen routinely in well-run remote teams. What weakens culture is not distance. It is the absence of deliberate communication. And that absence can happen just as easily three desks apart as three time zones apart.'
'T07|technical|ZH|Transformer 架构的核心创新在于用自注意力机制替代了递归。在 RNN 中，位置 t 的隐藏状态依赖于位置 t-1 的隐藏状态，这形成了顺序瓶颈——无法并行计算，且长距离依赖会随序列长度衰减。\n\n自注意力通过计算每个位置对所有其他位置的加权求和，一次性解决了这两个问题。具体而言，给定输入序列 X ∈ R^{n×d}，自注意力先通过三个线性投影得到 Q、K、V，再计算 softmax(QK^T/√d_k)V。复杂度 O(n²d) 取代了 RNN 的 O(nd²)，在 n ≪ d 时是可行的权衡。'
'T08|technical|EN|The PostgreSQL query planner uses a cost-based model to select execution strategies. For each query, the planner enumerates possible scan methods — sequential scan, index scan, bitmap index scan — and join orders, assigns an estimated cost to each, and selects the cheapest plan.\n\nThe cost estimates derive from table statistics stored in pg_statistic: row counts, value distributions, and correlation between physical row order and column values. When these statistics are stale — typically because an autovacuum has not run after a large INSERT or UPDATE — the planner'\''s estimates diverge from reality, and query performance can degrade by orders of magnitude. Running ANALYZE manually on affected tables is the first diagnostic step.'
'T09|dialogue|ZH|"你昨天去哪儿了。"\n"没去哪儿。"\n"'\''没去哪儿'\''是哪儿。"\n"就……出去走了走。"\n"走了走。走了三个小时。手机也不接。"\n"手机没电了。"\n"你每次说手机没电的时候，眼睛都往左边看。"\n"——你什么意思？"\n"没什么意思。我就是说，你每次说手机没电的时候，眼睛都往左边看。这句话本身已经是全部意思了。"'
'T10|dialogue|EN|"You'\''re quiet tonight."\n"I'\''m always quiet."\n"No. You'\''re quiet-quiet. There'\''s a difference."\n"There really isn'\''t."\n"See, that — that right there. Three words and a period. When you'\''re normal-quiet you at least give me a full sentence."\n"Maybe I don'\''t have a full sentence."\n"Or maybe you have too many and you'\''re picking the shortest one so you don'\''t have to say the rest."\n*silence.*\n"That'\''s what I thought."'
'T11|personal|ZH|今天下午在阳台上站了很久。不是因为有什么事发生——恰恰相反，是因为什么都没发生。我盯着对面楼的空调外机，看着它转，听着它的嗡嗡声，忽然觉得这个嗡嗡声已经响了整个夏天，而我直到今天才真正听见它。\n\n这让我有点害怕。不是害怕听不见空调声，是害怕还有多少东西是我每天经过、每天使用、每天和它共存，却从来没有真正"听见"的。包括我自己说的话。包括那些我以为我在认真听别人说话的时刻——我到底听到了多少，又有多少只是在我脑子里放了一遍我自己的预判？\n\n我不知道。这个"不知道"让我不舒服。但至少我现在知道我不知道了。这算进步吗。'
'T12|personal|EN|I'\''ve been avoiding my desk for three days now. Not avoiding work — I'\''ve done plenty of work, on the couch, at the kitchen table, once in a coffee shop where the music was too loud and I stayed for four hours anyway. Avoiding the desk specifically. The chair. The way the lamp casts a shadow that makes the keyboard look like it'\''s waiting for something I can'\''t give it.\n\nI think I know what this is. I finished the draft two weeks ago and told everyone I was "letting it rest." But the truth is I'\''m afraid to open it. Because if it'\''s bad — really bad, not just needs-editing bad — then the past six months were a detour I can'\''t afford. And if it'\''s good? Then I have to write the next one. And I don'\''t know if I can.\n\nThe desk sits there. The lamp stays on. I'\''ll go back tomorrow. Probably.'
'T13|general|ZH|朋友问我为什么要搬家。我说因为窗外的树被砍了。她说一棵树而已。\n\n不是一棵树而已。那棵树在我窗外站了七年。我看着它从一个瘦弱的、连鸟都不愿意落的细杆子，长到能遮住对面整栋楼的广告牌。去年夏天，一只斑鸠在它第四个分叉处搭了窝。\n\n城市规划局说它"根系侵入地下管道"。我理解。我甚至同意。但问题是——人类发明"规划"这个词的时候，有没有给"看着一棵树长大"这件事预留一个位置？\n\n如果没有，那我想规划的就不是我家的位置，是我该住在什么样的秩序里。'
'T14|general|EN|I have been thinking about the word "enough."\n\nIt'\''s a shape-shifter. In "good enough," it'\''s a ceiling — stop here, don'\''t push further. In "enough already," it'\''s a hand raised against more. In "that'\''s enough for today," it'\''s permission. Same word, three different faces.\n\nMy father used it as a blade. "You'\''re not trying hard enough." My mother used it as a blanket. "You'\''ve done enough, come eat." Thirty years later, I still can'\''t hear the word without hearing both of them, and I still can'\''t decide which one was right.\n\nMaybe both. Maybe neither. Maybe "enough" is just the word we borrow when we want the world to stop moving, even though we know it won'\''t.'
)

# ── 运行测试 ──
for test_line in "${TESTS[@]}"; do
  TOTAL=$((TOTAL + 1))

  # 解析字段
  IFS='|' read -r tid genre lang text <<< "$test_line"

  # 构造请求体
  TMP=$(mktemp)
  printf '{"text":%s,"mode":"perspective"}' "$(echo "$text" | jq -Rs .)" > "$TMP"

  echo -ne "  [${TOTAL}/14] ${tid} ${genre}/${lang} ... "

  # 发送请求
  RESP=$(curl -s --max-time 120 \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    --data-binary "@$TMP" 2>&1)

  rm -f "$TMP"

  # ── 验证 ──
  if [ -z "$RESP" ]; then
    echo -e "${RED}FAIL${NC} (无响应)"
    FAIL=$((FAIL + 1))
    continue
  fi

  # 检查是否有 error
  if echo "$RESP" | jq -e '.error' > /dev/null 2>&1; then
    ERR_MSG=$(echo "$RESP" | jq -r '.error')
    echo -e "${RED}FAIL${NC} (${ERR_MSG})"
    FAIL=$((FAIL + 1))
    continue
  fi

  # 验证结构：sentences 数组
  SEN_COUNT=$(echo "$RESP" | jq -r '.sentences | length' 2>/dev/null)
  if [ -z "$SEN_COUNT" ] || [ "$SEN_COUNT" = "null" ]; then
    echo -e "${RED}FAIL${NC} (缺 sentences)"
    FAIL=$((FAIL + 1))
    continue
  fi

  # 验证结构：gutter_blocks 数组
  GUT_COUNT=$(echo "$RESP" | jq -r '.gutter_blocks | length' 2>/dev/null)
  if [ -z "$GUT_COUNT" ] || [ "$GUT_COUNT" = "null" ]; then
    echo -e "${RED}FAIL${NC} (缺 gutter_blocks)"
    FAIL=$((FAIL + 1))
    continue
  fi

  # 验证结构：diagnosis.analysis + diagnosis.push
  DIAG_ANALYSIS=$(echo "$RESP" | jq -r '.diagnosis.analysis' 2>/dev/null)
  DIAG_PUSH=$(echo "$RESP" | jq -r '.diagnosis.push' 2>/dev/null)
  if [ "$DIAG_ANALYSIS" = "null" ] || [ -z "$DIAG_ANALYSIS" ]; then
    echo -e "${RED}FAIL${NC} (缺 diagnosis.analysis)"
    FAIL=$((FAIL + 1))
    continue
  fi
  if [ "$DIAG_PUSH" = "null" ] || [ -z "$DIAG_PUSH" ]; then
    echo -e "${RED}FAIL${NC} (缺 diagnosis.push)"
    FAIL=$((FAIL + 1))
    continue
  fi

  # 验证 meta
  ENDPOINT_USED=$(echo "$RESP" | jq -r '.meta.endpoint' 2>/dev/null)

  # 验证 sentences 中每个句子有 colors 和 analysis
  SENT_VALID=true
  for i in $(seq 0 $((SEN_COUNT - 1))); do
    S_COLORS=$(echo "$RESP" | jq -r ".sentences[$i].colors" 2>/dev/null)
    if [ "$S_COLORS" = "null" ] || [ -z "$S_COLORS" ]; then
      SENT_VALID=false
      break
    fi
  done

  if ! $SENT_VALID; then
    echo -e "${RED}FAIL${NC} (sentences[i].colors 缺失)"
    FAIL=$((FAIL + 1))
    continue
  fi

  echo -e "${GREEN}PASS${NC} (${SEN_COUNT} 句, ${GUT_COUNT} 行 gutter, ${ENDPOINT_USED})"
  PASS=$((PASS + 1))
done

# ═══════════════════════════════════════════════
echo ""
echo "──────────────────────────────────────────────"
echo -e "  通过: ${GREEN}${PASS}${NC} / 失败: ${RED}${FAIL}${NC} / 共计: ${TOTAL}"
echo ""
if [ $PASS -eq $TOTAL ]; then
  echo -e "  ${GREEN}${BOLD}✅ 全部通过！${NC}"
else
  echo -e "  ${RED}${BOLD}❌ ${FAIL} 项失败${NC}"
fi
echo "──────────────────────────────────────────────"
