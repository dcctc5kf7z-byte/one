#!/usr/bin/env node
/**
 * Ollama Spike Test Runner
 *
 * Sends 14 test texts (7 genres × 2 languages) to a local Ollama instance
 * running Qwen 2.5 14B, using the full /text-lens Skill prompt as system context.
 *
 * Usage:
 *   node run-spike.mjs
 *
 * Env vars:
 *   OLLAMA_HOST  — Ollama API base URL (default: http://localhost:11434)
 *   OLLAMA_MODEL — Model name (default: qwen2.5:14b)
 *   START_ID     — Start from this test ID (default: T01, for resuming)
 *   TIMEOUT_MS   — Max wait per request in ms (default: 300000 = 5 min)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SKILL_DIR = join(ROOT, '.claude', 'skills', 'writer');

// ── Config ────────────────────────────────────────────────────
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:14b';
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '300000', 10);
const RESULTS_DIR = join(__dirname, 'results');

// ── Load prompt components ────────────────────────────────────
function loadPromptComponents() {
  const skillMd = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf-8');
  const ironLaws = readFileSync(join(SKILL_DIR, 'iron-laws.md'), 'utf-8');

  // Load all lens files
  const lenses = {};
  const lensDir = join(SKILL_DIR, 'lenses');
  const lensFiles = ['poetic', 'narrative', 'argument', 'technical', 'dialogue', 'personal', 'general'];
  for (const name of lensFiles) {
    lenses[name] = readFileSync(join(lensDir, `${name}.md`), 'utf-8');
  }

  return { skillMd, ironLaws, lenses };
}

// ── Build system prompt for a test case ───────────────────────
function buildSystemPrompt(components, genre) {
  const { skillMd, ironLaws, lenses } = components;
  const lensContent = lenses[genre] || lenses['general'];

  return `${skillMd}

---
# 对应体裁透镜

${lensContent}

---
# 铁律详细展开

${ironLaws}

---
你现在以文本透视镜的身份工作。用户会给你一段文字，请你按照 SKILL.md 中定义的流程进行诊断。
先判定体裁（加载对应透镜），然后进行 X→Y→Z 三层诊断，按结构化输出格式给出结果。
记住铁律——特别是 #9 推≠替写 和 #10 动作句优先。`;
}

// ── Call Ollama API ───────────────────────────────────────────
async function callOllama(systemPrompt, userText) {
  const body = JSON.stringify({
    model: OLLAMA_MODEL,
    system: systemPrompt,
    prompt: userText,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 1024,
    }
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { error: `HTTP ${res.status}: ${res.statusText}`, output: null };
    }

    const json = await res.json();
    return { error: null, output: json.response || '', meta: {
      model: json.model,
      total_duration_ms: json.total_duration ? Math.round(json.total_duration / 1_000_000) : null,
      eval_count: json.eval_count,
    }};
  } catch (e) {
    clearTimeout(timer);
    return { error: e.name === 'AbortError' ? 'TIMEOUT' : e.message, output: null };
  }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  // Parse test cases
  const testData = JSON.parse(readFileSync(join(__dirname, 'test-texts.json'), 'utf-8'));
  const tests = testData.tests;

  console.log('══════════════════════════════════════════════════');
  console.log('  Ollama Spike: Qwen 2.5 14B vs Claude Opus');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Model:  ${OLLAMA_MODEL}`);
  console.log(`  Host:   ${OLLAMA_HOST}`);
  console.log(`  Tests:  ${tests.length} (7 genres × 2 languages)`);
  console.log(`  Timeout: ${Math.round(TIMEOUT_MS / 1000)}s per test`);
  console.log('══════════════════════════════════════════════════\n');

  // Check Ollama connectivity
  try {
    const check = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!check.ok) throw new Error(`HTTP ${check.status}`);
    const models = await check.json();
    const hasModel = (models.models || []).some(m => m.name.startsWith(OLLAMA_MODEL));
    if (!hasModel) {
      console.error(`⚠️  Model "${OLLAMA_MODEL}" not found in Ollama.`);
      console.error(`   Available: ${(models.models || []).map(m => m.name).join(', ') || '(none)'}`);
      console.error('   Run: ollama pull ' + OLLAMA_MODEL);
      process.exit(1);
    }
    console.log(`✅ Ollama connected. Model "${OLLAMA_MODEL}" found.\n`);
  } catch (e) {
    console.error(`❌ Cannot connect to Ollama at ${OLLAMA_HOST}`);
    console.error(`   ${e.message}`);
    console.error('   Make sure "ollama serve" is running.');
    process.exit(1);
  }

  // Load prompts
  console.log('📖 Loading Skill prompts...');
  const components = loadPromptComponents();
  console.log(`   SKILL.md:       ${components.skillMd.length} chars`);
  console.log(`   iron-laws.md:   ${components.ironLaws.length} chars`);
  for (const [name, content] of Object.entries(components.lenses)) {
    console.log(`   lenses/${name}.md: ${content.length} chars`);
  }

  // Build system prompts for each genre (cache)
  console.log('\n🔨 Building system prompts per genre...');
  const systemPrompts = {};
  for (const genre of Object.keys(components.lenses)) {
    systemPrompts[genre] = buildSystemPrompt(components, genre);
    console.log(`   ${genre}: ${systemPrompts[genre].length} chars`);
  }

  // Run tests
  const startIdx = process.env.START_ID
    ? tests.findIndex(t => t.id === process.env.START_ID)
    : 0;
  if (startIdx > 0) console.log(`\n⏭️  Resuming from ${tests[startIdx].id}...`);

  const results = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = startIdx; i < tests.length; i++) {
    const test = tests[i];
    const sysPrompt = systemPrompts[test.genre] || systemPrompts['general'];

    console.log(`\n[${test.id}] ${test.genre.padEnd(12, ' ')} ${test.language} — ${test.text.slice(0, 60).replace(/\n/g, ' ')}...`);
    process.stdout.write('  → Ollama thinking... ');

    const startTime = Date.now();
    const { error, output, meta } = await callOllama(sysPrompt, test.text);
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    const result = {
      id: test.id,
      genre: test.genre,
      language: test.language,
      input: test.text,
      output: output,
      error: error,
      meta: meta || {},
      elapsed_s: elapsed,
      timestamp: new Date().toISOString(),
    };
    results.push(result);

    if (error) {
      console.log(`❌ ${error} (${elapsed}s)`);
      failed++;
    } else {
      const len = output?.length || 0;
      console.log(`✅ ${len} chars, ${elapsed}s (${meta?.total_duration_ms || '?'}ms model)`);
      passed++;
    }

    // Save individual result
    const outPath = join(RESULTS_DIR, `${test.id}.json`);
    writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');

    // Also save human-readable output
    const mdPath = join(RESULTS_DIR, `${test.id}.md`);
    const mdContent = `# ${test.id} — ${test.genre} (${test.language})

**Input:**
${test.text}

**Output:**
${output || `[ERROR: ${error}]`}

**Meta:** ${JSON.stringify(meta)}
**Elapsed:** ${elapsed}s
`;
    writeFileSync(mdPath, mdContent, 'utf-8');
  }

  // Summary
  console.log('\n──────────────────────────────────────────────────');
  console.log(`  Results: ${passed} passed / ${failed} failed / ${tests.length} total`);
  console.log(`  Saved:   ${RESULTS_DIR}/*.json`);
  console.log('──────────────────────────────────────────────────\n');

  // Save summary log
  const summaryPath = join(RESULTS_DIR, '_summary.json');
  writeFileSync(summaryPath, JSON.stringify({
    model: OLLAMA_MODEL,
    host: OLLAMA_HOST,
    timestamp: new Date().toISOString(),
    total: tests.length,
    passed,
    failed,
    results,
  }, null, 2), 'utf-8');
  console.log(`Summary saved to ${summaryPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
