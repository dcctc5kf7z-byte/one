import ReactMarkdown from 'react-markdown'
import { Card, Skeleton, Empty, Result } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import type { AppPhase } from '../lib/types'

interface DiagnosticReportProps {
  diagnosis: string | null
  isLoading: boolean
  error: string | null
  phase: AppPhase
}

function ExhaustedState() {
  return (
    <Result
      status="info"
      title="暂时无法诊断"
      subTitle={
        <>
          我看了三轮，换了不同的角度——还是没抓到你的问题。
          <br />
          这不是你的文字有问题——是我的镜子对这类型的文字还不够敏感。
          <br />
          继续写你的——等你遇到具体的卡点，再贴过来。
        </>
      }
    />
  )
}

export default function DiagnosticReport({
  diagnosis,
  isLoading,
  error,
  phase,
}: DiagnosticReportProps) {
  const showReport = !isLoading && !error && diagnosis
  const showPlaceholder =
    !isLoading && !error && !diagnosis && phase !== 'exhausted'

  return (
    <div>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <FileTextOutlined style={{ fontSize: 18, color: '#1A1A1A' }} aria-hidden="true" />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
          诊断报告
        </span>
      </div>

      {/* Loading */}
      {isLoading && (
        <Skeleton active paragraph={{ rows: 4 }} style={{ minHeight: 300 }} />
      )}

      {/* Error */}
      {!isLoading && error && (
        <Result
          status="warning"
          title="诊断遇到问题"
          subTitle={error}
        />
      )}

      {/* Exhausted */}
      {!isLoading && !error && phase === 'exhausted' && <ExhaustedState />}

      {/* Empty / Placeholder */}
      {showPlaceholder && (
        <Empty
          description="诊断结果会显示在这里"
          style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
        />
      )}

      {/* Diagnosis shown */}
      {showReport && (
        <Card
          title={
            <span style={{ fontSize: 15, fontWeight: 600 }}>诊断报告</span>
          }
          styles={{ body: { padding: '16px 20px' } }}
        >
          <article
            className="diagnosis-content"
            style={{ fontSize: 15, lineHeight: 1.6, color: '#1A1A1A' }}
          >
            <ReactMarkdown>{diagnosis}</ReactMarkdown>
          </article>
        </Card>
      )}
    </div>
  )
}
