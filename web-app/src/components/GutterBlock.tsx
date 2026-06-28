import { useState } from 'react'
import type { HermesColor, GutterBlock as GutterBlockType } from '../lib/hermes-types'
import { COLOR_MAP, COLOR_URGENCY } from '../lib/hermes-types'

interface Props {
  blocks: GutterBlockType[]
  maxVisible?: number
}

export default function GutterBlocks({ blocks, maxVisible = 3 }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!blocks || blocks.length === 0) return null

  // Sort by urgency
  const sorted = [...blocks].sort(
    (a, b) => COLOR_URGENCY.indexOf(a.color) - COLOR_URGENCY.indexOf(b.color)
  )

  const visible = expanded ? sorted : sorted.slice(0, maxVisible)
  const hidden = sorted.length - maxVisible

  return (
    <div className="flex items-center justify-center gap-[1px]" title={blocks.map(b => `${COLOR_MAP[b.color].signal}: ${b.detail}`).join(' · ')}>
      {visible.map((block, i) => (
        <BookmarkStrip key={i} color={block.color} signal={COLOR_MAP[block.color].signal} detail={block.detail} />
      ))}
      {!expanded && hidden > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
          className="text-[9px] leading-none rounded-full w-4 h-4 flex items-center justify-center transition-colors cursor-pointer font-[var(--font-sans)]"
          style={{
            color: 'var(--text-ink-tertiary)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-warm)',
          }}
          title={`展开查看 ${hidden} 个更多信号`}
        >
          +{hidden}
        </button>
      )}
      {expanded && hidden > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
          className="text-[9px] leading-none ml-0.5 transition-colors cursor-pointer"
          style={{ color: 'var(--text-ink-tertiary)' }}
          title="折叠"
        >
          −
        </button>
      )}
    </div>
  )
}

interface BookmarkStripProps {
  color: HermesColor
  signal: string
  detail: string
}

/** 书签条：4px 宽 × 28px 高，圆角矩形 + 同色微发光 */
function BookmarkStrip({ color, signal, detail }: BookmarkStripProps) {
  const hex = COLOR_MAP[color].hex
  return (
    <span
      className="inline-block flex-shrink-0 cursor-default"
      style={{
        width: '4px',
        height: '28px',
        borderRadius: '2px',
        backgroundColor: hex,
        boxShadow: `0 0 3px ${hex}66`,
      }}
      title={`${signal}：${detail}`}
    />
  )
}
