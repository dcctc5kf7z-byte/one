import { Button } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'

interface DiagnoseButtonProps {
  onClick: () => void
  isLoading: boolean
}

export default function DiagnoseButton({
  onClick,
  isLoading,
}: DiagnoseButtonProps) {
  return (
    <Button
      type="primary"
      icon={<ThunderboltOutlined />}
      loading={isLoading}
      onClick={onClick}
      disabled={isLoading}
      size="large"
    >
      {isLoading ? '诊断中' : '开始诊断'}
    </Button>
  )
}
