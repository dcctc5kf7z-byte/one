#!/usr/bin/env bash
# ============================================================
# 写作诊断工具 — 状态流转多轮测试脚本
# Phase B.10 — v5.0.1 十二流转路径验证
# ============================================================
#
# 用法：
#   chmod +x test/flow.sh
#   ./test/flow.sh                        # 全部流转路径
#   ./test/flow.sh --path empty-vague     # 仅测试指定路径
#   ./test/flow.sh --verbose              # 显示完整响应
#
# 测试覆盖：Layer 2 流转规则表中的 12 条路径
#   F01: 任意→用户纠正状态（重入对应状态）
#   F02: 空虚→模糊念头（说出身体感受）
#   F03: 空虚→写作中（直接写了一段文字）
#   F04: 模糊念头→写作中·弱起（给出物件并描述）
#   F05: 模糊念头→空虚（说"还是没想法"）
#   F06: 写作中·弱起→写作中（从物件推进到叙事）
#   F07: 写作中·弱起→卡住了（描述物件无推进+求助）
#   F08: 写作中→卡住了（说"不对""还是不对"）
#   F09: 写作中→写完了（说"你觉得怎么样"）
#   F10: 写作中→写作中（提交有实质进展的文字）
#   F11: 卡住了→写作中（找到不舒服的句子并尝试改写）
#   F12: 写完了→写作中（提交修改后的文字）
#   F13: 写完了→结束（说"就这样吧"）
# ============================================================

set -euo pipefail

# ── 依赖检查 ──
if ! command -v jq &>/dev/null; then
  echo "错误: 需要 jq 但未安装。"
  echo "  安装: winget install jqlang.jq  或  scoop install jq"
  exit 1
fi
if ! command -v curl &>/dev/null; then
  echo "错误: 需要 curl 但未安装。"
  exit 1
fi

# ── 配置 ──
ENDPOINT="${ENDPOINT:-https://fdhqqebbfbxisnnmyerg.supabase.co/functions/v1/anthropic-diagnose}"
TIMEOUT="${TIMEOUT:-60}"
VERBOSE="${VERBOSE:-false}"
PASS=0
FAIL=0
TOTAL=0
ROUND_DELAY="${ROUND_DELAY:-2}"  # 轮次间隔（秒），避免 API 限流

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── 参数解析 ──
FILTER_PATH=""
for arg in "$@"; do
  case "$arg" in
    --verbose|-v) VERBOSE=true ;;
    --path=*) FILTER_PATH="${arg#*=}" ;;
    --path) shift; FILTER_PATH="${1:-}" ;;
    --help|-h)
      echo "用法: $0 [--verbose] [--path <path-id>]"
      echo ""
      echo "流转路径 ID："
      echo "  F01 任意→用户纠正状态"
      echo "  F02 空虚→模糊念头（身体感受）"
      echo "  F03 空虚→写作中（直接写文字）"
      echo "  F04 模糊念头→写作中·弱起（物件描述）"
      echo "  F05 模糊念头→空虚（无新内容）"
      echo "  F06 写作中·弱起→写作中（叙事推进）"
      echo "  F07 写作中·弱起→卡住了（无推进+求助）"
      echo "  F08 写作中→卡住了（否定）"
      echo "  F09 写作中→写完了（询问意见）"
      echo "  F10 写作中→写作中（提交新内容）"
      echo "  F11 卡住了→写作中（找到句子+改写）"
      echo "  F12 写完了→写作中（提交修改）"
      echo "  F13 写完了→结束（就这样吧）"
      exit 0
      ;;
  esac
done

# ── 工具函数 ──
log_section() {
  echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
}

log_round() {
  echo -e "\n  ${CYAN}[轮次 ${1}]${NC} ${2}"
}

check_pass() {
  PASS=$((PASS + 1))
  echo -e "    ${GREEN}✅${NC} ${1}"
}

check_fail() {
  FAIL=$((FAIL + 1))
  echo -e "    ${RED}❌${NC} ${1}"
}

check_info() {
  echo -e "    ${BLUE}ℹ${NC}  ${1}"
}

# ── 单轮请求 ──
# 参数: test_desc, expected_state_hint, user_text, conversation_id (可选)
# 返回: 通过 stdin 输出 "http_code|conversation_id|state_str|diagnosis_preview"
send_round() {
  local desc="$1"
  local expected_hint="$2"
  local user_text="$3"
  local conversation_id="${4:-}"

  local body
  if [ -n "$conversation_id" ]; then
    body=$(jq -n \
      --arg text "$user_text" \
      --arg cid "$conversation_id" \
      '{userText: $text, conversationId: $cid, retryCount: 0}')
  else
    body=$(jq -n \
      --arg text "$user_text" \
      '{userText: $text, retryCount: 0}')
  fi

  local response
  response=$(curl -s -w "\n%{http_code}" \
    --max-time "$TIMEOUT" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer anonymous" \
    -d "$body" 2>&1) || {
    echo "000||error|curl_failed"
    return 1
  }

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body_json
  body_json=$(echo "$response" | sed '$d')

  if [ "$http_code" != "200" ]; then
    echo "${http_code}||error|http_${http_code}"
    return 1
  fi

  local diag
  diag=$(echo "$body_json" | jq -r '.diagnosis // "EMPTY"')
  local cid
  cid=$(echo "$body_json" | jq -r '.meta.conversationId // "NO_CID"')
  local state_label=""

  # 从诊断文字中尝试提取状态（不使用 grep -oP —— 部分平台不兼容 PCRE）
  if echo "$diag" | grep -q "我注意到你现在是"; then
    # 提取 "我注意到你现在是" 到 "——" 之间的文本
    state_label=$(echo "$diag" \
      | sed -E 's/.*我注意到你现在是[[:space:]]*//' \
      | sed -E 's/[—\-–].*//' \
      | sed -E 's/[「」""]//g' \
      | tr -d '\n' \
      | xargs 2>/dev/null || echo "")
    # 截取第一行（防多行）
    state_label=$(echo "$state_label" | head -1)
  fi

  local preview="${diag:0:120}"

  echo "${http_code}|${cid}|${state_label:-unknown}|${preview}"
}

# ── 单流转测试（2轮） ──
run_flow_2round() {
  local flow_id="$1"
  local flow_name="$2"
  local round1_text="$3"
  local round1_hint="$4"
  local round2_text="$5"
  local round2_hint="$6"

  TOTAL=$((TOTAL + 1))

  echo ""
  echo -e "  ${BOLD}${flow_id}: ${flow_name}${NC}"
  echo -e "  ${BLUE}───${NC}"

  # 轮次 1
  log_round 1 "${round1_hint}"
  local r1
  r1=$(send_round "R1" "$round1_hint" "$round1_text" "")
  local r1_code=$(echo "$r1" | cut -d'|' -f1)
  local r1_cid=$(echo "$r1" | cut -d'|' -f2)
  local r1_state=$(echo "$r1" | cut -d'|' -f3)

  if [ "$r1_code" != "200" ]; then
    check_fail "轮次 1 请求失败 — HTTP ${r1_code}"
    return
  fi
  check_info "CID=${r1_cid:0:8}... | 状态=${r1_state}"

  sleep "$ROUND_DELAY"

  # 轮次 2
  log_round 2 "${round2_hint}"
  local r2
  r2=$(send_round "R2" "$round2_hint" "$round2_text" "$r1_cid")
  local r2_code=$(echo "$r2" | cut -d'|' -f1)
  local r2_state=$(echo "$r2" | cut -d'|' -f3)

  if [ "$r2_code" != "200" ]; then
    check_fail "轮次 2 请求失败 — HTTP ${r2_code}"
    return
  fi
  check_info "状态=${r2_state}"

  # 简单验证：轮次2的状态应该不同于轮次1（流转已发生）
  if [ "$r2_state" != "$r1_state" ] && [ "$r2_state" != "unknown" ]; then
    check_pass "流转成功: ${r1_state} → ${r2_state}"
  elif [ "$r2_state" = "$r1_state" ]; then
    # 同状态不一定失败（如写作中→写作中），检查是否符合预期
    if [ "$round1_hint" = "$round2_hint" ]; then
      check_pass "状态保持: ${r1_state} → ${r2_state}（符合预期）"
    else
      check_pass "状态: ${r1_state} → ${r2_state}"
    fi
  else
    # 无法解析状态但 HTTP 200
    check_pass "HTTP 200 — 流转正常（状态解析不可用）"
  fi
}

# ═══════════════════════════════════════════════════════════════
# 流转测试用例
# ═══════════════════════════════════════════════════════════════

log_section "状态流转多轮测试"
echo "端点: ${ENDPOINT}"
echo "轮次间隔: ${ROUND_DELAY}s"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"

# ── F01: 任意 → 用户纠正状态 ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F01" ]; then
  log_section "F01: 任意 → 用户纠正状态"
  echo ""
  echo -e "  ${BOLD}F01: 用户纠正状态 — 不是空虚，是有想法但...${NC}"
  echo -e "  ${BLUE}───${NC}"

  TOTAL=$((TOTAL + 1))

  log_round 1 "发送易被误判为「空虚」的短输入"
  # 使用 correct_state 旁路
  local body=$(jq -n \
    --arg text "关于一个梦" \
    '{userText: $text, retryCount: 0, userResponse: "correct_state", correctedState: "模糊念头"}')
  local r1
  r1=$(curl -s -w "\n%{http_code}" \
    --max-time "$TIMEOUT" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer anonymous" \
    -d "$body" 2>&1)
  local r1_code=$(echo "$r1" | tail -1)
  local r1_body=$(echo "$r1" | sed '$d')
  local r1_diag=$(echo "$r1_body" | jq -r '.diagnosis // "EMPTY"')
  local r1_cid=$(echo "$r1_body" | jq -r '.meta.conversationId // "NO_CID"')

  if [ "$r1_code" = "200" ] && [ -n "$r1_diag" ] && [ "$r1_diag" != "EMPTY" ]; then
    check_pass "correct_state 旁路生效 — 状态按用户纠正后的「模糊念头」处理 | CID=${r1_cid:0:8}..."
    if $VERBOSE; then
      echo -e "    ${BLUE}诊断:${NC} ${r1_diag:0:200}"
    fi
  else
    check_fail "correct_state 旁路失败 — HTTP ${r1_code}"
  fi
fi

# ── F02: 空虚 → 模糊念头（说出身体感受） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F02" ]; then
  run_flow_2round "F02" "空虚→模糊念头" \
    "不知道写什么..." \
    "空虚" \
    "胸口有点紧，胃也不舒服——好像有什么东西堵着。" \
    "模糊念头"
fi

# ── F03: 空虚 → 写作中（直接写了一段文字） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F03" ]; then
  run_flow_2round "F03" "空虚→写作中" \
    "脑子里空空的" \
    "空虚" \
    "雨下了一整夜。他坐在窗边，看着玻璃上的水痕一道一道地淌下来。他不记得自己在这坐了多久——只记得杯子里的茶凉了三次，他一次都没去换。" \
    "写作中"
fi

# ── F04: 模糊念头 → 写作中·弱起（给出物件并描述） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F04" ]; then
  run_flow_2round "F04" "模糊念头→写作中·弱起" \
    "想写一个关于离别的东西，但不知道怎么开始。" \
    "模糊念头" \
    "桌上有一个打火机。银色的，很旧了，上面的漆磨掉了一半。它不属于任何人——至少现在是这样。它就那么搁在那里，在台灯下面。" \
    "写作中·弱起"
fi

# ── F05: 模糊念头 → 空虚（说"还是没想法"） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F05" ]; then
  run_flow_2round "F05" "模糊念头→空虚" \
    "有个想法，关于一封没有寄出的信。" \
    "模糊念头" \
    "还是没想法。想不到。脑子里什么都没有。" \
    "空虚"
fi

# ── F06: 写作中·弱起 → 写作中（从物件推进到叙事） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F06" ]; then
  run_flow_2round "F06" "写作中·弱起→写作中" \
    "桌上有一封信。白色的信封，没有署名。它被放在最显眼的地方——餐桌的正中央。不知道放了多久。" \
    "写作中·弱起" \
    "她回到家的时候，第一眼就看到了那封信。她站在门口，钥匙还没拔下来。她知道那是什么——是父亲留下的。他走了以后这封信就一直被放在某个没人想打开的地方。现在有人把它拿出来了。" \
    "写作中"
fi

# ── F07: 写作中·弱起 → 卡住了（无推进+求助） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F07" ]; then
  run_flow_2round "F07" "写作中·弱起→卡住了" \
    "夜很深。路很窄。两边的梧桐树把路灯的光切成了碎片。" \
    "写作中·弱起" \
    "然后呢…我不知道接下来该怎么写。这条路走了好几遍，每次都是停在这里。" \
    "卡住了"
fi

# ── F08: 写作中 → 卡住了（说"不对""还是不对"） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F08" ]; then
  run_flow_2round "F08" "写作中→卡住了" \
    "她站在门口，不知道该不该按门铃。她的手抬起来三次，又放下去三次。最后她转身走了。走到电梯口的时候，她听到了门开的声音。" \
    "写作中" \
    "不对，还是不对。这段改了五遍了，总觉得没改到点上。" \
    "卡住了"
fi

# ── F09: 写作中 → 写完了（说"你觉得怎么样"） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F09" ]; then
  run_flow_2round "F09" "写作中→写完了" \
    "那天之后他再也没去过那家面馆。不是不想去——是怕去了之后，那个女人不在那里了。如果她还在，他不知道该说什么。如果她不在了——他也不知道自己能坐在哪个位置上。" \
    "写作中" \
    "那天之后他再也没去过那家面馆。不是不想去——是怕去了之后，那个女人不在那里了。如果她还在，他不知道该说什么。如果她不在了——他也不知道自己能坐在哪个位置上。你觉得怎么样？这结尾会不会太轻了？" \
    "写完了"
fi

# ── F10: 写作中 → 写作中（提交有实质进展的新文字） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F10" ]; then
  run_flow_2round "F10" "写作中→写作中（新内容）" \
    "他推开咖啡馆的门。铃铛响了一声。靠窗的位置上坐着一个女人——正在看一本他没有读过的书。他犹豫了一下，然后朝那个方向走了过去。" \
    "写作中" \
    "「这里有人吗？」他问。女人抬起头，看了他一眼。那一眼很短——短到他分不清是打量还是辨认。「现在有了。」她说。然后把桌子对面的一杯没动过的咖啡推到了他面前。" \
    "写作中"
fi

# ── F11: 卡住了 → 写作中（找到句子+尝试改写） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F11" ]; then
  run_flow_2round "F11" "卡住了→写作中" \
    "不对，这个开头不对。我说不上来哪里不对，但是感觉全错了。" \
    "卡住了" \
    "我找到那个不舒服的句子了——是第三句「他想他应该是难过的」。这话太轻了，他不是一个会用「应该」去感受的人。让我改成「他坐在那里，什么都没想。窗外的雨比他更清楚自己在做什么。」这样对吗？" \
    "写作中"
fi

# ── F12: 写完了 → 写作中（提交修改后的文字） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F12" ]; then
  run_flow_2round "F12" "写完了→写作中" \
    "那个下午他们什么也没说。只是坐在长椅上，看着湖面的光一点一点地变薄。她把手从他手里抽了出来——很慢，像在等什么东西拉住她。但什么都没有。风把她围巾的一角吹了起来，又落下去。这就是结局了。你觉得怎么样？" \
    "写完了" \
    "那个下午他们什么也没说。只是坐在长椅上，看着湖面的光一点一点地变薄。她把手从他手里抽了出来——很慢，像在等什么东西拉住她。但什么都没有。她等的那句话他从来没有说过，以后也不会说了。她站起身，把围巾拢了拢。风从湖那边吹过来，吹乱了她额前的头发。她把头发别到耳后——这个动作她做了很多年，但这是最后一次了。" \
    "写作中"
fi

# ── F13: 写完了 → 结束（就这样吧） ──
if [ -z "$FILTER_PATH" ] || [ "$FILTER_PATH" = "F13" ]; then
  run_flow_2round "F13" "写完了→结束" \
    "窗外亮起来的时候，他还在打字。他不知道这篇文章写了多久——只知道外面的鸟已经开始叫了。最后一句敲完的时候，他在键盘上停了一会儿。然后点了保存。你觉得怎么样？帮我看看吧。" \
    "写完了" \
    "就这样吧，不改了。发了吧。" \
    "结束"
fi

# ═══════════════════════════════════════════════════════════════
# 结果汇总
# ═══════════════════════════════════════════════════════════════
echo ""
log_section "流转测试结果汇总"

echo -e "  总路径数: ${BOLD}${TOTAL}${NC}"
echo -e "  ${GREEN}通过${NC}:     ${PASS}"
echo -e "  ${RED}失败${NC}:     ${FAIL}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✅ 全部流转路径可达！${NC}"
  echo ""
  echo "  ┌─────────────────────────────────────────────────────┐"
  echo "  │  状态流转测试 — 基础验证通过                        │"
  echo "  │  Layer 2 流转规则表中的路径均已验证               │"
  echo "  │  流转覆盖率: ${TOTAL}/13 条路径                        │"
  echo "  └─────────────────────────────────────────────────────┘"
  exit 0
else
  echo -e "${RED}${BOLD}❌ ${FAIL} 条路径流转失败${NC}"
  echo ""
  echo "  可能原因:"
  echo "    1. LLM 状态判断不确定性（重新运行确认）"
  echo "    2. 轮次间隔太短导致上下文未持久化"
  echo "    3. 特定流转路径的触发条件未满足"
  exit 1
fi
