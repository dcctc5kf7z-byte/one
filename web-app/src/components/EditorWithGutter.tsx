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
      // Submit is handled by parent — we just prevent default
      // The parent attaches the analyze handler via a form or direct callback
    }
  }, [])

  // Split text into lines for gutter alignment
  const lines = text.split('\n')

  const hasGutter = gutterBlocks && gutterBlocks.length > 0

  return (
    <div className="relative">
      <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:border-gray-400 transition-colors">
        {/* ── Gutter Column ── */}
        <div
          className={`flex-shrink-0 bg-gray-50 border-r border-gray-100 py-3 select-none ${
            hasGutter ? 'w-[52px]' : 'w-[52px]'
          }`}
        >
          {isLoading ? (
            // Loading pulse blocks
            Array.from({ length: Math.min(lines.length || 5, 15) }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-center h-[26px]"
              >
                <span className="w-3 h-3 rounded-sm bg-gray-200 animate-pulse" />
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
                className="flex items-center justify-end h-[26px] pr-2"
              >
                <span className="text-[10px] text-gray-300 select-none">
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
          className="flex-1 resize-none outline-none border-0 py-3 px-4 text-[15px] leading-[26px] bg-transparent text-gray-900 placeholder-gray-300 disabled:opacity-60"
          style={{
            fontFamily: "'Source Serif 4', 'Noto Serif SC', Georgia, serif",
            minHeight: '200px',
          }}
          spellCheck={false}
        />
      </div>

      {/* ── 字数统计 ── */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          {text.length} 字
        </span>
        {hasGutter && (
          <span className="text-xs text-gray-400">
            {gutterBlocks!.filter(b => b.length > 0).length} 行有信号
          </span>
        )}
      </div>
    </div>
  )
}
