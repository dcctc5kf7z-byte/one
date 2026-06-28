/**
 * Phase C：全状态类型定义
 * 五状态 X→Y→Z 诊断系统的前端类型基础
 *
 * Phase 2 Hermes 新类型请从 ./hermes-types 导入
 */

// ── 五状态（v3.1 Phase C，Phase 2 中逐步弃用） ──
export type WritingState = 'empty' | 'vague_idea' | 'writing' | 'stuck' | 'finished'

export const WRITING_STATE_LABELS: Record<WritingState, string> = {
  empty: '空虚',
  vague_idea: '模糊念头',
  writing: '写作中',
  stuck: '卡住了',
  finished: '写完了',
}

// ── App 阶段（状态机） ──
export type AppPhase =
  | 'input'              // 输入中，等待用户提交
  | 'diagnosing'         // 首次 API 调用中
  | 'confirming'         // 展示状态确认 UI
  | 'correcting'         // 用户选择纠正状态
  | 're_diagnosing'      // 纠正/换角度后重新调用 API
  | 'diagnosis_shown'    // 完整诊断展示
  | 'exhausted'          // 连续 3 次 API 失败

// ── API 响应 ──
export interface DiagnosisMeta {
  endpoint: string
  temperature: number
  sessionRound: number
  retry: number
  conversationId: string
  preClassifiedState: string
  layers: string[]
  estimatedTokens: number
}

export interface DiagnoseResponse {
  diagnosis: string
  meta: DiagnosisMeta
}

export interface DiagnoseError {
  error: string
  message: string
}

// ── 状态解析 ──
export interface ParsedConfirmation {
  state: WritingState
  stateLabel: string       // 中文标签，如 "写作中"
  restDiagnosis: string    // 确认句之后的诊断正文
}

// ── 会话历史 ──
export interface HistoryEntry {
  id: string               // crypto.randomUUID()
  textSnippet: string      // 用户输入前 50 字
  diagnosis: string         // 完整诊断报告
  confirmedState: WritingState
  timestamp: number
}
