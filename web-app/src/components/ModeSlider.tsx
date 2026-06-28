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
      <span className="text-xs text-gray-400 select-none">模式</span>
      <div className="relative flex bg-gray-100 rounded-full p-0.5">
        {/* Perspective */}
        <button
          onClick={() => !disabled && onChange('perspective')}
          disabled={disabled}
          className={`relative z-10 px-3.5 py-1.5 text-sm rounded-full transition-all duration-200 ${
            isPerspective
              ? 'text-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          透视这段文字
        </button>

        {/* My Text */}
        <button
          onClick={() => !disabled && onChange('my_text')}
          disabled={disabled}
          className={`relative z-10 px-3.5 py-1.5 text-sm rounded-full transition-all duration-200 ${
            !isPerspective
              ? 'text-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          我的文字
        </button>

        {/* Active indicator */}
        <div
          className={`absolute top-0.5 h-[calc(100%-4px)] rounded-full bg-[#1A1A1A] transition-all duration-200 ${
            isPerspective ? 'left-0.5 w-[calc(50%-2px)]' : 'left-[50%] w-[calc(50%-2px)]'
          }`}
        />
      </div>
    </div>
  )
}
