import { Radio, Button, Space } from 'antd'
import type { WritingState } from '../lib/types'
import { WRITING_STATE_LABELS } from '../lib/types'

interface StatePickerProps {
  currentStateLabel: string  // Engine 预判的状态，预选中
  onSelect: (state: WritingState) => void
  onCancel: () => void
}

const STATE_ORDER: WritingState[] = ['empty', 'vague_idea', 'writing', 'stuck', 'finished']

export default function StatePicker({
  currentStateLabel,
  onSelect,
  onCancel,
}: StatePickerProps) {
  // Find the key matching currentStateLabel
  const defaultKey = STATE_ORDER.find(
    (s) => WRITING_STATE_LABELS[s] === currentStateLabel
  )

  return (
    <div>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 18 }} aria-hidden="true" />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
          诊断报告
        </span>
      </div>

      {/* Picker */}
      <div role="region" aria-label="选择实际状态" style={{ minHeight: 300 }}>
        <p style={{ fontSize: 15, color: '#1A1A1A', marginBottom: 24 }}>
          请选择你现在的实际状态：
        </p>

        <Radio.Group
          defaultValue={defaultKey}
          style={{ width: '100%' }}
          onChange={(e) => onSelect(e.target.value)}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {STATE_ORDER.map((state) => (
              <Radio.Button
                key={state}
                value={state}
                style={{
                  width: '100%',
                  height: 44,
                  lineHeight: '44px',
                  textAlign: 'center',
                  fontSize: 15,
                }}
              >
                {WRITING_STATE_LABELS[state]}
              </Radio.Button>
            ))}
          </Space>
        </Radio.Group>

        <div style={{ marginTop: 24 }}>
          <Button type="link" onClick={onCancel} style={{ padding: 0 }}>
            取消
          </Button>
        </div>
      </div>
    </div>
  )
}
