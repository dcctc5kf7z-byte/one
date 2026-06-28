import { Typography, Space } from 'antd'

const { Title, Text } = Typography

export default function Header() {
  return (
    <Space direction="vertical" size={2}>
      <Title level={3} style={{ margin: 0, fontSize: 18 }}>
        用文字看清自己
      </Title>
      <Text type="secondary" style={{ fontSize: 13 }}>
        写下来，就有迹可循
      </Text>
    </Space>
  )
}
