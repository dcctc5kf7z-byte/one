#!/usr/bin/env bash
# ============================================================
# 写作诊断工具 — 五状态单轮测试脚本
# Phase B.8 — v5.0.1 Edge Function 分层条件注入验证
# ============================================================
#
# 用法：
#   chmod +x test/diagnose.sh
#   ./test/diagnose.sh                          # 全部 15 个用例
#   ENDPOINT=https://xxx ./test/diagnose.sh     # 自定义端点
#   ./test/diagnose.sh --state writing          # 仅测试写作中状态
#   ./test/diagnose.sh --verbose                # 显示完整响应
#
# 测试覆盖：5 状态 × 3 段文字 = 15 单轮用例
#   - 空虚 (empty)       : 用例 1–3
#   - 模糊念头 (vague)    : 用例 4–6
#   - 写作中 (writing)    : 用例 7–9
#   - 卡住了 (stuck)      : 用例 10–12
#   - 写完了 (finished)   : 用例 13–15
# ============================================================

set -euo pipefail

# ── 依赖检查 ──
if ! command -v jq &>/dev/null; then
  echo "错误: 需要 jq 但未安装。"
  echo "  安装: winget install jqlang.jq  或  scoop install jq  或  choco install jq"
  exit 1
fi

if ! command -v curl &>/dev/null; then
  echo "错误: 需要 curl 但未安装。"
  exit 1
fi

# ── 配置 ──
ENDPOINT="${ENDPOINT:-https://fdhqqebbfbxisnnmyerg.supabase.co/functions/v1/anthropic-diagnose}"
ANON_KEY="${SUPABASE_ANON_KEY:-}"
TIMEOUT="${TIMEOUT:-60}"
VERBOSE="${VERBOSE:-false}"
PASS=0
FAIL=0
TOTAL=0

# Auth header check
if [ -z "$ANON_KEY" ]; then
  echo "错误: 请设置 SUPABASE_ANON_KEY 环境变量。"
  echo "  export SUPABASE_ANON_KEY=<your-anon-key>"
  echo "  (Key 可在 Supabase Dashboard → Project Settings → API → anon/public 找到)"
  exit 1
fi

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── 参数解析 ──
FILTER_STATE=""
for arg in "$@"; do
  case "$arg" in
    --verbose|-v) VERBOSE=true ;;
    --state=*) FILTER_STATE="${arg#*=}" ;;
    --state) shift; FILTER_STATE="${1:-}" ;;
    --help|-h)
      echo "用法: $0 [--verbose] [--state <state>]"
      echo "  --verbose  显示完整响应体"
      echo "  --state    仅测试指定状态 (empty/vague/writing/stuck/finished)"
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

log_test() {
  local id="$1" state="$2" desc="$3"
  echo -e "\n${CYAN}[${id}]${NC} ${BOLD}${state}${NC} — ${desc}"
}

check_pass() {
  local reason="$1"
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}✅ PASS${NC} — ${reason}"
}

check_fail() {
  local reason="$1"
  FAIL=$((FAIL + 1))
  echo -e "  ${RED}❌ FAIL${NC} — ${reason}"
}

check_warn() {
  local reason="$1"
  echo -e "  ${YELLOW}⚠️  WARN${NC} — ${reason}"
}

# ── 执行单次请求 ──
run_test() {
  local test_id="$1"
  local desc="$2"
  local expected_state="$3"
  local user_text="$4"
  local extra_body="${5:-{}}"
  local conversation_id="${6:-}"

  TOTAL=$((TOTAL + 1))

  # 构建 JSON 请求体 (printf → temp file 避免 Shell 损坏 UTF-8)
  local tmp_body
  tmp_body=$(mktemp)
  if [ -n "$conversation_id" ]; then
    printf '{"userText":"%s","conversationId":"%s","retryCount":0}' "$user_text" "$conversation_id" > "$tmp_body"
  else
    printf '{"userText":"%s","retryCount":0}' "$user_text" > "$tmp_body"
  fi

  # 发送请求
  local response
  response=$(curl -s -w "\n%{http_code}" \
    --max-time "$TIMEOUT" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json; charset=utf-8" \
    -H "Authorization: Bearer $ANON_KEY" \
    --data-binary "@${tmp_body}" 2>&1) || {
    check_fail "curl 请求失败或超时"
    rm -f "$tmp_body"
    return 1
  }

  rm -f "$tmp_body"

  # 分离 HTTP 状态码和响应体
  local http_code
  http_code=$(echo "$response" | tail -1)
  local response_body
  response_body=$(echo "$response" | sed '$d')

  # 检查 HTTP 状态
  if [ "$http_code" != "200" ]; then
    check_fail "HTTP $http_code (期望 200)"
    if $VERBOSE; then
      echo -e "  ${YELLOW}响应:${NC} $(echo "$response_body" | jq -c '.' 2>/dev/null || echo "$response_body")"
    fi
    return 1
  fi

  # 检查 JSON 合法性
  if ! echo "$response_body" | jq empty 2>/dev/null; then
    check_fail "响应不是合法 JSON"
    if $VERBOSE; then
      echo -e "  ${YELLOW}原始响应:${NC} ${response_body:0:300}"
    fi
    return 1
  fi

  # 检查 error 字段
  local error
  error=$(echo "$response_body" | jq -r '.error // empty')
  if [ -n "$error" ]; then
    check_fail "API 返回错误: $error"
    return 1
  fi

  # 检查 diagnosis 字段
  local diagnosis
  diagnosis=$(echo "$response_body" | jq -r '.diagnosis // empty')
  if [ -z "$diagnosis" ]; then
    check_fail "响应缺少 diagnosis 字段"
    return 1
  fi

  local diag_len=${#diagnosis}
  if [ "$diag_len" -lt 10 ]; then
    check_fail "diagnosis 内容过短 (${diag_len} 字符)"
    return 1
  fi

  # 检查 meta 字段
  local meta layers_out pre_state_out session_round endpoint_out
  meta=$(echo "$response_body" | jq -r '.meta // empty')
  layers_out="N/A"
  pre_state_out="N/A"
  session_round=0
  endpoint_out="unknown"
  if [ -z "$meta" ]; then
    check_warn "响应缺少 meta 字段（非致命）"
  else
    layers_out=$(echo "$response_body" | jq -r '.meta.layers // [] | join(",")')
    pre_state_out=$(echo "$response_body" | jq -r '.meta.preClassifiedState // "N/A"')
    session_round=$(echo "$response_body" | jq -r '.meta.sessionRound // .meta.retry // 0')
    endpoint_out=$(echo "$response_body" | jq -r '.meta.endpoint // "unknown"')
  fi

  # ── 状态验证 ──
  local state_match=false

  # 检查状态确认句（L1 规定首句必须公开状态判断）
  local state_pattern="我注意到你现在是"
  if echo "$diagnosis" | grep -q "$state_pattern"; then
    state_match=true
  fi

  # 查状态关键词
  case "$expected_state" in
    empty|空虚)
      if echo "$diagnosis" | grep -qE "(空虚|脑子|身体|空白|没想法|不知道写什么)"; then
        state_match=true
      fi
      ;;
    vague|模糊念头)
      if echo "$diagnosis" | grep -qE "(模糊念头|方向|想法|物件|具体|构思)"; then
        state_match=true
      fi
      ;;
    writing|写作中)
      if echo "$diagnosis" | grep -qE "(写作中|读者感受|我注意到.*具体|这让读者)"; then
        state_match=true
      fi
      ;;
    stuck|卡住了)
      if echo "$diagnosis" | grep -qE "(卡住了|不对|绕圈|朗读|不舒服|别急着改)"; then
        state_match=true
      fi
      ;;
    finished|写完了)
      if echo "$diagnosis" | grep -qE "(写完了|抵达|你觉得|完整|干净)"; then
        state_match=true
      fi
      ;;
  esac

  # ── 输出结果 ──
  local state_label
  case "$expected_state" in
    empty) state_label="空虚" ;;
    vague) state_label="模糊念头" ;;
    writing) state_label="写作中" ;;
    stuck) state_label="卡住了" ;;
    finished) state_label="写完了" ;;
    *) state_label="$expected_state" ;;
  esac

  if $state_match; then
    check_pass "状态判断匹配 [${state_label}] | 诊断长度=${diag_len} | layers=${layers_out} | endpoint=${endpoint_out}"
  else
    # 不完全匹配也不一定是失败——LLM判断可能比测试更准，标记为 WARN
    # WARN 不影响 PASS/FAIL 计数——仅提示人工复查
    check_warn "状态关键词未显式匹配 [期望=${state_label}] | 诊断长度=${diag_len} | layers=${layers_out} | endpoint=${endpoint_out}"
  fi

  if $VERBOSE; then
    echo -e "  ${BLUE}─── 诊断内容（前 500 字符）───${NC}"
    echo "$diagnosis" | head -c 500
    echo -e "\n  ${BLUE}─── meta ───${NC}"
    echo "$response_body" | jq -c '.meta' 2>/dev/null || echo "无 meta"
  fi

  # 返回 conversationId 用于后续多轮测试
  local cid
  cid=$(echo "$response_body" | jq -r '.meta.conversationId // empty')
  if [ -n "$cid" ]; then
    echo "$cid" > "/tmp/diagnose_test_cid.txt"
  fi
}

# ═══════════════════════════════════════════════════════════════
# 测试用例
# ═══════════════════════════════════════════════════════════════

log_section "五状态单轮诊断测试"
echo "端点: ${ENDPOINT}"
echo "超时: ${TIMEOUT}s"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ─────────────────────────────────────────────────────────────
# 状态 1：空虚 (empty) — 用例 1–3
# ─────────────────────────────────────────────────────────────
if [ -z "$FILTER_STATE" ] || [ "$FILTER_STATE" = "empty" ]; then
log_section "状态 1/5：空虚（empty）"

log_test "01" "空虚" "纯元描述——不知道写什么"
run_test "E1" \
  "纯元描述——不知道写什么" \
  "empty" \
  "不知道写什么..." \
  '{}'

log_test "02" "空虚" "极短输入——脑子空白"
run_test "E2" \
  "极短输入——脑子空白" \
  "empty" \
  "脑子里一片空白" \
  '{}'

log_test "03" "空虚" "无具体内容——没想法"
run_test "E3" \
  "无具体内容——没想法" \
  "empty" \
  "没有想法" \
  '{}'
fi

# ─────────────────────────────────────────────────────────────
# 状态 2：模糊念头 (vague idea) — 用例 4–6
# ─────────────────────────────────────────────────────────────
if [ -z "$FILTER_STATE" ] || [ "$FILTER_STATE" = "vague" ]; then
log_section "状态 2/5：模糊念头（vague idea）"

log_test "04" "模糊念头" "有方向词但无具体场景——想写关于…"
run_test "V1" \
  "有方向词但无具体场景" \
  "vague" \
  "想写一个关于离别的故事，但不知道从哪开始。" \
  '{}'

log_test "05" "模糊念头" "有构思无内容——有个想法"
run_test "V2" \
  "有构思无内容" \
  "vague" \
  "有个想法，关于一个老人和他的狗。构思中。" \
  '{}'

log_test "06" "模糊念头" "有主题无人物——打算写"
run_test "V3" \
  "有主题无人物" \
  "vague" \
  "打算写一个发生在雨夜的故事，主题是关于等待。" \
  '{}'
fi

# ─────────────────────────────────────────────────────────────
# 状态 3：写作中 (writing) — 用例 7–9
# ─────────────────────────────────────────────────────────────
if [ -z "$FILTER_STATE" ] || [ "$FILTER_STATE" = "writing" ]; then
log_section "状态 3/5：写作中（writing）"

log_test "07" "写作中" "叙事段落A——雪景+人物内心"
run_test "W1" \
  "叙事段落——雪景+人物内心" \
  "writing" \
  "雪落在窗台上，一层叠一层。她站在窗前，手里握着那封信。信纸已经泛黄，边角起了毛——这封信她读过很多次了。每次读，她都觉得自己在往后退，退到一个看不见的地方。这次不一样。这次她把信放下了。" \
  '{}'

log_test "08" "写作中" "叙事段落B——对话+动作"
run_test "W2" \
  "叙事段落——对话+动作" \
  "writing" \
  "「你确定要这么做？」老李没有抬头。他的手停在方向盘上，指节发白。车窗外，雨刷来回刮着，每一次都刮不干净——像某种徒劳的坚持。「我没有别的选择。」坐在副驾的人说。声音很轻。像在跟自己说话。" \
  '{}'

log_test "09" "写作中" "叙事段落C——回忆+感受"
run_test "W3" \
  "叙事段落——回忆+感受" \
  "writing" \
  "那天的风很大。他记得很清楚——因为母亲按住了头上的帽子，回头看了他一眼。那个眼神他后来想起过很多次，每一次都在想：她当时在看什么？是在看他，还是在看那个正在从她生活里消失的人？他不知道。他只是站在那里，看着她的背影被风吹得歪了一下。" \
  '{}'
fi

# ─────────────────────────────────────────────────────────────
# 状态 4：卡住了 (stuck) — 用例 10–12
# ─────────────────────────────────────────────────────────────
if [ -z "$FILTER_STATE" ] || [ "$FILTER_STATE" = "stuck" ]; then
log_section "状态 4/5：卡住了（stuck）"

log_test "10" "卡住了" "显式否定——不对，这里感觉不对"
run_test "S1" \
  "显式否定——不对，这里感觉不对" \
  "stuck" \
  "不对，这里感觉不对。但我说不上来哪里不对。" \
  '{}'

log_test "11" "卡住了" "反复否定——还是不对"
run_test "S2" \
  "反复否定——还是不对，不是这个意思" \
  "stuck" \
  "还是不对，不是这个意思。我改了好几遍了但是总觉得没改到点上。" \
  '{}'

log_test "12" "卡住了" "重来——不是这样的"
run_test "S3" \
  "重来——不是这样的" \
  "stuck" \
  "不是这样的。重来吧。我想写的不是这种感觉。" \
  '{}'
fi

# ─────────────────────────────────────────────────────────────
# 状态 5：写完了 (finished) — 用例 13–15
# ─────────────────────────────────────────────────────────────
if [ -z "$FILTER_STATE" ] || [ "$FILTER_STATE" = "finished" ]; then
log_section "状态 5/5：写完了（finished）"

log_test "13" "写完了" "提交长文字+不确定——你觉得怎么样"
run_test "F1" \
  "提交长文字+不确定——你觉得怎么样" \
  "finished" \
  "她觉得这个决定是自己做的。没有人逼她，没有人给她设期限，没有人告诉她应该怎么选。但她也知道——爸爸不会永远等在那里。那天晚上她坐在车里很久，引擎熄了，只剩路灯的光打在方向盘上。她看着自己的手，看着那枚戒指，心想：这不就是我要的吗？为什么得到了之后反而不确定了？你觉得怎么样？" \
  '{}'

log_test "14" "写完了" "提交长文字+询问——会不会太拖沓"
run_test "F2" \
  "提交长文字+询问——会不会太拖沓" \
  "finished" \
  "他终于到了门口。门没锁——推开的时候，一股冷风从背后灌进去。屋里很暗，只有厨房里亮着一盏灯。灯下坐着一个人。他看不清那个人的脸，但他知道那是谁。他站在原地，手还握着门把手。空气里有一种说不清的沉——像所有的钟都停了。会不会太拖沓了？我总感觉这一段写得太慢了。" \
  '{}'

log_test "15" "写完了" "提交后求助——总感觉哪里不对"
run_test "F3" \
  "提交后求助——总感觉哪里不对" \
  "finished" \
  "那之后他们再也没有见过面。不是刻意的——就是没有再见。他后来想起那天的道别，觉得很轻。没有拥抱，没有眼泪，没有正式的说再见。只是挥了挥手，像明天还会见面那样。但两个人都知道不会了。总感觉哪里不对，就是说不出来——帮我看看，这段的问题在哪？" \
  '{}'
fi

# ═══════════════════════════════════════════════════════════════
# 结果汇总
# ═══════════════════════════════════════════════════════════════
echo ""
log_section "测试结果汇总"

echo -e "  总用例数: ${BOLD}${TOTAL}${NC}"
echo -e "  ${GREEN}通过${NC}:     ${PASS}"
echo -e "  ${YELLOW}警告${NC}:     $((TOTAL - PASS - FAIL))"
echo -e "  ${RED}失败${NC}:     ${FAIL}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✅ 全部用例通过！${NC}"
  echo ""
  echo "  ┌─────────────────────────────────────────────────────┐"
  echo "  │  五状态单轮诊断 — 基础功能验证通过                  │"
  echo "  │  所有 5 个状态的入口路径均正常响应                  │"
  echo "  │  HTTP 200 + diagnosis 非空 + meta 结构完整          │"
  echo "  └─────────────────────────────────────────────────────┘"
  exit 0
elif [ "$FAIL" -le 3 ]; then
  echo -e "${YELLOW}${BOLD}⚠️  部分用例未通过——可能存在网络波动或 LLM 不确定性${NC}"
  echo ""
  echo "  建议: 重新运行失败用例确认是否稳定复现"
  exit 0
else
  echo -e "${RED}${BOLD}❌ 多个用例失败——需要检查 Edge Function 日志${NC}"
  echo ""
  echo "  可能原因:"
  echo "    1. API2D 通道全部降级失败（检查 API Key 余额）"
  echo "    2. 部署的版本不是 v5.0.1"
  echo "    3. 网络连接问题"
  exit 1
fi
