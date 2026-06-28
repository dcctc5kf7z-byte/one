/**
 * 写作指纹管理器 — localStorage CRUD
 *
 * Phase 2 MVP：客户端本地存储
 * Phase 4 将迁移至云端同步
 */

import type { FingerprintData, FingerprintPattern } from './hermes-types'

const STORAGE_KEY = 'hermes_fingerprint'

// ── 读取 ──
export function getFingerprint(): FingerprintData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as FingerprintData
  } catch {
    return null
  }
}

// ── 保存 ──
export function saveFingerprint(data: FingerprintData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...data,
    updated: new Date().toISOString(),
  }))
}

// ── 创建新指纹 ──
export function createFingerprint(): FingerprintData {
  return {
    fingerprint_id: crypto.randomUUID(),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    texts_analyzed: 0,
    patterns: [],
    dimension_profile: {},
  }
}

// ── 判断松绿是否激活 ──
export function shouldActivatePineGreen(data: FingerprintData): boolean {
  return data.texts_analyzed >= 3
}

// ── 合并新分析到指纹 ──
export function updateFingerprintAfterDiagnosis(
  existing: FingerprintData,
  patterns: Array<{ type: string; trigger: string }>,
): FingerprintData {
  const now = new Date().toISOString()
  const updatedPatterns = [...existing.patterns]

  for (const p of patterns) {
    const existingPattern = updatedPatterns.find(
      ep => ep.type === p.type && ep.trigger === p.trigger
    )

    if (existingPattern) {
      existingPattern.frequency += 1
      existingPattern.last_seen = now
      if (!existingPattern.across_texts.includes(String(existing.texts_analyzed + 1))) {
        existingPattern.across_texts.push(String(existing.texts_analyzed + 1))
      }
      // 出现 3 次以上 → 点亮松绿
      if (existingPattern.frequency >= 3) {
        existingPattern.pine_green = true
      }
    } else {
      const newPattern: FingerprintPattern = {
        id: crypto.randomUUID(),
        type: p.type,
        trigger: p.trigger,
        frequency: 1,
        first_seen: now,
        last_seen: now,
        across_texts: [String(existing.texts_analyzed + 1)],
        pine_green: false,
      }
      updatedPatterns.push(newPattern)
    }
  }

  return {
    ...existing,
    texts_analyzed: existing.texts_analyzed + 1,
    patterns: updatedPatterns,
    updated: now,
  }
}

// ── 导出指纹 JSON ──
export function exportFingerprintJSON(data: FingerprintData): string {
  return JSON.stringify(data, null, 2)
}

// ── 导入并合并指纹 ──
export function importAndMergeFingerprint(
  existing: FingerprintData | null,
  imported: FingerprintData,
): FingerprintData {
  if (!existing) return imported

  // 合并模式：取并集，频率取 max，日期取最近
  const mergedPatterns = new Map<string, FingerprintPattern>()
  for (const p of existing.patterns) {
    mergedPatterns.set(`${p.type}:${p.trigger}`, p)
  }
  for (const p of imported.patterns) {
    const key = `${p.type}:${p.trigger}`
    const ep = mergedPatterns.get(key)
    if (ep) {
      ep.frequency = Math.max(ep.frequency, p.frequency)
      ep.last_seen = ep.last_seen > p.last_seen ? ep.last_seen : p.last_seen
      ep.first_seen = ep.first_seen < p.first_seen ? ep.first_seen : p.first_seen
      ep.across_texts = [...new Set([...ep.across_texts, ...p.across_texts])]
      ep.pine_green = ep.pine_green || p.pine_green
    } else {
      mergedPatterns.set(key, p)
    }
  }

  return {
    ...existing,
    texts_analyzed: Math.max(existing.texts_analyzed, imported.texts_analyzed),
    patterns: Array.from(mergedPatterns.values()),
    dimension_profile: { ...existing.dimension_profile, ...imported.dimension_profile },
    updated: new Date().toISOString(),
  }
}
