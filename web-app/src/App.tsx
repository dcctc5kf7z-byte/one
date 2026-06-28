import { useState, useCallback } from 'react'
import { Layout, Row, Col, Button, Result, Typography } from 'antd'
import type { AppPhase, WritingState, DiagnosisMeta, ParsedConfirmation, HistoryEntry } from './lib/types'
import { parseConfirmation } from './lib/state-parser'
import { diagnose } from './lib/api'
import Header from './components/Header'
import InputPanel from './components/InputPanel'
import DiagnoseButton from './components/DiagnoseButton'
import DiagnosticReport from './components/DiagnosticReport'
import StateConfirmation from './components/StateConfirmation'
import StatePicker from './components/StatePicker'
import ActionBar from './components/ActionBar'
import Footer from './components/Footer'
import PrivacyNotice from './components/PrivacyNotice'
import QuotaBadge from './components/QuotaBadge'
import PaymentWall from './components/PaymentWall'
import HistoryPanel from './components/HistoryPanel'

const { Content } = Layout
const { Text } = Typography

const MAX_RETRIES = 2   // 0-indexed: 首次 + 2 次换角度 = 3 次总计
const MAX_FAILURES = 3   // 连续 API 失败上限
const QUOTA_TOTAL = 3    // 每日免费次数

function App() {
  // ── 输入 ──
  const [text, setText] = useState('')

  // ── 阶段 ──
  const [phase, setPhase] = useState<AppPhase>('input')

  // ── API 结果 ──
  const [currentDiagnosis, setCurrentDiagnosis] = useState<string | null>(null)
  const [currentMeta, setCurrentMeta] = useState<DiagnosisMeta | null>(null)
  const [parsedConfirmation, setParsedConfirmation] = useState<ParsedConfirmation | null>(null)
  const [confirmedState, setConfirmedState] = useState<WritingState | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── 会话连续性 ──
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [previousState, setPreviousState] = useState<WritingState | null>(null)
  const [sameStateCount, setSameStateCount] = useState(0)

  // ── 重试 / 失败 ──
  const [retryCount, setRetryCount] = useState(0)
  const [failedAttempts, setFailedAttempts] = useState(0)

  // ── 计费 ──
  const [quotaUsed, setQuotaUsed] = useState(0)

  // ── 历史 ──
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // ── 派生状态 ──
  const isInputDisabled = phase !== 'input'
  const isLoading = phase === 'diagnosing' || phase === 're_diagnosing'
  const quotaExhausted = quotaUsed >= QUOTA_TOTAL

  // ═══════════════════════════════════════════════════
  // 处理器（全部保持不变）
  // ═══════════════════════════════════════════════════

  const shouldSkipConfirmation = useCallback((parsed: ParsedConfirmation): boolean => {
    return parsed.state === previousState && sameStateCount >= 2
  }, [previousState, sameStateCount])

  const handleDiagnose = useCallback(async () => {
    if (quotaUsed >= QUOTA_TOTAL) return

    setError(null)
    setPhase('diagnosing')

    try {
      const result = await diagnose(text, 0, conversationId ?? undefined)
      setCurrentDiagnosis(result.diagnosis)
      setCurrentMeta(result.meta)
      setRetryCount(0)
      setFailedAttempts(0)

      if (result.meta.conversationId && !conversationId) {
        setConversationId(result.meta.conversationId)
      }

      const parsed = parseConfirmation(result.diagnosis)
      if (parsed && !shouldSkipConfirmation(parsed)) {
        setParsedConfirmation(parsed)
        setPhase('confirming')
      } else {
        const finalState = parsed?.state ?? 'writing'
        setConfirmedState(finalState)
        setParsedConfirmation(null)
        setPhase('diagnosis_shown')
        setQuotaUsed(q => q + 1)
        setHistory(h => [...h, {
          id: crypto.randomUUID(),
          textSnippet: text.slice(0, 50),
          diagnosis: result.diagnosis,
          confirmedState: finalState,
          timestamp: Date.now(),
        }])
        if (finalState === previousState) {
          setSameStateCount(c => c + 1)
        } else {
          setPreviousState(finalState)
          setSameStateCount(1)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '诊断失败——再试一次。'
      setError(message)
      setFailedAttempts(f => {
        const next = f + 1
        if (next >= MAX_FAILURES) {
          setPhase('exhausted')
        } else {
          setPhase('input')
        }
        return next
      })
    }
  }, [text, conversationId, quotaUsed, shouldSkipConfirmation, previousState])

  const handleConfirm = useCallback(() => {
    if (!parsedConfirmation || !currentDiagnosis) return

    const { state } = parsedConfirmation
    setConfirmedState(state)
    setPhase('diagnosis_shown')

    setQuotaUsed(q => q + 1)

    setHistory(h => [...h, {
      id: crypto.randomUUID(),
      textSnippet: text.slice(0, 50),
      diagnosis: currentDiagnosis,
      confirmedState: state,
      timestamp: Date.now(),
    }])

    if (state === previousState) {
      setSameStateCount(c => c + 1)
    } else {
      setPreviousState(state)
      setSameStateCount(1)
    }
  }, [parsedConfirmation, currentDiagnosis, text, previousState])

  const handleCorrect = useCallback(() => {
    setPhase('correcting')
  }, [])

  const handleStateSelect = useCallback(async (correctedState: WritingState) => {
    setPhase('re_diagnosing')
    setError(null)

    try {
      const result = await diagnose(text, retryCount, conversationId ?? undefined, correctedState)
      setCurrentDiagnosis(result.diagnosis)
      setCurrentMeta(result.meta)
      setConfirmedState(correctedState)
      setParsedConfirmation(null)
      setFailedAttempts(0)
      setPhase('diagnosis_shown')

      setHistory(h => [...h, {
        id: crypto.randomUUID(),
        textSnippet: text.slice(0, 50),
        diagnosis: result.diagnosis,
        confirmedState: correctedState,
        timestamp: Date.now(),
      }])

      setPreviousState(correctedState)
      setSameStateCount(0)
    } catch (err) {
      const message = err instanceof Error ? err.message : '诊断失败——再试一次。'
      setError(message)
      setFailedAttempts(f => {
        const next = f + 1
        if (next >= MAX_FAILURES) {
          setPhase('exhausted')
        } else {
          setPhase('input')
        }
        return next
      })
    }
  }, [text, retryCount, conversationId])

  const handleCancelCorrection = useCallback(() => {
    setPhase('confirming')
  }, [])

  const handleContinueWriting = useCallback(() => {
    setText('')
    setCurrentDiagnosis(null)
    setCurrentMeta(null)
    setParsedConfirmation(null)
    setConfirmedState(null)
    setRetryCount(0)
    setError(null)
    setFailedAttempts(0)
    setConversationId(null)
    setPhase('input')
  }, [])

  const handleDifferentAngle = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) return

    const newRetryCount = retryCount + 1
    setRetryCount(newRetryCount)
    setPhase('re_diagnosing')
    setError(null)

    try {
      const result = await diagnose(text, newRetryCount, conversationId ?? undefined)
      setCurrentDiagnosis(result.diagnosis)
      setCurrentMeta(result.meta)
      setFailedAttempts(0)

      if (result.meta.conversationId && !conversationId) {
        setConversationId(result.meta.conversationId)
      }

      const parsed = parseConfirmation(result.diagnosis)
      if (parsed && !shouldSkipConfirmation(parsed)) {
        setParsedConfirmation(parsed)
        setPhase('confirming')
      } else {
        const finalState = parsed?.state ?? 'writing'
        setConfirmedState(finalState)
        setParsedConfirmation(null)
        setPhase('diagnosis_shown')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '诊断失败——再试一次。'
      setError(message)
      setFailedAttempts(f => {
        const next = f + 1
        if (next >= MAX_FAILURES) {
          setPhase('exhausted')
        } else {
          setPhase('input')
        }
        return next
      })
    }
  }, [text, retryCount, conversationId, shouldSkipConfirmation])

  const handleTextChange = useCallback((newText: string) => {
    setText(newText)
    if (newText !== text && phase !== 'input') {
      setCurrentDiagnosis(null)
      setCurrentMeta(null)
      setParsedConfirmation(null)
      setConfirmedState(null)
      setRetryCount(0)
      setError(null)
      setPhase('input')
    }
  }, [text, phase])

  const handleReset = useCallback(() => {
    setText('')
    setCurrentDiagnosis(null)
    setCurrentMeta(null)
    setParsedConfirmation(null)
    setConfirmedState(null)
    setRetryCount(0)
    setError(null)
    setFailedAttempts(0)
    setConversationId(null)
    setPhase('input')
  }, [])

  // ═══════════════════════════════════════════════════
  // 渲染（使用 antd 组件）
  // ═══════════════════════════════════════════════════

  const stateLabels: Record<WritingState, string> = {
    empty: '空虚', vague_idea: '模糊念头', writing: '写作中',
    stuck: '卡住了', finished: '写完了',
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#FAFAF9' }}>
      <Content style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', width: '100%' }}>
        {/* 顶部标题栏 */}
        <Row justify="space-between" align="top" style={{ marginBottom: 32 }}>
          <Col>
            <Header />
          </Col>
          <Col>
            <QuotaBadge used={quotaUsed} total={QUOTA_TOTAL} />
          </Col>
        </Row>

        {/* 双列布局 */}
        <Row gutter={[32, 24]}>
          {/* ── 左列：输入区 ── */}
          <Col xs={24} lg={10}>
            {quotaExhausted && phase === 'input' ? (
              <PaymentWall />
            ) : phase === 'exhausted' ? (
              <Result
                status="error"
                title="暂时无法连接诊断服务"
                subTitle={`连续 ${failedAttempts} 次连接失败。请稍后再试。`}
                extra={
                  <Button type="primary" onClick={handleReset}>
                    重新开始
                  </Button>
                }
              />
            ) : (
              <>
                <InputPanel
                  text={text}
                  onChange={handleTextChange}
                  disabled={isInputDisabled}
                />
                {phase === 'input' && !quotaExhausted && (
                  <div style={{ marginTop: 16 }}>
                    <DiagnoseButton
                      onClick={handleDiagnose}
                      isLoading={false}
                    />
                  </div>
                )}
                <PrivacyNotice />
              </>
            )}
          </Col>

          {/* ── 右列：报告区 ── */}
          <Col xs={24} lg={14}>
            {phase === 'confirming' && parsedConfirmation ? (
              <StateConfirmation
                stateLabel={parsedConfirmation.stateLabel}
                onConfirm={handleConfirm}
                onCorrect={handleCorrect}
              />
            ) : phase === 'correcting' && parsedConfirmation ? (
              <StatePicker
                currentStateLabel={parsedConfirmation.stateLabel}
                onSelect={handleStateSelect}
                onCancel={handleCancelCorrection}
              />
            ) : (
              <>
                <DiagnosticReport
                  diagnosis={
                    (phase === 'confirming' || phase === 'correcting')
                      ? null
                      : currentDiagnosis
                  }
                  isLoading={isLoading}
                  error={error}
                  phase={phase}
                />

                {phase === 'diagnosis_shown' && (
                  <>
                    <ActionBar
                      onContinueWriting={handleContinueWriting}
                      onDifferentAngle={handleDifferentAngle}
                      retryCount={retryCount}
                      maxRetries={MAX_RETRIES}
                      isReDiagnosing={isLoading}
                    />
                    {confirmedState && (
                      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 16 }}>
                        当前判断：{stateLabels[confirmedState]}
                      </Text>
                    )}
                    <HistoryPanel entries={history} endpoint={currentMeta?.endpoint} />
                  </>
                )}
              </>
            )}
          </Col>
        </Row>
      </Content>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', width: '100%' }}>
        <Footer />
      </div>
    </Layout>
  )
}

export default App
