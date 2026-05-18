import React, { useState, useRef } from 'react'
import { api } from './api'
import { QuestionResponse } from './types'
import './App.css'

function App() {
  // Repository Ingestion State
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('')
  const [forceRefresh, setForceRefresh] = useState(false)
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestMessage, setIngestMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [repoId, setRepoId] = useState<string | null>(null)
  const [repoStats, setRepoStats] = useState<{
    total_chunks: number
    total_files: number
  } | null>(null)

  // Question State
  const [question, setQuestion] = useState('')
  const [topK, setTopK] = useState(6)
  const [questionLoading, setQuestionLoading] = useState(false)
  const [response, setResponse] = useState<QuestionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const answerContentRef = useRef<HTMLDivElement>(null)

  const handleIngestRepository = async () => {
    if (!repoUrl.trim()) {
      setIngestMessage({ type: 'error', text: 'Enter a GitHub repository URL first.' })
      return
    }

    setIngestLoading(true)
    setIngestMessage(null)

    try {
      const result = await api.ingestRepository({
        repo_url: repoUrl,
        branch: branch || null,
        force_refresh: forceRefresh,
      })

      setRepoId(result.repo_id)
      setRepoStats({
        total_chunks: result.total_chunks,
        total_files: result.total_files,
      })
      setIngestMessage({
        type: 'success',
        text: `Indexed ${result.repo_id} with ${result.total_chunks} chunks.`,
      })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to ingest repository'
      setIngestMessage({ type: 'error', text: errorMessage })
    } finally {
      setIngestLoading(false)
    }
  }

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setError('Enter a question first.')
      return
    }

    if (!repoUrl && !repoId) {
      setError('Ingest a repository or provide a repo URL first.')
      return
    }

    setQuestionLoading(true)
    setError(null)
    setResponse(null)

    try {
      const payload = {
        question,
        repo_id: repoId || undefined,
        repo_url: repoUrl || undefined,
        top_k: topK,
      }

      const result = await api.askQuestion(payload)
      setResponse(result)

      // Auto-scroll to answer
      setTimeout(() => {
        answerContentRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to ask question'
      setError(errorMessage)
    } finally {
      setQuestionLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleAskQuestion()
    }
  }

  const handleCopyAnswer = () => {
    if (response?.answer) {
      navigator.clipboard.writeText(response.answer)
    }
  }

  const handleShowAllSources = () => {
    // This could be expanded to show a modal or expanded sources list
    if (answerContentRef.current) {
      const sourcesElement = document.querySelector('.sources-container')
      sourcesElement?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          &lt;/&gt;
        </div>
        <h2>RepoRAG</h2>

        <div className="form-group">
          <label htmlFor="repo-url">GitHub URL</label>
          <input
            id="repo-url"
            type="text"
            placeholder="https://github.com/owner/repository"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={ingestLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="branch">Branch</label>
          <input
            id="branch"
            type="text"
            placeholder="Leave empty to use the default branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            disabled={ingestLoading}
          />
        </div>

        <div className="form-group checkbox-group">
          <input
            id="force-refresh"
            type="checkbox"
            checked={forceRefresh}
            onChange={(e) => setForceRefresh(e.target.checked)}
            disabled={ingestLoading}
          />
          <label htmlFor="force-refresh">Force refresh local clone</label>
        </div>

        <button
          className="ingest-button"
          onClick={handleIngestRepository}
          disabled={ingestLoading}
        >
          {ingestLoading ? (
            <>
              <span className="spinner"></span>
              Indexing...
            </>
          ) : (
            'Ingest Repository'
          )}
        </button>

        {ingestMessage && (
          <div className={`status-message ${ingestMessage.type}`}>
            {ingestMessage.type === 'success' && <span className="status-icon">✓</span>}
            {ingestMessage.type === 'error' && <span className="status-icon">✕</span>}
            {ingestMessage.text}
          </div>
        )}

        {repoId && repoStats && (
          <div className="repo-info-box">
            <div className="repo-info-header">
              <span className="checkmark">✓</span>
              <span>Repository indexed successfully</span>
            </div>
            <div className="repo-id-section">
              <div className="label">Repo ID</div>
              <div className="repo-id-value">{repoId}</div>
            </div>
            <div className="repo-stats">
              <span>{repoStats.total_chunks} chunks</span>
              <span>•</span>
              <span>{repoStats.total_files} files</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h1>Codebase Q&A Assistant</h1>
          <p>Ingest a GitHub repository, then ask questions about the codebase.</p>
        </div>

        <div className="qa-section">
          <div className="qa-input-area">
            <h2>Ask Questions</h2>
            <textarea
              placeholder="Where is authentication handled?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={questionLoading}
            />

            <div className="slider-group">
              <label htmlFor="top-k">Sources to return:</label>
              <input
                id="top-k"
                type="range"
                min="3"
                max="12"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                disabled={questionLoading}
              />
              <span className="slider-value">{topK}</span>
            </div>

            <button
              className="ask-button"
              onClick={handleAskQuestion}
              disabled={questionLoading || !question.trim()}
            >
              {questionLoading ? (
                <>
                  <span className="spinner"></span>
                  Thinking...
                </>
              ) : (
                'Ask'
              )}
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          {response && (
            <div className="answer-container">
              <div className="answer-section">
                <div className="answer-header">
                  <h2>Answer</h2>
                  <button 
                    className="copy-button" 
                    onClick={handleCopyAnswer}
                    title="Copy answer to clipboard"
                  >
                    <span>📋</span> Copy
                  </button>
                </div>
                <div className="answer-content" ref={answerContentRef}>
                  {response.answer.split('\n').map((paragraph, i) => (
                    <p key={i}>{paragraph || '\u00A0'}</p>
                  ))}
                </div>
              </div>

              {response.sources && response.sources.length > 0 && (
                <div className="sources-container">
                  <div className="sources-header">
                    <h2>Sources</h2>
                    <button 
                      className="view-all-button"
                      onClick={handleShowAllSources}
                    >
                      View all sources
                    </button>
                  </div>
                  {response.sources.map((source, index) => (
                    <div key={index} className="source-item">
                      <div className="source-file">📄 {source.file_path}</div>
                      {source.symbol_name && (
                        <div className="source-symbol">
                          ::{source.symbol_name}
                        </div>
                      )}
                      {source.start_line && source.end_line && (
                        <div className="source-location">
                          Lines {source.start_line}–{source.end_line}
                        </div>
                      )}
                      <button className="source-copy" title="Copy source reference">📋</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!response && !error && !questionLoading && (
            <div className="empty-state">
              Ask a question about the codebase to get started
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
