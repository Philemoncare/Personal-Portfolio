"""Admin write operations for social links and editable page content."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import PAGE_KEYS
from app.models import PageContent, SocialLink
from app.schemas.site import PageContentInput, SocialLinkInput


class SiteContentError(Exception):
    """A validation problem that should be returned as a 400 response."""


def list_social_links(db: Session, *, include_hidden: bool = False) -> list[SocialLink]:
    statement = select(SocialLink)
    if not include_hidden:
        statement = statement.where(SocialLink.is_visible.is_(True))
    return list(
        db.scalars(
            statement.order_by(SocialLink.sort_order.asc(), SocialLink.label.asc())
        ).all()
    )


def get_social_link(db: Session, link_id: uuid.UUID) -> SocialLink | None:
    return db.get(SocialLink, link_id)


def create_social_link(db: Session, payload: SocialLinkInput) -> SocialLink:
    link = SocialLink()
    _apply_social(link, payload)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def update_social_link(
    db: Session, link: SocialLink, payload: SocialLinkInput
) -> SocialLink:
    _apply_social(link, payload)
    db.commit()
    db.refresh(link)
    return link


def _apply_social(link: SocialLink, payload: SocialLinkInput) -> None:
    link.platform = payload.platform.strip().lower()
    link.label = payload.label.strip()
    link.url = payload.url.strip()
    link.handle = payload.handle
    link.sort_order = payload.sort_order
    link.is_visible = payload.is_visible


def delete_social_link(db: Session, link: SocialLink) -> None:
    db.delete(link)
    db.commit()


def public_pages(db: Session) -> list[PageContent]:
    return list(
        db.scalars(
            select(PageContent)
            .where(PageContent.is_published.is_(True))
            .order_by(PageContent.page_key)
        ).all()
    )


def get_public_page(db: Session, page_key: str) -> PageContent | None:
    return db.scalar(
        select(PageContent).where(
            PageContent.page_key == page_key,
            PageContent.is_published.is_(True),
        )
    )


def list_pages(db: Session) -> list[PageContent]:
    existing = {
        item.page_key: item for item in db.scalars(select(PageContent)).all()
    }
    return [existing[key] for key in PAGE_KEYS if key in existing]


def get_page(db: Session, page_key: str) -> PageContent | None:
    return db.scalar(select(PageContent).where(PageContent.page_key == page_key))


def upsert_page(
    db: Session, page_key: str, payload: PageContentInput
) -> PageContent:
    if page_key not in PAGE_KEYS:
        raise SiteContentError("Unknown page key.")
    page = get_page(db, page_key)
    if page is None:
        page = PageContent(page_key=page_key)
        db.add(page)
    page.eyebrow = payload.eyebrow
    page.title = payload.title
    page.description = payload.description
    page.intro = payload.intro
    page.hero_image = payload.hero_image
    page.seo_title = payload.seo_title
    page.seo_description = payload.seo_description
    page.og_image = payload.og_image
    page.canonical_path = payload.canonical_path
    page.is_published = payload.is_published
    page.content = payload.content
    db.commit()
    db.refresh(page)
    return page
