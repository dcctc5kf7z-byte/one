/**
 * Hermes 诊断 — Edge Function 冒烟测试 (Node.js)
 * Phase 2 — 7 体裁 × 2 语言 = 14 段文本
 * 用法: node test/hermes-smoke.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENDPOINT = process.env.ENDPOINT || "https://fdhqqebbfbxisnnmyerg.supabase.co/functions/v1/hermes-diagnose";
const ANON_KEY = process.env.ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaHFxZWJiZmJ4aXNubm15ZXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzM3MTksImV4cCI6MjA5Nzk0OTcxOX0.x4-SBO6wVy4no3beJGtAYCkWRK6IXGznXasywoWC4t8";

const VALID_COLORS = ["crimson", "amber", "steel_blue", "violet", "slate_gray", "pine_green"];

// Load test texts from the existing JSON file
const testData = JSON.parse(readFileSync(resolve(__dirname, "ollama-spike/test-texts.json"), "utf-8"));
const TESTS = testData.tests;

async function testOne(test, index, total) {
  const label = `[${index + 1}/${total}] ${test.id} ${test.genre}/${test.language}`;
  process.stdout.write(`  ${label} ... `);

  try {
    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ text: test.text, mode: "perspective" }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.log(`FAIL (HTTP ${resp.status}: ${err.slice(0, 100)})`);
      return null;
    }

    const data = await resp.json();

    // Validate structure
    if (data.error) {
      console.log(`FAIL (${data.error}: ${data.message?.slice(0, 80)})`);
      return null;
    }

    // Check sentences
    if (!Array.isArray(data.sentences)) {
      console.log("FAIL (sentences not array)");
      return null;
    }
    for (const s of data.sentences) {
      if (!Array.isArray(s.colors) || s.colors.length === 0) {
        console.log(`FAIL (sentence ${s.index} missing colors)`);
        return null;
      }
      for (const c of s.colors) {
        if (!VALID_COLORS.includes(c)) {
          console.log(`FAIL (invalid color: ${c})`);
          return null;
        }
      }
    }

    // Check gutter_blocks
    if (!Array.isArray(data.gutter_blocks)) {
      console.log("FAIL (gutter_blocks not array)");
      return null;
    }

    // Check diagnosis
    const diag = data.diagnosis;
    if (!diag || typeof diag.analysis !== "string" || typeof diag.push !== "string") {
      console.log("FAIL (diagnosis incomplete)");
      return null;
    }
    if (diag.analysis.length < 10 || diag.push.length < 10) {
      console.log("FAIL (diagnosis too short)");
      return null;
    }

    // Check meta
    const endpoint = data.meta?.endpoint || "unknown";
    const mode = data.meta?.mode;
    if (mode !== "perspective") {
      console.log(`FAIL (wrong mode: ${mode})`);
      return null;
    }

    const colorSummary = data.sentences
      .flatMap((s) => s.colors)
      .filter((c, i, a) => a.indexOf(c) === i)
      .join(",");

    console.log(`PASS (${data.sentences.length} sentences, ${data.gutter_blocks.length} gutter rows, ${endpoint}, colors: ${colorSummary})`);
    return { id: test.id, endpoint, sentences: data.sentences.length, colors: colorSummary };
  } catch (err) {
    console.log(`FAIL (${err.message?.slice(0, 100)})`);
    return null;
  }
}

async function main() {
  console.log("══════════════════════════════════════════════");
  console.log("  Hermes Edge Function — 14 文本冒烟测试");
  console.log("══════════════════════════════════════════════");
  console.log("");
  console.log(`  端点: ${ENDPOINT}`);
  console.log("");

  const results = [];
  for (let i = 0; i < TESTS.length; i++) {
    const r = await testOne(TESTS[i], i, TESTS.length);
    results.push(r);
  }

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;

  console.log("");
  console.log("──────────────────────────────────────────────");
  console.log(`  通过: ${passed} / 失败: ${failed} / 共计: ${TESTS.length}`);
  console.log("");

  // Summary by genre
  const genres = {};
  for (let i = 0; i < TESTS.length; i++) {
    const g = TESTS[i].genre;
    if (!genres[g]) genres[g] = { total: 0, pass: 0 };
    genres[g].total++;
    if (results[i]) genres[g].pass++;
  }

  console.log("  体裁覆盖:");
  for (const [genre, stats] of Object.entries(genres)) {
    const icon = stats.pass === stats.total ? "✅" : "❌";
    console.log(`    ${icon} ${genre}: ${stats.pass}/${stats.total}`);
  }

  // Language summary
  const zhTotal = TESTS.filter((t) => t.language === "ZH").length;
  const enTotal = TESTS.filter((t) => t.language === "EN").length;
  const zhPass = results.filter((r, i) => r && TESTS[i].language === "ZH").length;
  const enPass = results.filter((r, i) => r && TESTS[i].language === "EN").length;
  console.log(`    🌐 ZH: ${zhPass}/${zhTotal}  EN: ${enPass}/${enTotal}`);

  console.log("");

  if (failed === 0) {
    console.log("  ✅ 全部通过！");
  } else {
    console.log(`  ❌ ${failed} 项失败:`);
    for (let i = 0; i < results.length; i++) {
      if (!results[i]) {
        console.log(`     ❌ ${TESTS[i].id} ${TESTS[i].genre}/${TESTS[i].language}`);
      }
    }
  }

  console.log("──────────────────────────────────────────────");
  process.exit(failed > 0 ? 1 : 0);
}

main();
