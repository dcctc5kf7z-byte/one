import { Typography } from 'antd'

const { Text } = Typography

export default function PrivacyNotice() {
  return (
    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 12, lineHeight: 1.6 }}>
      你的文字只在这一轮诊断中使用。诊断结束后不保存完整原文。
    </Text>
  )
}
