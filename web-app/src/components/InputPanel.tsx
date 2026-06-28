import { Input, Typography } from 'antd'
import { EditOutlined } from '@ant-design/icons'

const { Text } = Typography

interface InputPanelProps {
  text: string
  onChange: (text: string) => void
  disabled?: boolean
}

export default function InputPanel({ text, onChange, disabled = false }: InputPanelProps) {
  const charCount = text.length
  const tooLong = charCount > 500

  return (
    <div>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <EditOutlined style={{ fontSize: 18, color: '#1A1A1A' }} aria-hidden="true" />
        <Text strong style={{ fontSize: 15 }}>
          输入区
        </Text>
      </div>

      {/* Textarea */}
      <Input.TextArea
        id="user-input"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="在这里写任何东西——一段小说、一句'我不知道写什么'、一个念头、一段不确定的文字。"
        rows={8}
        style={{
          fontFamily: 'Source Serif 4, Georgia, "Noto Serif SC", serif',
          fontSize: 15,
          lineHeight: 1.75,
          resize: 'vertical',
          minHeight: 200,
        }}
      />

      {/* Bottom bar: char count + hint */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {charCount} 字
        </Text>
        {tooLong && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            文字较长，系统会挑出最需要诊断的段落
          </Text>
        )}
      </div>
    </div>
  )
}
