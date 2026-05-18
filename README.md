# Codebase Q&A Assistant

A RAG-powered system for answering questions about GitHub repositories. Ingest a repo, ask questions, get answers with source citations.

**Stack**: FastAPI backend + React frontend + FAISS vector search + Groq LLM

## Quick Start

### Docker (Recommended)

```bash
docker compose up --build
```



### Local Development

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```


## Features

-  Index any GitHub repository
-  Ask natural language questions about the codebase
-  Get answers with precise source citations (file, line numbers)
-  Fast retrieval with FAISS vector search
-  Modern React UI with responsive design

## Architecture Overview

1. **Repository Ingestion**: Clone repo → parse code/notebooks → chunk with language-aware splitters
2. **Embedding**: Generate embeddings using sentence-transformers, store in FAISS
3. **QA Pipeline**: Retrieve relevant chunks → constrain context → send to Groq LLM
4. **Result**: Answer with file paths, symbol names, and line ranges for sources

## Project Structure

```
backend/          # FastAPI server, embedding, vector store, LLM integration
frontend/         # React app, build with Vite
docker-compose.yml
```

## API Endpoints

- `POST /api/v1/repos/ingest` - Index a repository
- `POST /api/v1/qa/ask` - Ask a question
- `GET /api/v1/health` - Health check

## Environment Setup

Set `GROQ_API_KEY` for the backend. The frontend auto-configures for Docker deployments.

