/**
 * 诊断文本状态解析
 * 从 Edge Function 返回的诊断首句中提取写作状态
 *
 * 格式：我注意到你现在是[状态]——对吗？
 * 示例：我注意到你现在是写作中——对吗？\n\n📋 写作诊断报告\n...
 */

import type { ParsedConfirmation, WritingState } from './types'

// 匹配 "我注意到你现在是写作中——对吗？" 及其变体
// 允许状态词被 ** 或 「」包裹（Markdown 加粗或中文引号）
const STATE_PATTERN = /我注意到你现在是[\s]*[*_]{0,2}[「」"']?\s*(.{2,8})\s*[「」"']?[*_]{0,2}\s*[—\-–]\s*对吗\s*[？?]/

const STATE_MAP: Record<string, WritingState> = {
  '空虚': 'empty',
  '模糊念头': 'vague_idea',
  '写作中': 'writing',
  '卡住了': 'stuck',
  '写完了': 'finished',
}

/**
 * 从诊断文本首句解析状态确认
 * @returns ParsedConfirmation 或 null（解析失败时跳过确认阶段）
 */
export function parseConfirmation(diagnosis: string): ParsedConfirmation | null {
  const match = diagnosis.match(STATE_PATTERN)
  if (!match) return null

  const rawLabel = match[1].trim()
  // 清除可能的 Markdown 加粗标记
  const stateLabel = rawLabel.replace(/[*_]{1,2}/g, '')
  const state = STATE_MAP[stateLabel]
  if (!state) return null

  // 确认句之后的内容
  const restStart = match.index! + match[0].length
  const restDiagnosis = diagnosis.slice(restStart).trimStart()

  return { state, stateLabel, restDiagnosis }
}

/**
 * 安全获取状态中文标签
 */
export function getStateLabel(state: WritingState): string {
  return STATE_MAP[state] ? (Object.entries(STATE_MAP).find(([, v]) => v === state)?.[0] ?? state) : state
}
