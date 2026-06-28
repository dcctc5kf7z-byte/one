import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

// 加载 System Prompt
const promptPath = path.join(process.cwd(), "src/lib/system-prompt.txt");
const SYSTEM_PROMPT = fs.readFileSync(promptPath, "utf-8");

// Anthropic client 指向 api2d 代理
const client = new Anthropic({
  apiKey: process.env.API2D_KEY || "",
  baseURL: "https://oa.api2d.net",
});

export async function POST(request: Request) {
  try {
    const { text, previousText, retryCount = 0 } = await request.json();

    // 校验文字长度
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "EMPTY_TEXT", message: "请贴一段文字。" },
        { status: 400 }
      );
    }

    if (text.trim().length <= 20) {
      return NextResponse.json(
        {
          error: "TEXT_TOO_SHORT",
          message: "你需要至少一个完整的场景（20字以上）来做诊断。再贴一段试试。",
        },
        { status: 400 }
      );
    }

    // 构建用户消息
    let userMessage = text;
    if (retryCount > 0) {
      userMessage = `[用户不满意上一轮诊断，要求换角度。这是第 ${retryCount} 次追问。]\n\n${text}`;
    }
    if (previousText) {
      userMessage = `[上一轮用户提交的文字：]\n${previousText}\n\n[修改后的文字：]\n${text}`;
    }

    // 调用 API
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // 提取文本内容
    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // 解析诊断结果
    const diagnosis = parseDiagnosis(content);

    return NextResponse.json({ diagnosis, rawOutput: content });
  } catch (error: unknown) {
    console.error("Diagnose API error:", error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: "API_ERROR", message: `API 调用失败：${error.message}` },
        { status: 502 }
      );
    }

    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "UNKNOWN_ERROR", message },
      { status: 500 }
    );
  }
}

/**
 * 从 Markdown 输出中解析结构化诊断结果
 */
function parseDiagnosis(raw: string): {
  insight: string;
  xEffect: string;
  yGap: string;
  question: string;
  action: string;
  dimensions: {
    causality: string;
    drive: string;
    attention: string;
  };
  allTight: boolean;
} {
  const allTight = raw.includes("不需要诊断") || raw.includes("继续写下一段");

  const insight =
    extractSection(raw, "我注意到：", "这让读者感受到：") ||
    extractSection(raw, "我注意到：", "这让读者感受到") ||
    "";

  const xEffect =
    extractSection(raw, "这让读者感受到：", "问题出在：") ||
    extractSection(raw, "这让读者感受到", "问题出在") ||
    "";

  const yGap =
    extractSection(raw, "问题出在：", "下一步：") ||
    extractSection(raw, "问题出在", "下一步") ||
    "";

  const question =
    extractSection(raw, "下一步：", "→") ||
    extractSection(raw, "下一步", "→") ||
    "";

  const action =
    extractAfter(raw, "→", "三个维度：") ||
    extractAfter(raw, "→", "三个维度") ||
    "";

  const causality =
    extractLine(raw, "因果推进：") ||
    extractLine(raw, "因果推进") ||
    "";

  const drive =
    extractLine(raw, "人物驱力：") ||
    extractLine(raw, "人物驱力") ||
    "";

  const attention =
    extractLine(raw, "读者注意：") ||
    extractLine(raw, "读者注意") ||
    "";

  return {
    insight: cleanText(insight),
    xEffect: cleanText(xEffect),
    yGap: cleanText(yGap),
    question: cleanText(question),
    action: cleanText(action),
    dimensions: {
      causality: cleanText(causality),
      drive: cleanText(drive),
      attention: cleanText(attention),
    },
    allTight,
  };
}

function extractSection(text: string, start: string, end: string): string | null {
  const startIdx = text.indexOf(start);
  if (startIdx === -1) return null;
  const contentStart = startIdx + start.length;
  const endIdx = text.indexOf(end, contentStart);
  if (endIdx === -1) return text.slice(contentStart);
  return text.slice(contentStart, endIdx);
}

function extractAfter(text: string, marker: string, endMarker: string): string | null {
  const startIdx = text.indexOf(marker);
  if (startIdx === -1) return null;
  const contentStart = startIdx + marker.length;
  const endIdx = text.indexOf(endMarker, contentStart);
  if (endIdx === -1) return text.slice(contentStart);
  return text.slice(contentStart, endIdx);
}

function extractLine(text: string, marker: string): string | null {
  const idx = text.indexOf(marker);
  if (idx === -1) return null;
  const after = text.slice(idx + marker.length);
  const lineEnd = after.indexOf("\n");
  return lineEnd === -1 ? after : after.slice(0, lineEnd);
}

function cleanText(text: string): string {
  return text
    .replace(/^[-*]\s*/, "")
    .replace(/^—\s*/, "")
    .replace(/^：\s*/, "")
    .trim();
}
