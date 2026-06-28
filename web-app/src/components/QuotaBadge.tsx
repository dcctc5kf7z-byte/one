import { Tag } from 'antd'

interface QuotaBadgeProps {
  used: number
  total: number
}

export default function QuotaBadge({ used, total }: QuotaBadgeProps) {
  const remaining = total - used
  const exhausted = remaining <= 0

  return (
    <Tag
      color={exhausted ? 'error' : 'default'}
      style={{ fontSize: 13, lineHeight: '20px' }}
    >
      {exhausted ? '今日次数已用完' : `今日剩余 ${remaining} 次`}
    </Tag>
  )
}
