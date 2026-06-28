"use client";

import type { Diagnosis } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface OutputPanelProps {
  diagnosis: Diagnosis | null;
  isLoading: boolean;
  error: string | null;
  retryCount: number;
  onRetry: () => void;
  onReset: () => void;
}

export function OutputPanel({
  diagnosis,
  isLoading,
  error,
  retryCount,
  onRetry,
  onReset,
}: OutputPanelProps) {
  // 空闲状态——隐藏
  if (!diagnosis && !isLoading && !error) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 min-h-[300px]" role="region" aria-label="诊断报告区">
      {/* 加载骨架屏 */}
      {isLoading && <DiagnosisSkeleton />}

      {/* 错误状态 */}
      {error && !isLoading && (
        <div
          className="flex flex-col items-center gap-4 py-12 text-center"
          role="alert"
        >
          <p className="text-[15px] text-muted-foreground max-w-sm leading-relaxed">
            {error}
          </p>
          <Button
            onClick={onRetry}
            variant="outline"
            size="default"
            className="border-foreground text-foreground hover:bg-foreground hover:text-background
              transition-colors duration-200 rounded-lg cursor-pointer"
          >
            再试一次
          </Button>
        </div>
      )}

      {/* 诊断报告 */}
      {diagnosis && !isLoading && (
        <article
          className="animate-in fade-in duration-200"
          aria-busy={false}
        >
          {/* "我注意到"——左边框强调 */}
          {diagnosis.insight && (
            <section className="mb-6 border-l-2 border-foreground pl-4">
              <p className="text-[15px] leading-[1.6] text-foreground max-w-prose">
                我注意到：{diagnosis.insight}
              </p>
            </section>
          )}

          {/* 读者效果 */}
          {diagnosis.xEffect && (
            <section className="mb-6">
              <p className="text-[15px] leading-[1.6] text-foreground max-w-prose">
                这让读者感受到：{diagnosis.xEffect}
              </p>
            </section>
          )}

          {/* 执行缺口 */}
          {diagnosis.yGap && (
            <section className="mb-6">
              <p className="text-[15px] leading-[1.6] text-foreground max-w-prose">
                问题出在：{diagnosis.yGap}
              </p>
            </section>
          )}

          {/* 约束问题 + 动作指令 */}
          {diagnosis.question && (
            <section className="mb-6">
              <p className="text-[15px] leading-[1.6] text-foreground max-w-prose mb-3">
                下一步：{diagnosis.question}
              </p>
              {diagnosis.action && (
                <p className="text-[15px] font-medium leading-[1.6] text-foreground max-w-prose">
                  → {diagnosis.action}
                </p>
              )}
            </section>
          )}

          {/* 三个维度 */}
          {!diagnosis.allTight && (
            <section className="mt-8 pt-4 border-t border-border">
              <div className="flex flex-col gap-2">
                {diagnosis.dimensions.causality && (
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    · 因果推进：{diagnosis.dimensions.causality}
                  </p>
                )}
                {diagnosis.dimensions.drive && (
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    · 人物驱力：{diagnosis.dimensions.drive}
                  </p>
                )}
                {diagnosis.dimensions.attention && (
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    · 读者注意：{diagnosis.dimensions.attention}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* 三个维度全紧 */}
          {diagnosis.allTight && (
            <section className="mt-8 pt-4 border-t border-border">
              <p className="text-[15px] leading-[1.6] text-foreground max-w-prose">
                这段不需要诊断。因果在往前推、人物在驱动自己、读者有东西可等。继续写下一段。
              </p>
            </section>
          )}

          {/* 操作按钮区 */}
          <div className="flex items-center gap-3 mt-8 pt-4 border-t border-border">
            {retryCount < 2 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={onRetry}
                  variant="outline"
                  size="default"
                  className="h-11 min-w-[44px] border-foreground text-foreground
                    hover:bg-foreground hover:text-background
                    transition-colors duration-200 rounded-lg cursor-pointer
                    text-[15px]"
                  aria-label={`不对，换一个角度（已追问 ${retryCount} 次）`}
                >
                  不对，换一个角度
                </Button>
                <span className="text-[13px] text-muted-foreground select-none">
                  角度 {retryCount + 1}/2
                </span>
              </div>
            )}
            {retryCount >= 2 && (
              <Button
                onClick={onReset}
                variant="outline"
                size="default"
                className="h-11 border-foreground text-foreground
                  hover:bg-foreground hover:text-background
                  transition-colors duration-200 rounded-lg cursor-pointer
                  text-[15px]"
              >
                换一段文字试试
              </Button>
            )}
          </div>
        </article>
      )}
    </div>
  );
}

/** 诊断报告骨架屏 */
function DiagnosisSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      {/* 我注意到 */}
      <div className="border-l-2 border-muted pl-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* 读者感受 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      {/* 执行缺口 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      {/* 下一步 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </div>
      {/* 三个维度 */}
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
