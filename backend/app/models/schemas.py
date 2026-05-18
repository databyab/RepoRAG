from __future__ import annotations

import re
from pydantic import BaseModel, Field, field_validator, model_validator


# Valid GitHub URL pattern (prevents SSRF)
GITHUB_URL_PATTERN = re.compile(
    r"^https://github\.com/[a-zA-Z0-9\-_.]+/[a-zA-Z0-9\-_.]+(?:\.git)?/?$"
)


class HealthResponse(BaseModel):
    """Health check payload."""

    status: str


class IngestRepoRequest(BaseModel):
    """Request body for repository ingestion."""

    repo_url: str = Field(..., description="GitHub repository URL")
    branch: str | None = Field(default=None, description="Optional branch name")
    force_refresh: bool = Field(default=False)

    @field_validator("repo_url", mode="after")
    @classmethod
    def validate_github_url(cls, url: str) -> str:
        """Validate that URL is a valid GitHub repository."""
        if not GITHUB_URL_PATTERN.match(url):
            raise ValueError("URL must be a valid GitHub repository URL (https://github.com/owner/repo)")
        return url.rstrip("/")

    @field_validator("branch", mode="after")
    @classmethod
    def validate_branch(cls, branch: str | None) -> str | None:
        """Validate branch name format (prevent injection)."""
        if branch and not re.match(r"^[a-zA-Z0-9\-_./@]+$", branch):
            raise ValueError("Invalid branch name format")
        return branch


class IngestRepoResponse(BaseModel):
    """Repository indexing result payload."""

    repo_id: str
    repo_url: str
    branch: str | None = None
    local_path: str
    index_path: str
    indexed_at: str
    total_chunks: int
    total_files: int
    skipped_files: int


class QuestionRequest(BaseModel):
    """Request body for question answering."""

    question: str
    repo_id: str | None = None
    repo_url: str | None = None
    top_k: int | None = Field(default=8, ge=1, le=20)
    fetch_k: int | None = Field(default=24, ge=4, le=60)
    max_context_chars: int | None = Field(default=18000, ge=4000, le=40000)

    @field_validator("question", mode="after")
    @classmethod
    def validate_question(cls, question: str) -> str:
        """Validate question is not empty."""
        if not question or len(question.strip()) == 0:
            raise ValueError("Question cannot be empty")
        if len(question) > 5000:
            raise ValueError("Question too long (max 5000 characters)")
        return question.strip()

    @field_validator("repo_url", mode="after")
    @classmethod
    def validate_repo_url(cls, url: str | None) -> str | None:
        """Validate repository URL if provided."""
        if url and not GITHUB_URL_PATTERN.match(url):
            raise ValueError("URL must be a valid GitHub repository URL")
        return url

    @model_validator(mode="after")
    def validate_repo_identifier(self) -> "QuestionRequest":
        """Require either repo_id or repo_url."""
        if not self.repo_id and not self.repo_url:
            raise ValueError("Either repo_id or repo_url must be provided.")
        return self


class SourceReference(BaseModel):
    """Source citation returned alongside the answer."""

    file_path: str
    symbol_name: str | None = None
    start_line: int | None = None
    end_line: int | None = None
    score: float | None = None


class QuestionResponse(BaseModel):
    """Standard question-answering response."""

    repo_id: str
    question: str
    answer: str
    sources: list[SourceReference]
