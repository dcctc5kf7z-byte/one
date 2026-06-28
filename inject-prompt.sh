#!/bin/bash
# 提取 v3.1 System Prompt（行14-658）并注入 Edge Function

EDGE_FUNC="web-app/supabase/functions/anthropic-diagnose/index.ts"
V3_FILE=".claude/skills/writer/产品MVP方案-v3.md"
TMP_PROMPT="/tmp/v3-prompt.txt"

# 提取 System Prompt（行14-658 是代码块内的内容）
sed -n '14,658p' "$V3_FILE" > "$TMP_PROMPT"

# 读 Edge Function，替换 PLACEHOLDER 行
# 先输出 PLACEHOLDER 之前的内容
# 再插入 System Prompt
# 再输出 PLACEHOLDER 之后的内容

python3 -c "
import sys

# 读取 Edge Function
with open('$EDGE_FUNC', 'r', encoding='utf-8') as f:
    ef = f.read()

# 读取 System Prompt
with open('$TMP_PROMPT', 'r', encoding='utf-8') as f:
    prompt = f.read()

# 替换 PLACEHOLDER 行
old = 'const SYSTEM_PROMPT = \`PLACEHOLDER — 用完整 v3.1 System Prompt 替换\`;'
new = 'const SYSTEM_PROMPT = \`' + prompt + '\`;'

ef = ef.replace(old, new)

with open('$EDGE_FUNC', 'w', encoding='utf-8') as f:
    f.write(ef)

print('Done. Edge Function updated.')
"
