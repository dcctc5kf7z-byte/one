import { useState, useRef, useEffect } from 'react'
import { COLOR_MAP, COLOR_URGENCY } from '../lib/hermes-types'
import type { ViewMode } from '../lib/hermes-types'

interface Props {
  mode: ViewMode
}

export default function ColorLegend({ mode }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const pineGreenLocked = mode === 'perspective'

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        title="颜色图例"
      >
        颜色图例
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
          <div className="text-xs font-medium text-gray-500 mb-2">六色信号</div>
          <div className="flex flex-col gap-1.5">
            {COLOR_URGENCY.map(color => {
              const { hex, signal, meaning } = COLOR_MAP[color]
              const locked = color === 'pine_green' && pineGreenLocked

              return (
                <div
                  key={color}
                  className={`flex items-center gap-2 text-xs ${locked ? 'opacity-40' : ''}`}
                >
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: locked ? '#D1D5DB' : hex }}
                  />
                  <span className="font-medium text-gray-700 w-8">{signal}</span>
                  <span className="text-gray-400">{meaning}</span>
                  {locked && <span className="text-gray-300 text-[10px]">透视模式未启用</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
