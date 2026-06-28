import { Divider, Typography } from 'antd'

const { Text } = Typography

export default function Footer() {
  return (
    <>
      <Divider style={{ margin: '48px 0 0 0', borderColor: 'rgba(13,13,13,0.08)' }} />
      <footer style={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          这是镜子，不是答案。笔在你手里。
        </Text>
      </footer>
    </>
  )
}
