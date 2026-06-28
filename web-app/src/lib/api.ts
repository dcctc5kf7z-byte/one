/**
 * API 调用层 — 调用 Supabase Edge Function
 *
 * v5.0.2 Phase C：完整响应（含 meta）+ conversationId + correctedState
 * 部署前：在 .env 中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY
 */

import type { DiagnoseResponse, WritingState } from './types'
import type { HermesDiagnoseResponse, ViewMode, FingerprintData } from './hermes-types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const HERMES_DIAGNOSE_URL = import.meta.env.VITE_HERMES_DIAGNOSE_URL || SUPABASE_URL.replace(
  'anthropic-diagnose', 'hermes-diagnose'
)

/**
 * 调用诊断 Edge Function
 * @param userText      - 用户输入的文字
 * @param retryCount     - 当前重试次数（0 = 首次诊断）
 * @param conversationId - 会话 ID（undefined = 新建会话）
 * @param correctedState - 用户纠正后的状态（仅纠正流程使用）
 */
export async function diagnose(
  userText: string,
  retryCount: number = 0,
  conversationId?: string,
  correctedState?: WritingState,
): Promise<DiagnoseResponse> {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL 未配置。请在 .env 文件中设置 VITE_SUPABASE_URL。')
  }

  const body: Record<string, unknown> = {
    userText,
    retryCount,
  }

  if (conversationId) {
    body.conversationId = conversationId
  }

  if (correctedState) {
    // 将 WritingState key 转为中文标签传给 Edge Function
    const stateLabels: Record<WritingState, string> = {
      empty: '空虚',
      vague_idea: '模糊念头',
      writing: '写作中',
      stuck: '卡住了',
      finished: '写完了',
    }
    body.correctedState = stateLabels[correctedState]
  }

  const response = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `请求失败 (${response.status})`)
  }

  return data as DiagnoseResponse
}

/**
 * 调用 Hermes 诊断 Edge Function (Phase 2)
 * @param text        - 用户输入的文字
 * @param mode         - 模式：perspective | my_text
 * @param fingerprint - 写作指纹数据（仅 my_text 模式）
 */
export async function hermesDiagnose(
  text: string,
  mode: ViewMode = 'perspective',
  fingerprint?: FingerprintData,
): Promise<HermesDiagnoseResponse> {
  if (!HERMES_DIAGNOSE_URL) {
    throw new Error('Hermes Diagnosis URL 未配置。')
  }

  const body: Record<string, unknown> = {
    text,
    mode,
  }

  if (fingerprint) {
    body.fingerprint = fingerprint
  }

  const response = await fetch(HERMES_DIAGNOSE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `请求失败 (${response.status})`)
  }

  return data as HermesDiagnoseResponse
}
