import { Collapse, Typography } from 'antd'
import type { HistoryEntry } from '../lib/types'
import { WRITING_STATE_LABELS } from '../lib/types'

const { Text } = Typography

interface HistoryPanelProps {
  entries: HistoryEntry[]
  endpoint?: string
}

export default function HistoryPanel({ entries, endpoint }: HistoryPanelProps) {
  if (entries.length === 0) return null

  const items = entries.map((entry) => ({
    key: entry.id,
    label: (
      <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Text strong style={{ minWidth: '4em', fontSize: 13 }}>
          {WRITING_STATE_LABELS[entry.confirmedState]}
        </Text>
        <Text type="secondary" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
          {entry.textSnippet}
        </Text>
        <Text type="secondary" style={{ fontSize: 13, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </span>
    ),
    children: (
      <div style={{ fontSize: 13, color: '#525252', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
        {entry.diagnosis.slice(0, 800)}
        {entry.diagnosis.length > 800 && '…'}
      </div>
    ),
  }))

  // Add latest diagnosis quick view as the last item
  const latest = entries[entries.length - 1]
  const latestItem = {
    key: 'latest-diagnosis',
    label: (
      <Text style={{ fontSize: 13 }}>查看最近诊断</Text>
    ),
    children: (
      <div style={{ fontSize: 13, color: '#525252', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
        {latest.diagnosis.slice(0, 800)}
        {latest.diagnosis.length > 800 && '…'}
      </div>
    ),
  }

  return (
    <div style={{ marginTop: 32 }}>
      {/* Divider line */}
      <div style={{ borderTop: '1px solid rgba(13,13,13,0.08)', paddingTop: 16, marginBottom: 8 }}>
        {endpoint && (
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
            模型：{endpoint}
          </Text>
        )}
        <Collapse
          items={[...items, latestItem]}
          expandIconPosition="end"
          size="small"
          ghost
          style={{ fontSize: 13 }}
        />
      </div>
    </div>
  )
}
