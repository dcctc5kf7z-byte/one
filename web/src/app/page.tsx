"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { InputPanel } from "@/components/input-panel";
import { OutputPanel } from "@/components/output-panel";
import type { Diagnosis } from "@/lib/types";

export default function Home() {
  const [text, setText] = useState("");
  const [previousText, setPreviousText] = useState("");
  const [previousDiagnosis, setPreviousDiagnosis] = useState<Diagnosis | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiagnose = useCallback(
    async (inputText: string) => {
      // 清空旧错误，进入加载
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch("/api/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: inputText,
            previousText: retryCount === 0 ? previousText : previousText,
            retryCount,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "诊断失败，再试一次。");
          return;
        }

        // 如果是首次诊断（非追问），保存当前文字和结果
        if (retryCount === 0) {
          setPreviousText(text);
          setPreviousDiagnosis(diagnosis);
        }

        setDiagnosis(data.diagnosis);
        setRawOutput(data.rawOutput);
        setText(inputText);
      } catch {
        setError("网络请求失败——检查网络后再试一次。");
      } finally {
        setIsLoading(false);
      }
    },
    [retryCount, previousText, text, diagnosis]
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount((prev) => prev + 1);
    // 用当前文字重新诊断（带追问标记）
    handleDiagnose(text);
  }, [text, handleDiagnose]);

  const handleReset = useCallback(() => {
    setText("");
    setPreviousText("");
    setPreviousDiagnosis(null);
    setDiagnosis(null);
    setRawOutput(null);
    setRetryCount(0);
    setError(null);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-full">
      <Header />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 桌面端：左右分栏 */}
        <div className="flex flex-col lg:flex-row lg:gap-8 gap-6">
          {/* 输入区 */}
          <section className="flex-1 lg:max-w-[40%]" aria-label="文字输入区">
            <InputPanel
              onDiagnose={handleDiagnose}
              isLoading={isLoading}
              initialText={text}
            />
          </section>

          {/* 报告区 */}
          <section className="flex-1 lg:max-w-[60%]" aria-label="诊断报告区">
            <OutputPanel
              diagnosis={diagnosis}
              isLoading={isLoading}
              error={error}
              retryCount={retryCount}
              onRetry={handleRetry}
              onReset={handleReset}
            />
          </section>
        </div>
      </main>

      <Footer />

      {/* 调试：打印完整 AI 输出（开发阶段用，上线删除） */}
      {rawOutput && process.env.NODE_ENV === "development" && (
        <details className="fixed bottom-2 left-2 opacity-50 hover:opacity-100 text-xs max-w-md">
          <summary className="cursor-pointer select-none text-muted-foreground">
            原始输出
          </summary>
          <pre className="bg-muted p-2 rounded mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed">
            {rawOutput}
          </pre>
        </details>
      )}
    </div>
  );
}
