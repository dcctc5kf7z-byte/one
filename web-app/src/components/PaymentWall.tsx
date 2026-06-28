import { Result } from 'antd'

export default function PaymentWall() {
  return (
    <Result
      status="info"
      title="今日免费诊断次数已用完"
      subTitle="明天零点自动重置，欢迎再来。"
    />
  )
}
