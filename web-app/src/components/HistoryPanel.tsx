import { useState } from 'react'
import type { HermesHistoryEntry, HermesColor } from '../lib/hermes-types'
import { COLOR_MAP, COLOR_URGENCY } from '../lib/hermes-types'
import { exportFingerprintJSON, importAndMergeFingerprint, getFingerprint, saveFingerprint } from '../lib/FingerprintManager'

interface Props {
  entries: HermesHistoryEntry[]
}

/** 获取条目的颜色光谱（按紧迫度排序，去重） */
function entryColorSpectrum(entry: HermesHistoryEntry): HermesColor[] {
  if (!entry.sentences) return []
  const all = entry.sentences.flatMap(s => s.colors)
  const unique = [...new Set(all)]
  return unique.sort((a, b) => COLOR_URGENCY.indexOf(a) - COLOR_URGENCY.indexOf(b))
}

export default function HistoryPanel({ entries }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm font-[var(--font-serif)]" style={{ color: 'var(--text-ink-tertiary)' }}>
        还没有分析记录。切换到「我的文字」模式后，分析会自动保存。
      </div>
    )
  }

  const handleExport = () => {
    const fp = getFingerprint()
    if (!fp) {
      setImportStatus('没有可导出的指纹数据')
      return
    }
    const json = exportFingerprintJSON(fp)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hermes-fingerprint-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text)
        if (!imported.fingerprint_id || !Array.isArray(imported.patterns)) {
          setImportStatus('文件格式不正确——缺少 fingerprint_id 或 patterns')
          return
        }
        const existing = getFingerprint()
        const merged = importAndMergeFingerprint(existing, imported)
        saveFingerprint(merged)
        setImportStatus(`已合并：${merged.patterns.length} 个模式，${merged.texts_analyzed} 篇文本`)
      } catch {
        setImportStatus('文件解析失败——请确认是有效的指纹 JSON')
      }
    }
    input.click()
  }

  return (
    <div className="pt-6" style={{ borderTop: `1px solid var(--border-warm)` }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium font-[var(--font-serif)]" style={{ color: 'var(--text-ink)' }}>
          分析历史
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            className="text-[11px] transition-colors font-[var(--font-sans)]"
            style={{ color: 'var(--text-ink-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-ink-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-ink-tertiary)')}
          >
            导入指纹
          </button>
          <button
            onClick={handleExport}
            className="text-[11px] transition-colors font-[var(--font-sans)]"
            style={{ color: 'var(--text-ink-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-ink-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-ink-tertiary)')}
          >
            导出指纹
          </button>
        </div>
      </div>

      {importStatus && (
        <div
          className="mb-3 p-2.5 rounded-lg text-xs font-[var(--font-sans)]"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-ink-secondary)',
            border: '1px solid var(--border-warm)',
          }}
        >
          {importStatus}
          <button
            onClick={() => setImportStatus(null)}
            className="ml-2 hover:opacity-70"
            style={{ color: 'var(--text-ink-tertiary)' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {[...entries].reverse().map(entry => {
          const isExpanded = expandedId === entry.id
          const spectrum = entryColorSpectrum(entry)

          return (
            <div
              key={entry.id}
              className="rounded-lg overflow-hidden flex"
              style={{
                border: '1px solid var(--border-warm)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              {/* 左侧颜色光谱条 */}
              {spectrum.length > 0 && (
                <div
                  className="flex-shrink-0 flex"
                  style={{ width: '4px', flexDirection: 'column' }}
                >
                  {spectrum.map((c) => (
                    <span
                      key={c}
                      style={{
                        flex: '1 1 0',
                        backgroundColor: COLOR_MAP[c].hex,
                        minHeight: '4px',
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Row header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(44, 36, 22, 0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span className="text-xs tabular-nums min-w-[4.5em] font-[var(--font-sans)]" style={{ color: 'var(--text-ink-tertiary)' }}>
                    {new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  <span className="flex-1 text-[13px] truncate font-[var(--font-serif)]" style={{ color: 'var(--text-ink-secondary)' }}>
                    {entry.textSnippet}
                  </span>

                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ color: 'var(--text-ink-tertiary)' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 pb-3" style={{ borderTop: '1px solid var(--border-warm)' }}>
                    <div className="mt-2 text-[13px] leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap font-[var(--font-serif)]" style={{ color: 'var(--text-ink-secondary)' }}>
                      <div className="text-[11px] mb-1 font-[var(--font-sans)]" style={{ color: 'var(--text-ink-tertiary)' }}>分析：</div>
                      {entry.diagnosis.analysis.slice(0, 500)}
                      {entry.diagnosis.analysis.length > 500 && '…'}
                      <hr className="my-2" style={{ borderColor: 'var(--border-warm)' }} />
                      <div className="text-[11px] mb-1 font-[var(--font-sans)]" style={{ color: 'var(--text-ink-tertiary)' }}>推进：</div>
                      {entry.diagnosis.push.slice(0, 300)}
                      {entry.diagnosis.push.length > 300 && '…'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
