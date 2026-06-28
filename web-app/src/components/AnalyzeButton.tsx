interface Props {
  onClick: () => void
  isLoading: boolean
  disabled?: boolean
}

export default function AnalyzeButton({ onClick, isLoading, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full py-3 px-6 rounded-lg text-base font-medium transition-all duration-200 ${
        disabled || isLoading
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-[#1A1A1A] text-white hover:bg-[#333] active:scale-[0.98]'
      }`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          分析中…
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          透视这段文字
        </span>
      )}
    </button>
  )
}
