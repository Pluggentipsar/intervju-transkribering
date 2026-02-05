"""Word template management endpoints."""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.template import WordTemplate
from app.schemas.segment import (
    CustomWordItem,
    WordTemplateCreate,
    WordTemplateListResponse,
    WordTemplateResponse,
    WordTemplateUpdate,
)

router = APIRouter()


def template_to_response(template: WordTemplate) -> WordTemplateResponse:
    """Convert a WordTemplate model to a response schema."""
    words = json.loads(template.words_json)
    return WordTemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        words=[CustomWordItem(**w) for w in words],
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat(),
    )


@router.get("", response_model=WordTemplateListResponse)
async def list_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 50,
) -> WordTemplateListResponse:
    """List all word templates."""
    # Get total count
    count_query = select(func.count(WordTemplate.id))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get templates
    query = (
        select(WordTemplate)
        .order_by(WordTemplate.name.asc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    templates = result.scalars().all()

    return WordTemplateListResponse(
        templates=[template_to_response(t) for t in templates],
        total=total,
    )


@router.post("", response_model=WordTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: WordTemplateCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WordTemplateResponse:
    """Create a new word template."""
    # Check for duplicate name
    existing_query = select(WordTemplate).where(WordTemplate.name == data.name)
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"En mall med namnet '{data.name}' finns redan",
        )

    # Create template
    words_json = json.dumps([w.model_dump() for w in data.words])
    template = WordTemplate(
        name=data.name,
        description=data.description,
        words_json=words_json,
    )

    db.add(template)
    await db.commit()
    await db.refresh(template)

    return template_to_response(template)


@router.get("/{template_id}", response_model=WordTemplateResponse)
async def get_template(
    template_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WordTemplateResponse:
    """Get a specific template by ID."""
    query = select(WordTemplate).where(WordTemplate.id == template_id)
    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mallen hittades inte",
        )

    return template_to_response(template)


@router.patch("/{template_id}", response_model=WordTemplateResponse)
async def update_template(
    template_id: str,
    data: WordTemplateUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WordTemplateResponse:
    """Update a template."""
    query = select(WordTemplate).where(WordTemplate.id == template_id)
    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mallen hittades inte",
        )

    # Check for duplicate name if changing
    if data.name is not None and data.name != template.name:
        existing_query = select(WordTemplate).where(WordTemplate.name == data.name)
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"En mall med namnet '{data.name}' finns redan",
            )
        template.name = data.name

    if data.description is not None:
        template.description = data.description

    if data.words is not None:
        template.words_json = json.dumps([w.model_dump() for w in data.words])

    await db.commit()
    await db.refresh(template)

    return template_to_response(template)


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Delete a template."""
    query = select(WordTemplate).where(WordTemplate.id == template_id)
    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mallen hittades inte",
        )

    await db.delete(template)
    await db.commit()

    return {"status": "deleted", "template_id": template_id}
