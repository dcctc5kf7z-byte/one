import ColorLegend from './ColorLegend'
import type { ViewMode } from '../lib/hermes-types'

interface Props {
  mode?: ViewMode
}

export default function Header({ mode = 'perspective' }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[#1A1A1A]">
          用文字看清自己
        </h1>
        <ColorLegend mode={mode} />
      </div>
      <p className="text-[13px] text-gray-400">
        写下来，就有迹可循
      </p>
    </div>
  )
}
