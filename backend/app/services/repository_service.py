from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import get_settings
from app.embeddings.huggingface import SentenceTransformerEmbeddings
from app.ingestion.code_parser import CodeChunker
from app.ingestion.repo_cloner import RepoCloner
from app.models.schemas import IngestRepoRequest, IngestRepoResponse
from app.retrieval.faiss_store import FAISSVectorStore
from app.utils.github import normalize_github_repo_target
from app.utils.ids import repo_id_from_url

logger = logging.getLogger(__name__)


class RepositoryService:
    """Coordinate repository cloning, parsing, and indexing."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.repo_cloner = RepoCloner()
        self.chunker = CodeChunker(
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
            max_file_size_bytes=self.settings.max_file_size_bytes,
        )
        self.embeddings = SentenceTransformerEmbeddings(
            model_name=self.settings.embedding_model_name
        )
        self.vector_store = FAISSVectorStore(self.embeddings)

    def ingest_repository(self, payload: IngestRepoRequest) -> IngestRepoResponse:
        """Clone the repository and build a persistent FAISS index."""
        target = normalize_github_repo_target(
            repo_url=payload.repo_url,
            branch=payload.branch,
        )
        repo_id = repo_id_from_url(target.repo_url)
        logger.info("Ingesting repository repo_id=%s url=%s", repo_id, target.repo_url)

        local_repo_path = self.repo_cloner.clone_or_update(
            repo_url=target.repo_url,
            repo_id=repo_id,
            branch=target.branch,
            force_refresh=payload.force_refresh,
        )

        # Validate repository size
        repo_size = sum(f.stat().st_size for f in Path(local_repo_path).rglob('*') if f.is_file())
        max_size = self.settings.max_repo_size_bytes
        if repo_size > max_size:
            raise ValueError(
                f"Repository size ({repo_size / 1_000_000:.1f}MB) exceeds limit ({max_size / 1_000_000:.1f}MB). "
                "Please ingest a smaller repository to conserve memory."
            )

        documents, stats = self.chunker.chunk_repository(
            repo_path=local_repo_path,
            repo_id=repo_id,
            repo_url=target.repo_url,
        )
        if not documents:
            raise ValueError("No supported source files were found to index.")

        manifest = {
            "repo_id": repo_id,
            "repo_url": target.repo_url,
            "branch": target.branch,
            "indexed_at": datetime.now(timezone.utc).isoformat(),
            "embedding_model": self.settings.embedding_model_name,
            "chunk_size": self.settings.chunk_size,
            "chunk_overlap": self.settings.chunk_overlap,
            "total_chunks": len(documents),
            "total_files": stats.total_files,
            "skipped_files": stats.skipped_files,
        }

        self.vector_store.build_and_persist(
            repo_id=repo_id,
            documents=documents,
            manifest=manifest,
        )
        logger.info(
            "Repository indexed repo_id=%s files=%s chunks=%s",
            repo_id,
            stats.total_files,
            len(documents),
        )

        return IngestRepoResponse(
            repo_id=repo_id,
            repo_url=target.repo_url,
            branch=target.branch,
            local_path=str(local_repo_path),
            index_path=str(self.settings.vector_store_dir / repo_id),
            indexed_at=manifest["indexed_at"],
            total_chunks=len(documents),
            total_files=stats.total_files,
            skipped_files=stats.skipped_files,
        )
