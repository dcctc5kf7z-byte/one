/** 诊断结果的结构化类型 */
export interface Diagnosis {
  insight: string;      // 我注意到
  xEffect: string;      // 这让读者感受到
  yGap: string;         // 问题出在
  question: string;     // 下一步约束问题
  action: string;       // → 动作指令
  dimensions: {
    causality: string;  // 因果推进
    drive: string;      // 人物驱力
    attention: string;  // 读者注意
  };
  allTight: boolean;    // 三个维度都在工作
}

/** API 请求体 */
export interface DiagnoseRequest {
  text: string;
  previousText?: string;
  retryCount: number;
}

/** API 成功响应 */
export interface DiagnoseResponse {
  diagnosis: Diagnosis;
  rawOutput: string;
}

/** API 错误响应 */
export interface DiagnoseError {
  error: string;
  message: string;
}

/** 应用状态 */
export interface AppState {
  text: string;
  previousText: string;
  previousDiagnosis: Diagnosis | null;
  diagnosis: Diagnosis | null;
  rawOutput: string | null;
  retryCount: number;
  isLoading: boolean;
  error: string | null;
}
