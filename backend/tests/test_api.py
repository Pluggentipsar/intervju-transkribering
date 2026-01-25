"""Basic API tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient) -> None:
    """Test the health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data


@pytest.mark.asyncio
async def test_list_models(client: AsyncClient) -> None:
    """Test listing available models."""
    response = await client.get("/api/v1/models")
    assert response.status_code == 200
    models = response.json()
    assert len(models) == 5  # tiny, base, small, medium, large
    assert any(m["id"] == "KBLab/kb-whisper-small" for m in models)


@pytest.mark.asyncio
async def test_list_jobs_empty(client: AsyncClient) -> None:
    """Test listing jobs when empty."""
    response = await client.get("/api/v1/jobs")
    assert response.status_code == 200
    data = response.json()
    assert data["jobs"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_get_nonexistent_job(client: AsyncClient) -> None:
    """Test getting a job that doesn't exist."""
    response = await client.get("/api/v1/jobs/nonexistent-id")
    assert response.status_code == 404
