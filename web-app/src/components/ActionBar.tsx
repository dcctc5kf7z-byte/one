import { Button, Space, Typography } from 'antd'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'

const { Text } = Typography

interface ActionBarProps {
  onContinueWriting: () => void
  onDifferentAngle: () => void
  retryCount: number
  maxRetries: number
  isReDiagnosing: boolean
}

export default function ActionBar({
  onContinueWriting,
  onDifferentAngle,
  retryCount,
  maxRetries,
  isReDiagnosing,
}: ActionBarProps) {
  const exhausted = retryCount >= maxRetries

  return (
    <div style={{ marginTop: 24 }}>
      <Space size={12}>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={onContinueWriting}
          disabled={isReDiagnosing}
          size="large"
        >
          继续写
        </Button>

        <Button
          icon={isReDiagnosing ? undefined : <ReloadOutlined />}
          loading={isReDiagnosing}
          onClick={onDifferentAngle}
          disabled={isReDiagnosing || exhausted}
          size="large"
        >
          {isReDiagnosing
            ? '诊断中'
            : exhausted
              ? '换一段文字试试'
              : '不满意，换个角度'}
        </Button>
      </Space>

      {!exhausted && retryCount > 0 && (
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 8 }}>
          角度 {retryCount}/{maxRetries}
        </Text>
      )}
    </div>
  )
}
