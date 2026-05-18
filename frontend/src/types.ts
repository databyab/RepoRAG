export interface SourceReference {
  file_path: string
  symbol_name?: string
  start_line?: number
  end_line?: number
  score?: number
}

export interface IngestRepoRequest {
  repo_url: string
  branch?: string | null
  force_refresh: boolean
}

export interface IngestRepoResponse {
  repo_id: string
  repo_url: string
  branch?: string | null
  local_path: string
  index_path: string
  indexed_at: string
  total_chunks: number
  total_files: number
  skipped_files: number
}

export interface QuestionRequest {
  question: string
  repo_id?: string | null
  repo_url?: string | null
  top_k?: number
  fetch_k?: number
  max_context_chars?: number
}

export interface QuestionResponse {
  repo_id: string
  question: string
  answer: string
  sources: SourceReference[]
}

export interface HealthResponse {
  status: string
}
