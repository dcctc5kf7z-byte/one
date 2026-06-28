import type { ViewMode } from '../lib/hermes-types'

interface Props {
  mode?: ViewMode
  textsAnalyzed?: number
}

export default function Footer({ mode, textsAnalyzed }: Props) {
  return (
    <>
      <hr className="mx-auto max-w-[1200px] px-4 mt-12 mb-0" style={{ borderColor: 'var(--border-warm)' }} />
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
