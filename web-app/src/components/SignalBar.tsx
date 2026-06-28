import { useMemo } from 'react'
import type { SentenceAnalysis, HermesColor } from '../lib/hermes-types'
import { COLOR_MAP, COLOR_URGENCY } from '../lib/hermes-types'

interface Props {
  sentences: SentenceAnalysis[]
}

export default function SignalBar({ sentences }: Props) {
  const colorCounts = useMemo(() => {
    const counts = new Map<HermesColor, number>()
    for (const s of sentences) {
      for (const c of s.colors) {
        counts.set(c, (counts.get(c) || 0) + 1)
      }
    }
    // Sort by urgency
    const entries = [...counts.entries()]
      .sort((a, b) => COLOR_URGENCY.indexOf(a[0]) - COLOR_URGENCY.indexOf(b[0]))
    const total = entries.reduce((sum, [, n]) => sum + n, 0)
    return { entries, total }
  }, [sentences])

  if (colorCounts.total === 0) return null

  return (
    <div
      className="flex rounded-lg overflow-hidden mb-5"
      style={{ height: '6px', backgroundColor: 'var(--border-warm)' }}
      title={colorCounts.entries.map(([c, n]) => `${COLOR_MAP[c].signal}: ${n}`).join(' · ')}
    >
      {colorCounts.entries.map(([color, count]) => {
        const pct = (count / colorCounts.total) * 100
        if (pct < 3) return null // Skip very small segments
        return (
          <span
            key={color}
            className="inline-block h-full transition-opacity hover:opacity-80 cursor-default"
            style={{
              width: `${pct}%`,
              backgroundColor: COLOR_MAP[color].hex,
              minWidth: pct > 5 ? '0' : '8px',
            }}
            title={`${COLOR_MAP[color].signal}: ${count} 处`}
          />
        )
      })}
    </div>
  )
}

/** 从 sentences 计算主导信号色（频率最高，排除 slate_gray） */
export function computeDominantColor(sentences: SentenceAnalysis[]): HermesColor | null {
  const counts = new Map<HermesColor, number>()
  for (const s of sentences) {
    for (const c of s.colors) {
      counts.set(c, (counts.get(c) || 0) + 1)
    }
  }
  // Prefer non-slate_gray dominant
  const sorted = [...counts.entries()]
    .filter(([c]) => c !== 'slate_gray')
    .sort((a, b) => b[1] - a[1])
  if (sorted.length > 0) return sorted[0][0]
  // Fallback to slate_gray if only color
  const sortedAll = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return sortedAll.length > 0 ? sortedAll[0][0] : null
}
