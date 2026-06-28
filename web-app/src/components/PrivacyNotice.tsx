export default function PrivacyNotice() {
  return (
    <div className="flex items-start gap-2">
      {/* 盾牌图标 */}
      <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-ink-tertiary)' }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <p className="text-[12px] leading-relaxed font-[var(--font-sans)]" style={{ color: 'var(--text-ink-tertiary)' }}>
        你的文字只在这一轮诊断中使用。诊断结束后不保存完整原文。
      </p>
    </div>
  )
}
