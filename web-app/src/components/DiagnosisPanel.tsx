import ReactMarkdown from 'react-markdown'
import type { ViewMode, SentenceAnalysis } from '../lib/hermes-types'
import { COLOR_MAP } from '../lib/hermes-types'
import SignalBar, { computeDominantColor } from './SignalBar'

interface Props {
  diagnosis: { analysis: string; push: string } | null
  sentences: SentenceAnalysis[] | null
  isLoading: boolean
  error: string | null
  mode: ViewMode
  pineGreenActive: boolean
}

export default function DiagnosisPanel({
  diagnosis,
  sentences,
  isLoading,
  error,
  mode,
  pineGreenActive,
}: Props) {
  const showPineGreenNote = mode === 'my_text' && !pineGreenActive
  const dominantColor = sentences ? computeDominantColor(sentences) : null
  const dominantHex = dominantColor ? COLOR_MAP[dominantColor].hex : undefined
  const hasSentences = sentences && sentences.length > 0

  // 推进方向边框色：有 crimson 用 crimson，否则 amber
  const hasCrimson = sentences?.some(s => s.colors.includes('crimson'))
  const pushBorderColor = hasCrimson ? COLOR_MAP['crimson'].hex : COLOR_MAP['amber'].hex

  const textsRemaining = (() => {
    try {
      const fp = JSON.parse(localStorage.getItem('hermes_fingerprint') || 'null')
      return Math.max(0, 3 - (fp?.texts_analyzed ?? 0))
    } catch { return 3 }
  })()

  return (
    <div
      className="rounded-xl overflow-hidden sticky top-6"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-warm)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* ── 顶部色条 ── */}
      <div
        className="w-full"
        style={{
          height: '3px',
          backgroundColor: dominantHex || 'var(--border-warm)',
          opacity: dominantHex ? 1 : 0.5,
        }}
      />

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--border-warm)' }}
      >
        <h3 className="text-sm font-medium font-[var(--font-serif)]" style={{ color: 'var(--text-ink)' }}>
          诊断
        </h3>
        <div className="flex items-center gap-2">
          {showPineGreenNote && (
            <span className="text-[11px] font-[var(--font-sans)]" style={{ color: 'var(--text-ink-tertiary)' }}>
              再分析 {textsRemaining} 篇后激活松绿
            </span>
          )}
          <span className="text-[11px] font-[var(--font-sans)]" style={{ color: 'var(--text-ink-tertiary)' }}>
            {mode === 'perspective' ? '透视模式' : '我的文字'}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-5 max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 rounded w-full mb-2" style={{ backgroundColor: 'var(--border-warm)' }} />
                <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--border-warm)', opacity: 0.6 }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--hermes-crimson)' }}>{error}</p>
          </div>
        ) : !diagnosis ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: 'var(--border-warm)' }}
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <p className="text-sm font-[var(--font-serif)]" style={{ color: 'var(--text-ink-tertiary)' }}>
              等待诊断…
            </p>
            <p className="text-xs mt-1 font-[var(--font-sans)]" style={{ color: 'var(--text-ink-tertiary)', opacity: 0.7 }}>
              输入文字后点击「透视这段文字」
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* SignalBar */}
            {hasSentences && <SignalBar sentences={sentences!} />}

            {/* Analysis (X→Y) */}
            <section
              className="pl-4"
              style={{ borderLeft: `3px solid ${COLOR_MAP['steel_blue'].hex}` }}
            >
              <h4
                className="text-[11px] font-medium uppercase tracking-wide mb-3 font-[var(--font-sans)]"
                style={{ color: 'var(--text-ink-tertiary)' }}
              >
                表面与结构
              </h4>
              <div className="diagnosis-content">
                <ReactMarkdown>{diagnosis.analysis}</ReactMarkdown>
              </div>
            </section>

            {/* Divider */}
            <hr style={{ borderColor: 'var(--border-warm)' }} />

            {/* Push (Z) */}
            <section
              className="pl-4"
              style={{ borderLeft: `3px solid ${pushBorderColor}` }}
            >
              <h4
                className="text-[11px] font-medium uppercase tracking-wide mb-3 font-[var(--font-sans)]"
                style={{ color: 'var(--text-ink-tertiary)' }}
              >
                推进方向
              </h4>
              <div
                className="diagnosis-content font-medium"
                style={{ color: 'var(--text-ink)' }}
              >
                <ReactMarkdown>{diagnosis.push}</ReactMarkdown>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
