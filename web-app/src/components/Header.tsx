import ColorBar from './ColorBar'
import type { ViewMode } from '../lib/hermes-types'

interface Props {
  mode?: ViewMode
}

export default function Header({ mode = 'perspective' }: Props) {
  return (
    <div className="flex items-center gap-4">
      {/* 标题区 */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          {/* 笔图标 */}
          <svg className="w-5 h-5" style={{ color: 'var(--text-ink-tertiary)' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
          <h1 className="text-lg font-semibold font-[var(--font-serif)]" style={{ color: 'var(--text-ink)' }}>
            用文字看清自己
          </h1>
        </div>
        <p className="text-[13px] italic font-[var(--font-serif)]" style={{ color: 'var(--text-ink-tertiary)' }}>
          Web 试用入口 · 完整体验请在 Claude Code 中安装 /text-lens
        </p>
      </div>

      {/* 六色常驻色条 */}
      <ColorBar mode={mode} />
    </div>
  )
}
