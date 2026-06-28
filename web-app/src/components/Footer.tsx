import type { ViewMode } from '../lib/hermes-types'

interface Props {
  mode?: ViewMode
  textsAnalyzed?: number
}

export default function Footer({ mode, textsAnalyzed }: Props) {
  return (
    <>
      <hr className="border-gray-100 mx-auto max-w-[1200px] px-4 mt-12 mb-0" />
      <footer className="max-w-[1200px] mx-auto px-4 py-4 pb-6 flex items-center justify-between">
        <span className="text-[13px] text-gray-400">
          这是镜子，不是答案。笔在你手里。
        </span>
        {mode === 'my_text' && textsAnalyzed !== undefined && textsAnalyzed > 0 && (
          <span className="text-[12px] text-gray-300">
            写作指纹：已分析 {textsAnalyzed} 篇
          </span>
        )}
      </footer>
    </>
  )
}
