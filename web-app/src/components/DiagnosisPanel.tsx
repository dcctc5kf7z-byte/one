import ReactMarkdown from 'react-markdown'
import type { ViewMode } from '../lib/hermes-types'

interface Props {
  diagnosis: { analysis: string; push: string } | null
  isLoading: boolean
  error: string | null
  mode: ViewMode
  pineGreenActive: boolean
}

export default function DiagnosisPanel({
  diagnosis,
  isLoading,
  error,
  mode,
  pineGreenActive,
}: Props) {
  const showPineGreenNote = mode === 'my_text' && !pineGreenActive

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden sticky top-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-medium text-gray-700">诊断</h3>
        <div className="flex items-center gap-2">
          {showPineGreenNote && (
            <span className="text-[11px] text-gray-400">
              再分析 {3 - (() => { try { const fp = JSON.parse(localStorage.getItem('hermes_fingerprint') || 'null'); return fp?.texts_analyzed ?? 0 } catch { return 0 } })()} 篇后激活松绿
            </span>
          )}
          <span className="text-[11px] text-gray-400">
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
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : !diagnosis ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <p className="text-sm text-gray-400">等待诊断…</p>
            <p className="text-xs text-gray-300 mt-1">输入文字后点击「透视这段文字」</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Analysis (X→Y) */}
            <section>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                表面与结构
              </h4>
              <div className="diagnosis-content text-sm leading-relaxed text-gray-700">
                <ReactMarkdown>{diagnosis.analysis}</ReactMarkdown>
              </div>
            </section>

            {/* Divider */}
            <hr className="border-gray-100" />

            {/* Push (Z) */}
            <section>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                推进方向
              </h4>
              <div className="diagnosis-content text-sm leading-relaxed text-gray-800 font-medium">
                <ReactMarkdown>{diagnosis.push}</ReactMarkdown>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
