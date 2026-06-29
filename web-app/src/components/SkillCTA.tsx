/**
 * SkillCTA — Web App 试用入口引导横幅
 *
 * Web App 降为试吃入口后，引导用户安装 Claude Code Skill
 * 匹配「温墨·纸本」风格：暖色调、衬线字体、墨水印章感
 */

export default function SkillCTA() {
  return (
    <div
      className="rounded-lg p-5 mb-6"
      style={{
        backgroundColor: 'var(--bg-cream)',
        border: '1px solid var(--border-warm)',
      }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* 左侧：笔图标 */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(139, 107, 90, 0.12)' }}
        >
          <svg className="w-5 h-5" style={{ color: 'var(--text-ink-secondary)' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </div>

        {/* 中间：文案 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium font-[var(--font-serif)]" style={{ color: 'var(--text-ink)' }}>
            /text-lens 是 Claude Code Skill，Web 版本仅作快速试用。
          </p>
          <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--text-ink-tertiary)' }}>
            在 Claude Code 中安装后，获得 7 体裁透镜 × X→Y→Z 诊断 × 多轮写作陪伴。
            贴一段文字试试看——但镜子最深的那层反射，在终端里。
          </p>
        </div>

        {/* 右侧：CTA 按钮 */}
        <a
          href="https://github.com/dcctc5kf7z-byte/text-lens"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
          style={{
            color: 'var(--bg-paper)',
            backgroundColor: 'var(--text-ink)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--text-ink-secondary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'var(--text-ink)'
          }}
        >
          安装 Skill →
        </a>
      </div>
    </div>
  )
}
