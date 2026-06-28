// 冒烟测试：五状态 × 3 段文字
// Node.js ESM (no jq dependency)
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!ANON_KEY) { console.error('需要 SUPABASE_ANON_KEY'); process.exit(1); }

const ENDPOINT = 'https://fdhqqebbfbxisnnmyerg.supabase.co/functions/v1/anthropic-diagnose';

const CASES = [
  { id: 'E1', state: '空虚', text: '（空白的输入框，什么也没写）' },
  { id: 'E2', state: '空虚', text: '写不出来。真的写不出来。每次坐下来盯着屏幕，脑子就一片空白。' },
  { id: 'E3', state: '空虚', text: '没有想法' },
  { id: 'V1', state: '模糊念头', text: '我想写一个关于回家的故事，但不知道从哪开始。' },
  { id: 'V2', state: '模糊念头', text: '也许可以写写我妈。但也没什么特别的事。' },
  { id: 'V3', state: '模糊念头', text: '脑子里有一些碎片——一棵树、一个背影、下雨的傍晚。' },
  { id: 'W1', state: '写作中', text: '他从车站走出来，手里提着一个旧皮箱。那是父亲留给他的唯一东西。十年了，皮箱的把手已经被磨得发亮。' },
  { id: 'W2', state: '写作中', text: '首先，AI 在教育的应用可以分为三个层面。第一，个性化学习路径。第二，即时反馈机制。' },
  { id: 'W3', state: '写作中', text: '那天下午三点，阳光透过百叶窗在墙上切出一道道条纹。她在等一个人。' },
  { id: 'S1', state: '卡住了', text: '他走到了门口。然后呢？我不知道他该不该进去。进去了故事就往一个方向走，不进去就往另一个方向。' },
  { id: 'S2', state: '卡住了', text: '写到这里发现前面第三章有个设定矛盾——如果主角早就知道真相，那他在第一章的反应就不对了。' },
  { id: 'S3', state: '卡住了', text: '这段改了七八遍了，每个版本都不满意。不是节奏不对就是对话太假。' },
  { id: 'F1', state: '写完了', text: '他终于到家了。窗台上那盆吊兰还在，只是叶子黄了一半。这三年，什么都没变，什么都变了。放下箱子的时候，他在窗玻璃里看见了自己的脸——不再是三年前那张脸了。然后他坐下来，开始写这封信。' },
  { id: 'F2', state: '写完了', text: '综上所述，本文通过三个维度分析了当代青年的身份认同困境：家庭期望与个人选择的张力、社交媒体中的自我呈现、以及职场中的代际冲突。这些分析表明，身份认同不是一个静态标签，而是一个持续的协商过程。' },
  { id: 'F3', state: '写完了', text: '总感觉哪里不对，就是说不出来。' },
];

const STATE_MAP = { '空虚': 'empty', '模糊念头': 'vague_idea', '写作中': 'writing', '卡住了': 'stuck', '写完了': 'finished' };
const STATE_PATTERN = /我注意到你现在是[\s]*[*_]{0,2}[「」"']?\s*(.{2,8})\s*[「」"']?[*_]{0,2}\s*[—\-–]\s*对吗\s*[？?]/;

function parseState(diagnosis) {
  const m = diagnosis.match(STATE_PATTERN);
  if (!m) return null;
  const label = m[1].trim();
  return { label, state: STATE_MAP[label] || label };
}

function classify(expected) { return STATE_MAP[expected] || expected; }

async function testCase(c) {
  const tmpDir = join(__dirname, 'tmp');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  const tmpFile = join(tmpDir, `smoke_${c.id}.json`);

  const body = JSON.stringify({ userText: c.text, retry: 0, temperature: 0.7 });
  writeFileSync(tmpFile, body + '\n', 'utf-8');

  // Use curl with --data-binary for safe UTF-8
  const cmd = `curl -s -w "\\n%{http_code}" --connect-timeout 15 --max-time 90 -X POST "${ENDPOINT}" -H "Authorization: Bearer ${ANON_KEY}" -H "Content-Type: application/json" --data-binary @${tmpFile}`;

  try {
    const raw = execSync(cmd, { encoding: 'utf-8', timeout: 95000, windowsHide: true });
    const lines = raw.trim().split('\n');
    const httpCode = lines.pop().trim();
    const bodyText = lines.join('\n');

    try { unlinkSync(tmpFile); } catch (_) {}

    if (httpCode !== '200') return { ...c, ok: false, httpCode, diagnosis: null, parsed: null, meta: null, error: bodyText.slice(0, 200) };

    const json = JSON.parse(bodyText);
    const diagnosis = json.diagnosis || '';
    const meta = json.meta || {};
    const parsed = parseState(diagnosis);

    return {
      ...c, ok: true, httpCode,
      diagnosis: diagnosis.slice(0, 300),
      parsed: parsed ? parsed.label : null,
      parsedState: parsed ? parsed.state : null,
      endpoint: meta.endpoint || '?',
      convId: meta.conversationId ? '✓' : '✗',
    };
  } catch (e) {
    try { unlinkSync(tmpFile); } catch (_) {}
    return { ...c, ok: false, httpCode: 0, diagnosis: null, parsed: null, error: e.message.slice(0, 200) };
  }
}

async function main() {
  const tmpDir = join(__dirname, 'tmp');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  console.log('══════════════════════════════════════════════');
  console.log('  冒烟测试：五状态 × 3 段文字 (15 cases)');
  console.log('══════════════════════════════════════════════\n');

  let passed = 0, failed = 0;
  const results = [];

  for (const c of CASES) {
    process.stdout.write(`[${c.id}] ${c.state.padEnd(6, ' ')} … `);
    const r = await testCase(c);
    results.push(r);

    if (!r.ok || r.httpCode !== '200') {
      console.log(`❌ HTTP ${r.httpCode || r.error}`);
      failed++;
    } else {
      const expectedState = classify(c.state);
      const match = r.parsedState === expectedState;
      const icon = match ? '✅' : '⚠️ ';
      console.log(`${icon} → ${r.parsed || '(未解析)'} [${r.endpoint}]`);
      passed++;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n──────────────────────────────────────────────');
  console.log(`  功能正常: ${passed}/${CASES.length}`);
  if (failed > 0) {
    console.log(`  HTTP 失败: ${failed}`);
    results.filter(r => !r.ok).forEach(r => console.log(`    ${r.id}: ${r.error || ''}`));
  }

  const byState = {};
  for (const r of results) {
    if (!byState[r.state]) byState[r.state] = { total: 0, ok: 0 };
    byState[r.state].total++;
    if (r.ok) byState[r.state].ok++;
  }
  console.log('\n  按状态:');
  for (const [s, v] of Object.entries(byState)) {
    console.log(`    ${v.ok === v.total ? '✅' : '❌'} ${s}: ${v.ok}/${v.total}`);
  }

  const eps = {};
  results.filter(r => r.ok).forEach(r => { eps[r.endpoint] = (eps[r.endpoint] || 0) + 1; });
  console.log('\n  模型分布:', Object.entries(eps).map(([k,v]) => `${k}×${v}`).join(' | '));
  console.log('══════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
