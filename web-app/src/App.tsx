import { useState, useCallback, useEffect } from 'react'
import type { HermesPhase, ViewMode, HermesHistoryEntry, HermesDiagnoseResponse } from './lib/hermes-types'
import { hermesDiagnose } from './lib/api'
import Header from './components/Header'
import EditorWithGutter from './components/EditorWithGutter'
import ModeSlider from './components/ModeSlider'
import DiagnosisPanel from './components/DiagnosisPanel'
import AnalyzeButton from './components/AnalyzeButton'
import HistoryPanel from './components/HistoryPanel'
import Footer from './components/Footer'
import PrivacyNotice from './components/PrivacyNotice'

function App() {
  // ── 输入 ──
  const [text, setText] = useState('')

  // ── 阶段 ──
  const [phase, setPhase] = useState<HermesPhase>('idle')

  // ── 模式 ──
  const [mode, setMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem('hermes_mode')
    return (stored === 'perspective' || stored === 'my_text') ? stored : 'perspective'
  })

  // ── API 结果 ──
  const [result, setResult] = useState<HermesDiagnoseResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── 历史 ──
  const [history, setHistory] = useState<HermesHistoryEntry[]>([])

  // ── 模式持久化 ──
  useEffect(() => {
    localStorage.setItem('hermes_mode', mode)
  }, [mode])

  // ── 调试：输出 API 结果（开发用） ──
  useEffect(() => {
    if (result) {
      console.debug('[Hermes] Diagnosis result:', {
        sentences: result.sentences.length,
        gutterLines: result.gutter_blocks.length,
        colors: new Set(result.sentences.flatMap(s => s.colors)),
        endpoint: result.meta.endpoint,
      })
    }
  }, [result])

  // ═══════════════════════════════════════════════════
  // 处理器
  // ═══════════════════════════════════════════════════

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) return

    setError(null)
    setPhase('analyzing')

    try {
      const fingerprint = mode === 'my_text'
        ? JSON.parse(localStorage.getItem('hermes_fingerprint') || 'null')
        : undefined

      const response = await hermesDiagnose(text, mode, fingerprint ?? undefined)
      setResult(response)

      // 我的文字模式：更新指纹
      if (mode === 'my_text' && response.fingerprint) {
        localStorage.setItem('hermes_fingerprint', JSON.stringify(response.fingerprint))
      }

      // 添加到历史
      setHistory(h => [...h, {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        mode,
        textSnippet: text.slice(0, 50),
        text,
        sentences: response.sentences,
        diagnosis: response.diagnosis,
        fingerprint_id: response.meta.fingerprint_id,
      }])

      setPhase('results_shown')
    } catch (err) {
      const message = err instanceof Error ? err.message : '诊断失败——再试一次。'
      setError(message)
      setPhase('idle')
    }
  }, [text, mode])

  const handleRetry = useCallback(() => {
    setError(null)
    handleAnalyze()
  }, [handleAnalyze])

  const handleReset = useCallback(() => {
    setText('')
    setResult(null)
    setError(null)
    setPhase('idle')
  }, [])

  const handleModeChange = useCallback((newMode: ViewMode) => {
    setMode(newMode)
    // 切换到我的文字模式时，如果已有分析结果，触发重新分析
    if (newMode === 'my_text' && result && text.trim()) {
      // 异步重新分析以启用松绿
      hermesDiagnose(text, newMode).then(response => {
        setResult(response)
        if (response.fingerprint) {
          localStorage.setItem('hermes_fingerprint', JSON.stringify(response.fingerprint))
        }
      }).catch(console.error)
    }
  }, [result, text])

  const handleTextChange = useCallback((newText: string) => {
    setText(newText)
    // 编辑文字时重置状态
    if (phase !== 'idle') {
      setResult(null)
      setError(null)
      setPhase('idle')
    }
  }, [phase])

  // ═══════════════════════════════════════════════════
  // 渲染
  // ═══════════════════════════════════════════════════

  const isLoading = phase === 'analyzing'
  const showResults = phase === 'results_shown' && result
  const isMyTextMode = mode === 'my_text'

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1A1A1A]">
      <div className="max-w-[1200px] mx-auto px-4 py-6 w-full">
        {/* ── 顶部：标题 + 模式滑块 ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <Header />
          <ModeSlider mode={mode} onChange={handleModeChange} disabled={isLoading} />
        </div>

        {/* ── 双列布局 ── */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── 左列：编辑区 + 分析按钮 ── */}
          <div className="w-full lg:w-[45%] flex flex-col gap-4">
            <EditorWithGutter
              text={text}
              onChange={handleTextChange}
              gutterBlocks={showResults ? result.gutter_blocks : null}
              isLoading={isLoading}
              disabled={isLoading}
            />

            <div className="flex flex-col gap-3">
              {phase === 'idle' && (
                <AnalyzeButton
                  onClick={handleAnalyze}
                  isLoading={false}
                  disabled={!text.trim()}
                />
              )}

              {phase === 'analyzing' && (
                <AnalyzeButton
                  onClick={() => {}}
                  isLoading={true}
                  disabled={true}
                />
              )}

              {error && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-red-700 text-sm flex-1">{error}</span>
                  <button
                    onClick={handleRetry}
                    className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors"
                  >
                    重试
                  </button>
                </div>
              )}

              <PrivacyNotice />
            </div>
          </div>

          {/* ── 右列：诊断面板 ── */}
          <div className="w-full lg:w-[55%]">
            <DiagnosisPanel
              diagnosis={showResults ? result.diagnosis : null}
              isLoading={isLoading}
              error={error}
              mode={mode}
              pineGreenActive={result?.meta.pine_green_active ?? false}
            />
          </div>
        </div>

        {/* ── 底部：历史面板（仅我的文字模式） ── */}
        {isMyTextMode && history.length > 0 && (
          <div className="mt-8">
            <HistoryPanel entries={history} />
          </div>
        )}

        {/* ── 底部操作（结果展示后） ── */}
        {showResults && (
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              重新开始
            </button>
            <span className="text-xs text-gray-400">
              {result.sentences.length} 句分析 · {result.meta.endpoint}
            </span>
          </div>
        )}
      </div>

      <Footer mode={mode} textsAnalyzed={
        isMyTextMode
          ? (() => {
              try {
                const fp = JSON.parse(localStorage.getItem('hermes_fingerprint') || 'null')
                return fp?.texts_analyzed ?? history.length
              } catch { return history.length }
            })()
          : undefined
      } />
    </div>
  )
}

export default App
