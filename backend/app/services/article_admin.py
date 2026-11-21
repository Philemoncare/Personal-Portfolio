"""Write operations for article administration."""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Article
from app.schemas.content import ArticleInput


class AdminInputError(Exception):
    """A validation problem that should be reported as a 400 response."""


def slugify(value: str, max_length: int = 200) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:max_length].strip("-")


def _unique_slug(
    db: Session, requested: str, *, exclude_id: uuid.UUID | None = None
) -> str:
    base = requested or "article"
    candidate = base
    suffix = 2
    while True:
        statement = select(Article.id).where(Article.slug == candidate)
        if exclude_id is not None:
            statement = statement.where(Article.id != exclude_id)
        if db.scalar(statement) is None:
            return candidate
        candidate = f"{base}-{suffix}"[:200]
        suffix += 1


def _apply_publish_state(article: Article, status: str) -> None:
    if status not in {"draft", "published", "archived"}:
        raise AdminInputError("Invalid publish status.")
    article.status = status
    if status == "published" and article.published_at is None:
        article.published_at = datetime.now(UTC)
    if status != "published":
        article.published_at = None


def _clean_tags(tags: list[str]) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for raw in tags:
        tag = raw.strip()
        if not tag:
            continue
        key = tag.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(tag[:40])
    return cleaned[:12]


def _apply(db: Session, article: Article, payload: ArticleInput, *, is_new: bool) -> None:
    title = payload.title.strip()
    if not title:
        raise AdminInputError("A title is required.")
    article.title = title
    requested = payload.slug.strip() if payload.slug else slugify(title)
    if not requested:
        raise AdminInputError("A slug is required.")
    article.slug = _unique_slug(
        db, requested, exclude_id=None if is_new else article.id
    )
    article.excerpt = payload.excerpt
    article.body = payload.body
    article.cover_image_url = payload.cover_image_url
    article.external_url = payload.external_url
    article.category = (payload.category or "").strip() or None
    article.tags = _clean_tags(payload.tags)
    article.featured = payload.featured
    article.seo_title = (payload.seo_title or "").strip() or None
    article.seo_description = (payload.seo_description or "").strip() or None
    article.sort_order = payload.sort_order
    article.is_placeholder = payload.is_placeholder
    _apply_publish_state(article, payload.publish_status)


def create_article(db: Session, payload: ArticleInput) -> Article:
    article = Article()
    _apply(db, article, payload, is_new=True)
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


def update_article(db: Session, article: Article, payload: ArticleInput) -> Article:
    _apply(db, article, payload, is_new=False)
    db.commit()
    db.refresh(article)
    return article


def delete_article(db: Session, article: Article) -> None:
    db.delete(article)
    db.commit()


def reorder_articles(db: Session, ids: list[uuid.UUID]) -> int:
    items = {
        item.id: item
        for item in db.scalars(select(Article).where(Article.id.in_(ids))).all()
    }
    for index, article_id in enumerate(ids):
        article = items.get(article_id)
        if article is not None:
            article.sort_order = index * 10
    db.commit()
    return len(items)
