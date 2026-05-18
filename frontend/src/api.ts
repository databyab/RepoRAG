import axios, { AxiosInstance } from 'axios'
import {
  IngestRepoRequest,
  IngestRepoResponse,
  QuestionRequest,
  QuestionResponse,
  HealthResponse,
} from './types'

class APIClient {
  private client: AxiosInstance

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 300000, // 5 minutes for ingest
    })
  }

  async health(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health')
    return response.data
  }

  async ingestRepository(
    payload: IngestRepoRequest
  ): Promise<IngestRepoResponse> {
    const response = await this.client.post<IngestRepoResponse>(
      '/repos/ingest',
      payload
    )
    return response.data
  }

  async askQuestion(payload: QuestionRequest): Promise<QuestionResponse> {
    const response = await this.client.post<QuestionResponse>(
      '/qa/ask',
      payload
    )
    return response.data
  }

  async *streamQuestion(
    payload: QuestionRequest
  ): AsyncGenerator<string, void, unknown> {
    const response = await this.client.get('/qa/ask/stream', {
      params: {
        question: payload.question,
        repo_id: payload.repo_id,
        repo_url: payload.repo_url,
        top_k: payload.top_k,
        fetch_k: payload.fetch_k,
        max_context_chars: payload.max_context_chars,
      },
      responseType: 'stream',
    })

    // This is a simplified implementation - in a real app, you'd parse SSE properly
    const lines = response.data.toString().split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6))
          if (data.content) {
            yield data.content
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  async deleteRepository(repo_id: string): Promise<{ message: string; deleted: string }> {
    const response = await this.client.delete(`/repos/${repo_id}`)
    return response.data
  }
}

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000/api/v1'

export const api = new APIClient(apiBaseUrl)
