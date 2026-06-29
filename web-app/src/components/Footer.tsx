import type { ViewMode } from '../lib/hermes-types'

interface Props {
  mode?: ViewMode
  textsAnalyzed?: number
}

export default function Footer({ mode, textsAnalyzed }: Props) {
  return (
    <>
      <hr className="mx-auto max-w-[1200px] px-4 mt-12 mb-0" style={{ borderColor: 'var(--border-warm)' }} />
      {/* Skill CTA */}
      <div className="max-w-[1200px] mx-auto px-4 pt-4">
        <div
          className="rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          style={{
            backgroundColor: 'var(--bg-cream)',
            border: '1px solid var(--border-warm)',
          }}
        >
          <span className="text-sm font-medium font-[var(--font-serif)]" style={{ color: 'var(--text-ink)' }}>
            这是 Web 试吃装。完整诊断能力在 Claude Code 中。
          </span>
          <a
            href="https://github.com/dcctc5kf7z-byte/text-lens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium underline underline-offset-2 transition-colors whitespace-nowrap"
            style={{ color: 'var(--text-ink-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-ink-secondary)')}
          >
            安装 /text-lens Skill →
          </a>
        </div>
      </div>
      <footer className="max-w-[1200px] mx-auto px-4 py-4 pb-6 flex items-center justify-between">
        <span className="text-[13px] italic font-[var(--font-serif)]" style={{ color: 'var(--text-ink-tertiary)' }}>
          这是镜子，不是答案。笔在你手里。
        </span>
        {mode === 'my_text' && textsAnalyzed !== undefined && textsAnalyzed > 0 && (
          <span className="text-[12px] font-[var(--font-sans)] flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--hermes-pine-green)' }}
            />
            <span style={{ color: 'var(--text-ink-tertiary)' }}>
              写作指纹：已分析 {textsAnalyzed} 篇
            </span>
          </span>
        )}
      </footer>
    </>
  )
}
