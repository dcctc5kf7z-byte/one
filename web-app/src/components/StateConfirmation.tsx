import { Button, Space } from 'antd'
import { CheckOutlined, FormOutlined } from '@ant-design/icons'

interface StateConfirmationProps {
  stateLabel: string       // 中文状态标签，如 "写作中"
  onConfirm: () => void
  onCorrect: () => void
}

export default function StateConfirmation({
  stateLabel,
  onConfirm,
  onCorrect,
}: StateConfirmationProps) {
  return (
    <div>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 18 }} aria-hidden="true" />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
          诊断报告
        </span>
      </div>

      {/* Confirmation card */}
      <div
        role="region"
        aria-label="状态确认"
        style={{
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ fontSize: 15, color: '#1A1A1A', lineHeight: 1.6, marginBottom: 32, textAlign: 'center' }}>
          我注意到你现在是<span style={{ fontWeight: 600 }}> {stateLabel} </span>——对吗？
        </p>

        <Space size={16}>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={onConfirm}
            size="large"
          >
            确认
          </Button>

          <Button
            icon={<FormOutlined />}
            onClick={onCorrect}
            size="large"
          >
            不对，我是…
          </Button>
        </Space>
      </div>
    </div>
  )
}
