#!/usr/bin/env node
/**
 * Ollama Spike — Evaluation Script
 *
 * Reads test results from results/*.json and evaluates each against the
 * 7-dimension rubric (G/X/Y/Z/L/W/I). Generates a structured report.
 *
 * Mechanical checks (auto): L (language), W (word count)
 * Content checks (template): G (genre), X/Y/Z (diagnosis layers), I (iron laws)
 *
 * Usage:
 *   node evaluate.mjs
 *
 * Output:
 *   results/_evaluation.md — Full report with PASS/FAIL verdict
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, 'results');

// ── Expected genres per test ──────────────────────────────────
const EXPECTED = {
  T01: 'poetic',   T02: 'poetic',
  T03: 'narrative', T04: 'narrative',
  T05: 'argument',  T06: 'argument',
  T07: 'technical', T08: 'technical',
  T09: 'dialogue',  T10: 'dialogue',
  T11: 'personal',  T12: 'personal',
  T13: 'general',   T14: 'general',
};

const GENRE_CN = {
  poetic: '诗性/意象', narrative: '叙事/故事', argument: '论述/观点',
  technical: '技术/学术', dialogue: '对话/交流', personal: '日记/内省',
  general: '通用/混合',
};

// ── Auto checks ───────────────────────────────────────────────

/** Check language consistency: output language should match input language */
function checkLanguage(output, expectedLang) {
  if (!output) return { pass: false, note: '无输出' };

  // Count CJK characters vs Latin characters
  const cjkCount = (output.match(/[一-鿿㐀-䶿]/g) || []).length;
  const latinCount = (output.match(/[a-zA-Z]/g) || []).length;

  if (expectedLang === 'ZH') {
    // Chinese output should be predominantly Chinese
    const pass = cjkCount > latinCount || latinCount < 20;
    return { pass, note: pass ? '中文输出' : `疑似英文输出（中文${cjkCount} vs 英文${latinCount}）` };
  } else {
    // English output should be predominantly English
    const pass = latinCount > cjkCount || cjkCount < 5;
    return { pass, note: pass ? '英文输出' : `疑似中文输出（英文${latinCount} vs 中文${cjkCount}）` };
  }
}

/** Check word count: ZH ≤500 chars, EN ≤250 words */
function checkWordCount(output, expectedLang) {
  if (!output) return { pass: false, note: '无输出' };

  if (expectedLang === 'ZH') {
    const chars = output.replace(/\s/g, '').length;
    const pass = chars <= 500;
    return { pass, note: `${chars} 字${pass ? ' ✓' : ' ✗ 超限'}` };
  } else {
    const words = output.split(/\s+/).filter(w => w.length > 0).length;
    const pass = words <= 250;
    return { pass, note: `${words} 词${pass ? ' ✓' : ' ✗ 超限'}` };
  }
}

/** Check genre keyword in output */
function checkGenreSignal(output, expectedGenre) {
  if (!output) return { pass: false, note: '无输出', signal: null };

  const genreKeywords = {
    poetic: ['诗性', '意象', 'poetic', 'imagery', '诗'],
    narrative: ['叙事', '故事', 'narrative', 'story'],
    argument: ['论述', '观点', '论证', 'argument', 'persuasive'],
    technical: ['技术', '学术', 'technical', 'academic'],
    dialogue: ['对话', '交流', 'dialogue', 'conversation'],
    personal: ['日记', '内省', 'personal', 'diary', 'introspect'],
    general: ['通用', '混合', 'general', 'mixed', '跨体裁'],
  };

  const keywords = genreKeywords[expectedGenre] || [];
  const found = keywords.filter(kw => output.toLowerCase().includes(kw.toLowerCase()));

  // Also check for wrong-genre signals
  const allKeywords = Object.entries(genreKeywords)
    .filter(([g]) => g !== expectedGenre)
    .flatMap(([, kws]) => kws);
  const wrongSignal = allKeywords.find(kw => {
    const idx = output.toLowerCase().indexOf(kw.toLowerCase());
    // Only count if it appears near "genre" context
    if (idx === -1) return false;
    const context = output.slice(Math.max(0, idx - 20), idx + kw.length + 20);
    return /体裁|genre|lens|透镜|判定/.test(context);
  });

  return {
    pass: found.length > 0,
    signal: found[0] || null,
    wrongSignal: wrongSignal || null,
    note: found.length > 0
      ? `检测到体裁信号: ${found[0]}`
      : wrongSignal
        ? `⚠️ 检测到错误体裁信号: ${wrongSignal}`
        : '未检测到明确体裁信号',
  };
}

/** Check for iron law violations (forbidden patterns) */
function checkIronLaws(output) {
  if (!output) return { violations: [], pass: true, note: '无输出' };

  const violations = [];

  // #2 不评价好坏
  if (/写得好|写得不错|很流畅|很精彩|优美的|出色的|excellent|well.written|beautifully|great writing/i.test(output)) {
    violations.push('#2 评价好坏');
  }

  // #3 不给台阶
  if (/你已经.*很|慢慢来|没关系的|不用着急|take your time|you're doing|你已经很棒/i.test(output)) {
    violations.push('#3 给台阶');
  }

  // #7 指向文本不指向人格
  if (/你是.*的人|你的风格是|你的问题是|you are a.*writer|your problem is/i.test(output)) {
    violations.push('#7 指向人格');
  }

  // #9 推≠替写 — command language
  if (/你应该|你必须|最好改成|建议你写成|should write|must change|need to rewrite|我推荐你/i.test(output)) {
    violations.push('#9 命令式替写');
  }

  // #10 动作句优先 — check for possibility language presence (positive indicator)
  const hasPossibility = /可能的|要不要|可以往|可以试试|试着|perhaps|maybe|consider|try|could|might/i.test(output);

  return {
    violations,
    hasPossibilityLanguage: hasPossibility,
    pass: violations.length === 0,
    note: violations.length === 0
      ? (hasPossibility ? '无违禁，有可能性语气 ✓' : '无违禁')
      : violations.join('; '),
  };
}

// ── Content quality heuristics ────────────────────────────────

/** Check if output has specific text anchoring (X-layer) */
function checkXLayer(output) {
  if (!output) return { pass: false, note: '无输出' };
  // Look for indicators: line numbers, quotes from text, specific references
  const hasQuotes = (output.match(/[""「」''"']/g) || []).length >= 2;
  const hasPositionWords = /第.*句|首句|末句|开头|结尾|第一段|第二段|first.*sentence|last.*line|opening|closing/i.test(output);
  const hasTextReference = /读者.*读到|读者.*感受到|reader.*see|reader.*encounter/i.test(output);

  return {
    pass: hasQuotes || hasPositionWords || hasTextReference,
    note: hasQuotes ? '引用原文' : hasPositionWords ? '位置指向' : hasTextReference ? '读者效果描述' : '缺少文本锚定',
  };
}

/** Check if output explains structural cause (Y-layer) */
function checkYLayer(output) {
  if (!output) return { pass: false, note: '无输出' };
  // Look for causal/structure language
  const hasStructure = /因为|导致|造成|形成了|原因是|来自于|because|creates|results in|due to|structure|pattern/i.test(output);
  const hasMechanism = /张力|节奏|结构|因果|信息|重复|意象|tension|rhythm|structure|causality|repetition|image/i.test(output);

  return {
    pass: hasStructure || hasMechanism,
    note: hasStructure ? '有因果/结构分析' : hasMechanism ? '有结构词汇' : '缺少结构归因',
  };
}

/** Check if Z-layer points to direction without substituting */
function checkZLayer(output) {
  if (!output) return { pass: false, note: '无输出' };
  // Direction indicators (not commands)
  const hasDirection = /可以|要不要|试着|往.*走|还没.*完成|还没.*展开|等.*完成|可能的|could|might|try|unfinished|waiting|possible/i.test(output);
  // Forbidden: commands
  const hasCommand = /应该|必须|最好|改成|should|must|need to|better rewrite/i.test(output);

  return {
    pass: hasDirection && !hasCommand,
    note: hasCommand ? '包含命令式措辞 ✗' : hasDirection ? '方向性语言 ✓' : '缺少方向指向',
  };
}

// ── Main evaluation ───────────────────────────────────────────

function evaluateOne(testId, expectedGenre, expectedLang, output, error) {
  const eval_ = { id: testId, expectedGenre, expectedLang };

  // G — Genre
  eval_.G = error ? { pass: false, note: error } : checkGenreSignal(output, expectedGenre);

  // X — Surface
  eval_.X = error ? { pass: false, note: error } : checkXLayer(output);

  // Y — Structure
  eval_.Y = error ? { pass: false, note: error } : checkYLayer(output);

  // Z — Direction
  eval_.Z = error ? { pass: false, note: error } : checkZLayer(output);

  // L — Language
  eval_.L = error ? { pass: false, note: error } : checkLanguage(output, expectedLang);

  // W — Word count
  eval_.W = error ? { pass: false, note: error } : checkWordCount(output, expectedLang);

  // I — Iron laws
  eval_.I = error ? { pass: false, note: error } : checkIronLaws(output);

  // Overall
  const dims = ['X', 'Y', 'Z', 'L', 'W', 'I'];
  const passCount = dims.filter(d => eval_[d].pass).length;
  eval_.overall = eval_.G.pass && passCount >= 4;
  eval_.passCount = passCount;
  eval_.totalDims = dims.length;

  return eval_;
}

function main() {
  console.log('🔍 Evaluating Ollama Spike results...\n');

  // Load results
  const testIds = Object.keys(EXPECTED);
  const evaluations = [];
  let errors = 0;

  for (const id of testIds) {
    const resultPath = join(RESULTS_DIR, `${id}.json`);
    if (!existsSync(resultPath)) {
      console.log(`  ${id}: ⚠️  No result file found — skipping`);
      evaluations.push({
        id,
        expectedGenre: EXPECTED[id],
        expectedLang: id.endsWith('1') || id.endsWith('3') || id.endsWith('5') ||
                       id.endsWith('7') || id.endsWith('9') ? 'ZH' : 'EN',
        G: { pass: false, note: '结果文件缺失' },
        X: { pass: false, note: '—' }, Y: { pass: false, note: '—' }, Z: { pass: false, note: '—' },
        L: { pass: false, note: '—' }, W: { pass: false, note: '—' }, I: { pass: false, note: '—' },
        overall: false, passCount: 0,
      });
      errors++;
      continue;
    }

    const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
    const expectedLang = result.language || (['T01','T03','T05','T07','T09','T11','T13'].includes(id) ? 'ZH' : 'EN');

    const eval_ = evaluateOne(id, EXPECTED[id], expectedLang, result.output, result.error);
    evaluations.push(eval_);

    const icon = eval_.overall ? '✅' : '❌';
    const dimStr = ['G','X','Y','Z','L','W','I']
      .map(d => eval_[d].pass ? `✅${d}` : `❌${d}`)
      .join(' ');
    console.log(`  ${icon} ${id} (${GENRE_CN[EXPECTED[id]] || EXPECTED[id]}) — ${dimStr}`);
  }

  // Generate report
  const passCount = evaluations.filter(e => e.overall).length;
  const total = evaluations.length;
  const pct = Math.round(passCount / total * 100);

  // Dimension breakdown
  const dimTotals = { G: 0, X: 0, Y: 0, Z: 0, L: 0, W: 0, I: 0 };
  for (const e of evaluations) {
    for (const d of Object.keys(dimTotals)) {
      if (e[d].pass) dimTotals[d]++;
    }
  }

  // By genre
  const byGenre = {};
  for (const e of evaluations) {
    const g = e.expectedGenre;
    if (!byGenre[g]) byGenre[g] = { total: 0, pass: 0 };
    byGenre[g].total++;
    if (e.overall) byGenre[g].pass++;
  }

  // By language
  const zhPass = evaluations.filter(e => e.expectedLang === 'ZH' && e.overall).length;
  const zhTotal = evaluations.filter(e => e.expectedLang === 'ZH').length;
  const enPass = evaluations.filter(e => e.expectedLang === 'EN' && e.overall).length;
  const enTotal = evaluations.filter(e => e.expectedLang === 'EN').length;

  // ── Build report ────────────────────────────────────────────
  const reportLines = [
    `# Ollama Spike 评估报告`,
    ``,
    `> 生成时间：${new Date().toISOString()}`,
    `> 模型：${process.env.OLLAMA_MODEL || 'qwen2.5:14b'}`,
    `> 基线：Claude Opus 4.8 — 14/14 PASS (100%)`,
    ``,
    `---`,
    ``,
    `## 总体结果`,
    ``,
    `| 指标 | 值 |`,
    `|------|----|`,
    `| 总用例 | ${total} |`,
    `| 通过 | ${passCount} |`,
    `| 失败 | ${total - passCount} |`,
    `| 通过率 | ${pct}% |`,
    `| 基线 (Claude) | 100% |`,
    ``,
    `### Spike 判定`,
    ``,
  ];

  if (pct >= 86) { // ≥12/14
    reportLines.push(`**✅ PASS — 优秀。** Qwen 2.5 14B 可承载文本透视镜推理负载。强烈推荐 Ollama 本地部署方案。`);
  } else if (pct >= 71) { // ≥10/14
    reportLines.push(`**✅ PASS — 可用。** Qwen 2.5 14B 基本可承载推理负载，但存在一些不足。包含 Ollama 方案但标注限制。`);
  } else if (pct >= 50) { // ≥7/14
    reportLines.push(`**⚠️  MARGINAL — 勉强可用。** Qwen 2.5 14B 在部分体裁上可用，但整体不足。仅推荐高级用户尝试，需标注大量限制。`);
  } else {
    reportLines.push(`**❌ FAIL — 不推荐。** Qwen 2.5 14B 无法可靠承载文本透视镜推理负载。Skill 仅标注 Claude API。`);
  }

  reportLines.push(
    ``,
    `---`,
    ``,
    `## 维度细分`,
    ``,
    `| 维度 | 通过 | 通过率 |`,
    `|------|------|--------|`,
  );
  for (const d of ['G', 'X', 'Y', 'Z', 'L', 'W', 'I']) {
    const dpct = Math.round(dimTotals[d] / total * 100);
    reportLines.push(`| ${d} | ${dimTotals[d]}/${total} | ${dpct}% |`);
  }

  reportLines.push(
    ``,
    `## 按体裁`,
    ``,
    `| 体裁 | 通过 | 通过率 |`,
    `|------|------|--------|`,
  );
  for (const [g, v] of Object.entries(byGenre)) {
    const gpct = Math.round(v.pass / v.total * 100);
    reportLines.push(`| ${GENRE_CN[g] || g} | ${v.pass}/${v.total} | ${gpct}% |`);
  }

  reportLines.push(
    ``,
    `## 按语言`,
    ``,
    `| 语言 | 通过 | 通过率 |`,
    `|------|------|--------|`,
    `| 中文 (ZH) | ${zhPass}/${zhTotal} | ${Math.round(zhPass/zhTotal*100)}% |`,
    `| 英文 (EN) | ${enPass}/${enTotal} | ${Math.round(enPass/enTotal*100)}% |`,
    ``,
    `---`,
    ``,
    `## 逐条详情`,
    ``,
  );

  for (const e of evaluations) {
    const icon = e.overall ? '✅' : '❌';
    reportLines.push(
      `### ${icon} ${e.id} — ${GENRE_CN[e.expectedGenre] || e.expectedGenre} (${e.expectedLang})`,
      ``,
      `| 维度 | 结果 | 备注 |`,
      `|------|------|------|`,
    );
    for (const d of ['G', 'X', 'Y', 'Z', 'L', 'W', 'I']) {
      const r = e[d];
      const dimIcon = r.pass ? '✅' : '❌';
      reportLines.push(`| ${d} | ${dimIcon} | ${r.note || '—'} |`);
    }
    reportLines.push(
      `| **整体** | ${icon} | ${e.passCount}/${e.totalDims} 维度通过 |`,
      ``,
    );
  }

  reportLines.push(
    `---`,
    ``,
    `## 与 Claude 基线对比`,
    ``,
    `| 维度 | Claude Opus 4.8 | Qwen 2.5 14B | 差距 |`,
    `|------|----------------|---------------|------|`,
  );
  for (const d of ['G', 'X', 'Y', 'Z', 'L', 'W', 'I']) {
    const dpct = Math.round(dimTotals[d] / total * 100);
    const gap = 100 - dpct;
    reportLines.push(`| ${d} | 14/14 (100%) | ${dimTotals[d]}/${total} (${dpct}%) | -${gap}% |`);
  }
  reportLines.push(
    `| **整体** | **14/14 (100%)** | **${passCount}/${total} (${pct}%)** | **-${100-pct}%** |`,
    ``,
    `---`,
    ``,
    `## 建议`,
    ``,
  );

  // Generate recommendations based on results
  if (dimTotals['L'] < total && dimTotals['W'] < total) {
    reportLines.push(`- **语言/字数**：Qwen 在语言一致性和输出长度控制上存在偏差——可能需要在 System Prompt 中增强约束。`);
  }
  if (dimTotals['Y'] < total * 0.8) {
    reportLines.push(`- **Y 层结构归因**：这是 Qwen 的主要弱项。考虑为 Qwen 提供更简化的 Y 层模板或降低 Y 层深度要求。`);
  }
  if (dimTotals['I'] < total * 0.8) {
    reportLines.push(`- **铁律合规**：Qwen 在 #9（推≠替写）和 #10（动作句优先）上可能不稳定。考虑在 System Prompt 中增加负面示例。`);
  }
  if (enPass / enTotal < zhPass / zhTotal) {
    reportLines.push(`- **英文输出**：英文用例通过率低于中文，符合预期（Qwen 训练数据以中文为主）。英文用户建议使用更大模型（32B）或标注限制。`);
  }
  if (pct >= 71) {
    reportLines.push(`- **总体**：Qwen 2.5 14B + Ollama 可作为 Claude API 的本地替代方案。建议在 README 中明确标注与 Claude 的差距（主要在 Y 层深度和动作句精确度上），并提供优化后的 Qwen 专用 Prompt。`);
  }

  reportLines.push(
    ``,
    `---`,
    ``,
    `*评估由 evaluate.mjs 自动生成。维度 G/X/Y/Z/I 为启发式自动检测（基于关键词匹配），仅供参考——人工复核建议标注在"备注"列中。*`,
  );

  const reportPath = join(RESULTS_DIR, '_evaluation.md');
  writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');

  // Console summary
  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`  Spike Result: ${passCount}/${total} PASS (${pct}%)`);
  if (pct >= 71) console.log(`  ✅ Ollama deployment RECOMMENDED`);
  else if (pct >= 50) console.log(`  ⚠️  Ollama deployment MARGINAL`);
  else console.log(`  ❌ Ollama deployment NOT RECOMMENDED`);
  console.log(`  Report: ${reportPath}`);
  console.log(`══════════════════════════════════════════════════`);
}

main();
