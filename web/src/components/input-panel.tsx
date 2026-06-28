"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface InputPanelProps {
  onDiagnose: (text: string) => void;
  isLoading: boolean;
  initialText?: string;
  minLength?: number;
  maxLength?: number;
}

export function InputPanel({
  onDiagnose,
  isLoading,
  initialText = "",
  minLength = 20,
  maxLength = 500,
}: InputPanelProps) {
  const [text, setText] = useState(initialText);
  const charCount = text.length;
  const isTooShort = charCount > 0 && charCount < minLength;
  const isLong = charCount > maxLength;

  const handleSubmit = () => {
    if (text.trim().length >= minLength && !isLoading) {
      onDiagnose(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter 提交
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* TextArea + 字数统计容器 */}
      <div className="relative">
        <label htmlFor="user-text" className="sr-only">
          粘贴你要诊断的文字
        </label>
        <Textarea
          id="user-text"
          placeholder="把你觉得不对劲的文字贴过来..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[200px] resize-y text-[15px] leading-[1.75] font-serif
            bg-transparent border-[#E0E0DF] placeholder:text-[#8A8A8A]
            focus-visible:border-foreground focus-visible:ring-2
            focus-visible:ring-foreground focus-visible:ring-offset-0
            rounded-lg transition-all duration-200"
          disabled={isLoading}
          rows={10}
        />

        {/* 字数统计 */}
        <div className="flex justify-end items-center gap-2 mt-1.5">
          <span
            className={`text-[13px] select-none ${
              isTooShort
                ? "font-medium"
                : "text-muted-foreground"
            }`}
          >
            {charCount} 字
          </span>
          {isTooShort && (
            <span className="text-[13px] text-muted-foreground">
              · 还需 {minLength - charCount} 字
            </span>
          )}
        </div>
      </div>

      {/* 长文本提示 */}
      {isLong && (
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          文字较长，系统会挑出最需要诊断的段落。
        </p>
      )}

      {/* 诊断按钮 */}
      <Button
        onClick={handleSubmit}
        disabled={isLoading || charCount < minLength}
        variant="default"
        size="lg"
        className="h-12 w-full sm:w-[140px] text-[15px] font-medium rounded-lg
          bg-[#1A1A1A] text-white
          hover:bg-[#0D0D0D]
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200"
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse"
              style={{ animationDelay: "0ms" }}
              aria-hidden="true"
            />
            <span
              className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse"
              style={{ animationDelay: "200ms" }}
              aria-hidden="true"
            />
            <span
              className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse"
              style={{ animationDelay: "400ms" }}
              aria-hidden="true"
            />
          </span>
        ) : (
          "开始诊断"
        )}
      </Button>
    </div>
  );
}
