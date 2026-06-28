import type { ViewMode } from '../lib/hermes-types'

interface Props {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
  disabled?: boolean
}

export default function ModeSlider({ mode, onChange, disabled }: Props) {
  const isPerspective = mode === 'perspective'

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs select-none" style={{ color: 'var(--text-ink-tertiary)' }}>
        模式
      </span>
      <div
        className="relative flex rounded-full p-0.5"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-warm)' }}
      >
        {/* Perspective */}
        <button
          onClick={() => !disabled && onChange('perspective')}
          disabled={disabled}
          className={`relative z-10 px-3.5 py-1.5 text-sm rounded-full transition-all duration-200 font-[var(--font-sans)] ${
            isPerspective
              ? 'text-white'
              : ''
          }`}
          style={isPerspective ? {} : { color: 'var(--text-ink-secondary)' }}
        >
          透视这段文字
        </button>

        {/* My Text */}
        <button
          onClick={() => !disabled && onChange('my_text')}
          disabled={disabled}
          className={`relative z-10 px-3.5 py-1.5 text-sm rounded-full transition-all duration-200 font-[var(--font-sans)] ${
            !isPerspective
              ? 'text-white'
              : ''
          }`}
          style={!isPerspective ? {} : { color: 'var(--text-ink-secondary)' }}
        >
          我的文字
        </button>

        {/* Active indicator — 颜色关联 */}
        <div
          className="absolute top-0.5 h-[calc(100%-4px)] rounded-full transition-all duration-200"
          style={{
            width: 'calc(50% - 2px)',
            left: isPerspective ? '2px' : '50%',
            backgroundColor: isPerspective
              ? 'var(--hermes-steel-blue)'
              : 'var(--hermes-pine-green)',
          }}
        />
      </div>
    </div>
  )
}
