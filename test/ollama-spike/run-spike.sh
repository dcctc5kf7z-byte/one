#!/usr/bin/env bash
# Ollama Spike — Bash wrapper
#
# Usage:
#   ./run-spike.sh                  # Run all 14 tests
#   START_ID=T08 ./run-spike.sh     # Resume from T08
#   OLLAMA_MODEL=qwen2.5:7b ./run-spike.sh  # Use different model
#
# Prerequisites:
#   - Ollama running: ollama serve
#   - Model pulled:   ollama pull qwen2.5:14b
#   - Node.js ≥18

set -euo pipefail
cd "$(dirname "$0")"

# ── Config ────────────────────────────────────────────────────
export OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:14b}"
export TIMEOUT_MS="${TIMEOUT_MS:-300000}"
export START_ID="${START_ID:-}"

echo "══════════════════════════════════════════════════"
echo "  Ollama Spike Runner"
echo "══════════════════════════════════════════════════"
echo "  Model:   $OLLAMA_MODEL"
echo "  Host:    $OLLAMA_HOST"
echo "  Timeout: $TIMEOUT_MS ms"
echo "══════════════════════════════════════════════════"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js ≥18."
  exit 1
fi

# Run the spike
node run-spike.mjs "$@"
exit_code=$?

# Suggest evaluation
if [ $exit_code -eq 0 ]; then
  echo ""
  echo "✅ Spike completed. Run evaluation:"
  echo "   node evaluate.mjs"
fi

exit $exit_code
