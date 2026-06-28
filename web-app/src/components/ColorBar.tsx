import { useState, useRef, useEffect } from 'react'
import { COLOR_MAP, COLOR_URGENCY } from '../lib/hermes-types'
import type { ViewMode } from '../lib/hermes-types'

interface Props {
  mode: ViewMode
}

export default function ColorBar({ mode }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    <div ref={ref} className="relative flex items-center">
      {/* 六色圆点常驻条 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
        title="六色信号图例"
      >
        {COLOR_URGENCY.map(color => {
          const { hex, signal } = COLOR_MAP[color]
          const locked = color === 'pine_green' && pineGreenLocked
          return (
            <span
              key={color}
              className="inline-block w-2 h-2 rounded-full flex-shrink-0 transition-transform hover:scale-125"
              style={{
                backgroundColor: locked ? 'var(--text-ink-tertiary)' : hex,
                opacity: locked ? 0.35 : 1,
              }}
              title={locked ? '松绿 — 我的文字模式启用' : signal}
            />
          )
        })}
        <span className="text-[11px] ml-0.5" style={{ color: 'var(--text-ink-tertiary)' }}>
          信号
        </span>
      </button>

      {/* 展开详情面板 */}
      {open && (
        <div
          className="absolute top-full right-0 mt-2 rounded-lg shadow-lg p-3.5 z-50 min-w-[210px]"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-warm)',
            border: '1px solid var(--border-warm)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-ink-secondary)' }}>
            六色信号
          </div>
          <div className="flex flex-col gap-2">
            {COLOR_URGENCY.map(color => {
              const { hex, signal, meaning } = COLOR_MAP[color]
              const locked = color === 'pine_green' && pineGreenLocked

              return (
                <div
                  key={color}
                  className={`flex items-center gap-2.5 text-xs ${locked ? 'opacity-35' : ''}`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: locked ? 'var(--text-ink-tertiary)' : hex }}
                  />
                  <span className="font-medium min-w-[3em]" style={{ color: 'var(--text-ink)' }}>
                    {signal}
                  </span>
                  <span style={{ color: 'var(--text-ink-tertiary)' }}>{meaning}</span>
                  {locked && (
                    <span className="text-[10px]" style={{ color: 'var(--text-ink-tertiary)' }}>
                      未启用
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
