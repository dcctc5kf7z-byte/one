interface Props {
  onClick: () => void
  isLoading: boolean
  disabled?: boolean
}

export default function AnalyzeButton({ onClick, isLoading, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full py-3 px-6 rounded-lg text-base font-medium transition-all duration-200 font-[var(--font-sans)] ${
        disabled || isLoading
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:opacity-90 active:scale-[0.98]'
      }`}
      style={{
        backgroundColor: disabled || isLoading ? 'var(--border-warm)' : 'var(--text-ink)',
        color: disabled || isLoading ? 'var(--text-ink-tertiary)' : '#FAF7F0',
        boxShadow: (disabled || isLoading) ? 'none' : '0 2px 8px rgba(44, 36, 22, 0.15)',
      }}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          分析中…
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          {/* 笔图标 */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
          透视这段文字
        </span>
      )}
    </button>
  )
}
