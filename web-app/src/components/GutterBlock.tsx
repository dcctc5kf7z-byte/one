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
    <div className="flex items-center gap-0.5" title={blocks.map(b => `${COLOR_MAP[b.color].signal}: ${b.detail}`).join(' · ')}>
      {visible.map((block, i) => (
        <ColorDot key={i} color={block.color} signal={COLOR_MAP[block.color].signal} detail={block.detail} />
      ))}
      {!expanded && hidden > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
          className="text-[10px] leading-none text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
          title={`展开查看 ${hidden} 个更多信号`}
        >
          +{hidden}
        </button>
      )}
      {expanded && hidden > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
          className="text-[10px] leading-none text-gray-400 hover:text-gray-600 ml-0.5 transition-colors"
          title="折叠"
        >
          −
        </button>
      )}
    </div>
  )
}

interface ColorDotProps {
  color: HermesColor
  signal: string
  detail: string
}

function ColorDot({ color, signal, detail }: ColorDotProps) {
  const hex = COLOR_MAP[color].hex
  return (
    <span
      className="inline-block w-3 h-3 rounded-sm cursor-default flex-shrink-0"
      style={{ backgroundColor: hex }}
      title={`${signal}：${detail}`}
    />
  )
}
