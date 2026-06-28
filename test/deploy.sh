#!/usr/bin/env bash
# ============================================================
# 写作诊断工具 — Edge Function 部署脚本
# Phase B.8 — v5.0.1 部署至 Supabase
# ============================================================
#
# 前置条件：
#   1. 已安装 Supabase CLI（npm i -g supabase 或 npx supabase）
#   2. 已登录 Supabase CLI（supabase login）
#      - 或设置环境变量 SUPABASE_ACCESS_TOKEN
#   3. Docker 运行中（如不使用 --use-api 标志）
#
# 用法：
#   chmod +x test/deploy.sh
#   ./test/deploy.sh                              # 部署到 fdhqqebbfbxisnnmyerg
#   ./test/deploy.sh --project-ref <ref>          # 部署到指定项目
#   ./test/deploy.sh --dry-run                    # 预览但不执行
#   ./test/deploy.sh --verify                     # 部署后立即运行验证测试
#
# 部署内容：
#   - web-app/supabase/functions/anthropic-diagnose/index.ts
#   - web-app/supabase/functions/anthropic-diagnose/engine.ts
#   - web-app/supabase/functions/anthropic-diagnose/layers.ts
# ============================================================

set -euo pipefail

# ── 配置 ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FUNCTION_DIR="${PROJECT_DIR}/web-app/supabase/functions/anthropic-diagnose"
PROJECT_REF="${PROJECT_REF:-fdhqqebbfbxisnnmyerg}"
DRY_RUN="${DRY_RUN:-false}"
RUN_VERIFY="${RUN_VERIFY:-false}"
FUNCTION_NAME="anthropic-diagnose"

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ── 参数解析 ──
for arg in "$@"; do
  case "$arg" in
    --project-ref=*) PROJECT_REF="${arg#*=}" ;;
    --project-ref) shift; PROJECT_REF="${1:-$PROJECT_REF}" ;;
    --dry-run) DRY_RUN=true ;;
    --verify) RUN_VERIFY=true ;;
    --help|-h)
      echo "用法: $0 [--project-ref <ref>] [--dry-run] [--verify]"
      echo ""
      echo "选项："
      echo "  --project-ref <ref>  目标 Supabase 项目 ref（默认: $PROJECT_REF）"
      echo "  --dry-run            预览部署但不执行"
      echo "  --verify             部署后自动运行验证测试"
      echo ""
      echo "环境变量："
      echo "  SUPABASE_ACCESS_TOKEN  Supabase 个人访问令牌（如未用 supabase login）"
      echo "  PROJECT_REF           目标项目 ref"
      exit 0
      ;;
  esac
done

# ── 检查 CLI ──
detect_cli() {
  # 尝试多种方式找到 Supabase CLI
  if command -v supabase &>/dev/null; then
    echo "supabase"
  elif command -v npx &>/dev/null && npx supabase --version &>/dev/null 2>&1; then
    echo "npx supabase"
  else
    # 检查 npm cache 中的二进制
    local cached
    cached=$(find /c/Users/zhong/AppData/Local/npm-cache/_npx -name "supabase.cmd" -type f 2>/dev/null | head -1)
    if [ -n "$cached" ]; then
      echo "\"$cached\""
    else
      echo ""
    fi
  fi
}

log_section() {
  echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
}

log_info() {
  echo -e "  ${BLUE}→${NC} $1"
}

log_success() {
  echo -e "  ${GREEN}✅${NC} $1"
}

log_warn() {
  echo -e "  ${YELLOW}⚠️${NC} $1"
}

log_error() {
  echo -e "  ${RED}❌${NC} $1"
}

# ═══════════════════════════════════════════════════════════════
# 部署流程
# ═══════════════════════════════════════════════════════════════

log_section "Edge Function 部署"

echo ""
log_info "项目目录: ${PROJECT_DIR}"
log_info "函数路径: ${FUNCTION_DIR}"
log_info "目标项目: ${PROJECT_REF}"
log_info "函数名称: ${FUNCTION_NAME}"
echo ""

# ── 1. 检查源文件 ──
log_section "1. 源文件检查"

FILES=("index.ts" "engine.ts" "layers.ts")
ALL_OK=true

for file in "${FILES[@]}"; do
  local_path="${FUNCTION_DIR}/${file}"
  if [ -f "$local_path" ]; then
    local lines=$(wc -l < "$local_path" | tr -d ' ')
    local size=$(wc -c < "$local_path" | tr -d ' ')
    log_success "${file} — ${lines} 行, ${size} bytes"
  else
    log_error "${file} — 缺失！"
    ALL_OK=false
  fi
done

if ! $ALL_OK; then
  log_error "源文件不完整，终止部署"
  exit 1
fi

# ── 2. 检测 CLI ──
log_section "2. CLI 检测"

SUPABASE_CLI=$(detect_cli)

if [ -z "$SUPABASE_CLI" ]; then
  log_error "未检测到 Supabase CLI"
  echo ""
  echo "  安装方法："
  echo "    npm install supabase --save-dev"
  echo "    npx supabase login"
  echo ""
  echo "  或使用 Supabase Dashboard 手动上传："
  echo "    https://supabase.com/dashboard/project/${PROJECT_REF}/functions"
  exit 1
fi

log_success "CLI 已就绪: ${SUPABASE_CLI}"
eval "CLI_CMD=${SUPABASE_CLI}"

# ── 3. 认证检查 ──
log_section "3. 认证检查"

if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  log_success "SUPABASE_ACCESS_TOKEN 已设置"
else
  # 尝试检查是否已登录
  if eval "${CLI_CMD} projects list --output json &>/dev/null"; then
    log_success "已登录 Supabase CLI"
  else
    log_warn "未检测到登录状态"
    echo ""
    echo "  请先登录："
    echo "    ${SUPABASE_CLI} login"
    echo ""
    echo "  或设置环境变量："
    echo "    export SUPABASE_ACCESS_TOKEN=<your-token>"
    echo ""
    echo "  获取 Access Token："
    echo "    https://supabase.com/dashboard/account/tokens"
    echo ""

    if ! $DRY_RUN; then
      log_error "认证失败，终止部署"
      exit 1
    fi
    log_warn "dry-run 模式，跳过认证失败"
  fi
fi

# ── 4. 版本信息 ──
log_section "4. 部署版本信息"

# 从 index.ts 提取版本号
VERSION_LINE=$(grep -m1 "混合架构 v" "${FUNCTION_DIR}/index.ts" || echo "v5.0")
echo ""
log_info "版本: ${VERSION_LINE}"
log_info "时间: $(date '+%Y-%m-%d %H:%M:%S')"

# 显示 v5.0.1 修复清单
echo ""
log_info "v5.0.1 修复项（13项）："
echo "    严重 (4): FIX-01/02/06/11"
echo "    中等 (2): FIX-03/07"
echo "    一般 (7): FIX-04/05/08/09/10/12/13"

# ── 5. 执行部署 ──
log_section "5. 部署执行"

DEPLOY_CMD="${CLI_CMD} functions deploy ${FUNCTION_NAME}"
DEPLOY_CMD="${DEPLOY_CMD} --project-ref ${PROJECT_REF}"
DEPLOY_CMD="${DEPLOY_CMD} --no-verify-jwt"
DEPLOY_CMD="${DEPLOY_CMD} --use-api"

if $DRY_RUN; then
  log_warn "DRY RUN — 将执行以下命令:"
  echo ""
  echo "  cd ${FUNCTION_DIR}/../.. && ${DEPLOY_CMD}"
  echo ""
  log_info "跳过实际部署"
else
  log_info "执行命令:"
  echo "  ${DEPLOY_CMD}"
  echo ""

  cd "${FUNCTION_DIR}/../.."

  if eval "${DEPLOY_CMD}"; then
    log_success "部署成功！"
  else
    log_error "部署失败！请检查 Supabase CLI 输出"
    exit 1
  fi
fi

# ── 6. 部署验证 ──
ENDPOINT_URL="https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}"

log_section "6. 部署验证"

log_info "端点: ${ENDPOINT_URL}"

if $DRY_RUN; then
  log_warn "dry-run 模式，跳过验证"
else
  # 快速冒烟测试
  log_info "发送冒烟测试请求..."
  SMOKE=$(curl -s -w "\n%{http_code}" --max-time 30 \
    -X POST "${ENDPOINT_URL}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer anonymous" \
    -d '{"userText":"雪落在窗台上。她看着那封信。","retryCount":0}' 2>&1)

  HTTP_CODE=$(echo "$SMOKE" | tail -1)
  RESPONSE_BODY=$(echo "$SMOKE" | sed '$d')

  if [ "$HTTP_CODE" = "200" ]; then
    DIAG_LEN=$(echo "$RESPONSE_BODY" | jq -r '.diagnosis | length' 2>/dev/null || echo "0")
    ENDPOINT=$(echo "$RESPONSE_BODY" | jq -r '.meta.endpoint // "unknown"' 2>/dev/null)
    log_success "冒烟测试通过 — HTTP 200, 诊断长度=${DIAG_LEN}, 模型=${ENDPOINT}"
  elif [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "413" ] || [ "$HTTP_CODE" = "500" ]; then
    log_error "冒烟测试返回 HTTP ${HTTP_CODE}"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  else
    log_warn "冒烟测试返回 HTTP ${HTTP_CODE}（可能是冷启动）"
    echo "  响应: ${RESPONSE_BODY:0:200}"
  fi

  # ── 可选：运行完整测试套件 ──
  if $RUN_VERIFY; then
    echo ""
    log_info "运行完整测试套件..."
    TEST_SCRIPT="${SCRIPT_DIR}/diagnose.sh"
    if [ -f "$TEST_SCRIPT" ]; then
      ENDPOINT="${ENDPOINT_URL}" bash "$TEST_SCRIPT"
    else
      log_warn "测试脚本未找到: ${TEST_SCRIPT}"
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════
# 结果
# ═══════════════════════════════════════════════════════════════
echo ""
log_section "部署完成"

echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  端点: ${ENDPOINT_URL}"
echo "  │  仪表盘: https://supabase.com/dashboard/project/${PROJECT_REF}/functions/${FUNCTION_NAME}"
echo "  │  日志: https://supabase.com/dashboard/project/${PROJECT_REF}/functions/${FUNCTION_NAME}/logs"
echo "  └─────────────────────────────────────────────────────┘"
echo ""

if $RUN_VERIFY; then
  echo -e "  ${GREEN}✅ 部署 + 验证完成${NC}"
else
  echo -e "  运行测试: ${BOLD}ENDPOINT=${ENDPOINT_URL} ./test/diagnose.sh${NC}"
  echo -e "  运行流程测试: ${BOLD}ENDPOINT=${ENDPOINT_URL} ./test/flow.sh${NC}"
fi
echo ""
