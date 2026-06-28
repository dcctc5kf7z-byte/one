import { useRef, useEffect, useCallback } from 'react'
import type { GutterBlock as GutterBlockType } from '../lib/hermes-types'
import GutterBlocks from './GutterBlock'

interface Props {
  text: string
  onChange: (text: string) => void
  gutterBlocks: GutterBlockType[][] | null
  isLoading: boolean
  disabled?: boolean
}

/** 计算主导信号色（按出现频率排序取 top 3） */
function dominantColors(gutterBlocks: GutterBlockType[][]): string[] {
  const counts = new Map<string, number>()
  for (const row of gutterBlocks) {
    for (const b of row) {
      counts.set(b.color, (counts.get(b.color) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color)
}

const COLOR_TO_HEX: Record<string, string> = {
  crimson: '#E03E3E',
  amber: '#D4A017',
  steel_blue: '#3B82C4',
  violet: '#7C3AED',
  slate_gray: '#6B7280',
  pine_green: '#10B981',
}

export default function EditorWithGutter({
  text,
  onChange,
  gutterBlocks,
  isLoading,
  disabled,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.max(200, ta.scrollHeight)}px`
  }, [text])

  // Ctrl+Enter handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Submit is handled by parent
    }
  }, [])

  const lines = text.split('\n')
  const hasGutter = gutterBlocks && gutterBlocks.length > 0
  const dominants = hasGutter ? dominantColors(gutterBlocks!) : []

  // 主导色渐变
  const gradientStyle = dominants.length > 0
    ? {
        borderLeft: '3px solid transparent',
        borderImage: `linear-gradient(to bottom, ${dominants.map(c => COLOR_TO_HEX[c] || c).join(', ')}) 1`,
      }
    : {}

  return (
    <div className="relative">
      <div
        className="flex rounded-xl overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-warm)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* ── Gutter Column（装订线） ── */}
        <div
          className="flex-shrink-0 py-3 select-none relative"
          style={{
            width: '48px',
            backgroundColor: 'rgba(44, 36, 22, 0.03)',
          }}
        >
          {/* 装订线右侧双线 */}
          <div
            className="absolute top-0 right-0 bottom-0"
            style={{
              width: '3px',
              background: `
                linear-gradient(to right,
                  transparent 0px,
                  var(--border-warm) 1px,
                  var(--border-warm) 1px,
                  transparent 2px,
                  var(--border-warm) 2px,
                  var(--border-warm) 2px,
                  transparent 3px
                )
              `,
              opacity: 0.4,
            }}
          />

          {isLoading ? (
            // Loading pulse blocks
            Array.from({ length: Math.min(lines.length || 5, 15) }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-center h-[26px]"
              >
                <span
                  className="w-8 h-1.5 rounded-sm animate-pulse"
                  style={{ backgroundColor: 'var(--border-warm)' }}
                />
              </div>
            ))
          ) : hasGutter ? (
            gutterBlocks!.map((blocks, i) => (
              <div
                key={i}
                className="flex items-center justify-center h-[26px] px-1"
              >
                <GutterBlocks blocks={blocks} maxVisible={3} />
              </div>
            ))
          ) : (
            // Empty gutter: subtle line numbers
            Array.from({ length: Math.max(lines.length, 5) }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-end h-[26px] pr-2.5"
              >
                <span className="text-[10px] select-none" style={{ color: 'var(--text-ink-tertiary)', opacity: 0.5 }}>
                  {i + 1}
                </span>
              </div>
            ))
          )}
        </div>

        {/* ── Text Area ── */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="开始写，或者粘贴文字到这里…"
          className="flex-1 resize-none outline-none border-0 py-3 px-4 text-[15px] leading-[26px] bg-transparent disabled:opacity-60"
          style={{
            fontFamily: "'Source Serif 4', 'Noto Serif SC', Georgia, serif",
            minHeight: '200px',
            color: 'var(--text-ink)',
            // 笔记本横线
            backgroundImage: text.length === 0
              ? `repeating-linear-gradient(
                  transparent,
                  transparent 25px,
                  rgba(229, 220, 200, 0.35) 25px,
                  rgba(229, 220, 200, 0.35) 26px
                )`
              : `repeating-linear-gradient(
                  transparent,
                  transparent 25px,
                  rgba(229, 220, 200, 0.15) 25px,
                  rgba(229, 220, 200, 0.15) 26px
                )`,
            backgroundAttachment: 'local',
            ...gradientStyle,
          }}
          spellCheck={false}
        />
      </div>

      {/* ── 字数统计 ── */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--text-ink-tertiary)', opacity: 0.4 }} />
          <span className="text-[11px] font-[var(--font-sans)]" style={{ color: 'var(--text-ink-tertiary)' }}>
            {text.length} 字
          </span>
        </div>
        {hasGutter && (
          <span className="text-[11px] font-[var(--font-sans)]" style={{ color: 'var(--text-ink-tertiary)' }}>
            {gutterBlocks!.filter(b => b.length > 0).length} 行有信号
          </span>
        )}
      </div>
    </div>
  )
}
