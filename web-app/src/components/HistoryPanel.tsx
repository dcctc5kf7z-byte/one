import { useState } from 'react'
import type { HermesHistoryEntry } from '../lib/hermes-types'
import { COLOR_MAP } from '../lib/hermes-types'
import { exportFingerprintJSON, importAndMergeFingerprint, getFingerprint, saveFingerprint } from '../lib/FingerprintManager'

interface Props {
  entries: HermesHistoryEntry[]
}

export default function HistoryPanel({ entries }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
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
    <div className="border-t border-gray-100 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">分析历史</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            导入指纹
          </button>
          <button
            onClick={handleExport}
            className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            导出指纹
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-500">
          {importStatus}
          <button
            onClick={() => setImportStatus(null)}
            className="ml-2 text-gray-300 hover:text-gray-500"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {[...entries].reverse().map(entry => {
          const isExpanded = expandedId === entry.id
          const dominantColors = entry.sentences
            ? [...new Set(entry.sentences.flatMap(s => s.colors))].slice(0, 3)
            : []

          return (
            <div key={entry.id} className="border border-gray-100 rounded-lg overflow-hidden">
              {/* Row header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs text-gray-400 tabular-nums min-w-[4em]">
                  {new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                <span className="flex-1 text-[13px] text-gray-600 truncate">
                  {entry.textSnippet}
                </span>

                {dominantColors.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    {dominantColors.map(c => (
                      <span
                        key={c}
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: COLOR_MAP[c].hex }}
                        title={COLOR_MAP[c].signal}
                      />
                    ))}
                  </span>
                )}

                <svg
                  className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-50">
                  <div className="mt-2 text-[13px] text-gray-500 leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                    <div className="text-xs text-gray-400 mb-1">分析：</div>
                    {entry.diagnosis.analysis.slice(0, 500)}
                    {entry.diagnosis.analysis.length > 500 && '…'}
                    <hr className="my-2 border-gray-50" />
                    <div className="text-xs text-gray-400 mb-1">推进：</div>
                    {entry.diagnosis.push.slice(0, 300)}
                    {entry.diagnosis.push.length > 300 && '…'}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
