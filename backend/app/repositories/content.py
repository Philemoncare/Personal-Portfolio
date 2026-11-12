from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Article,
    Certificate,
    ExperienceEntry,
    LeadershipEntry,
    NowItem,
    SiteSettings,
    SkillGroup,
    TimelineEntry,
)


class ContentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def experience(self) -> list[ExperienceEntry]:
        return list(
            self.db.scalars(
                select(ExperienceEntry)
                .where(ExperienceEntry.status == "published")
                .order_by(ExperienceEntry.sort_order, ExperienceEntry.started_on.desc())
            ).all()
        )

    def leadership(self) -> list[LeadershipEntry]:
        return list(
            self.db.scalars(
                select(LeadershipEntry)
                .where(LeadershipEntry.status == "published")
                .order_by(
                    LeadershipEntry.sort_order, LeadershipEntry.started_on.desc().nulls_last()
                )
            ).all()
        )

    def skill_groups(self) -> list[SkillGroup]:
        groups = self.db.scalars(
            select(SkillGroup)
            .order_by(SkillGroup.sort_order)
            .options(selectinload(SkillGroup.skills))
        ).all()
        return [
            group
            for group in groups
            if any(skill.published_at is not None for skill in group.skills)
        ]

    def certificates(self) -> list[Certificate]:
        return list(
            self.db.scalars(
                select(Certificate)
                .where(Certificate.status == "published")
                .order_by(Certificate.sort_order, Certificate.issued_on.desc().nulls_last())
            ).all()
        )

    def articles(self) -> list[Article]:
        return list(
            self.db.scalars(
                select(Article)
                .where(Article.status == "published")
                .order_by(Article.sort_order, Article.published_at.desc())
            ).all()
        )

    def article_by_slug(self, slug: str) -> Article | None:
        return self.db.scalar(
            select(Article).where(
                Article.slug == slug, Article.status == "published"
            )
        )

    def timeline(self) -> list[TimelineEntry]:
        return list(
            self.db.scalars(
                select(TimelineEntry)
                .where(TimelineEntry.status == "published")
                .order_by(
                    TimelineEntry.year.desc(),
                    TimelineEntry.month.desc().nulls_last(),
                    TimelineEntry.sort_order,
                )
            ).all()
        )

    def now_items(self) -> list[NowItem]:
        return list(
            self.db.scalars(
                select(NowItem)
                .where(NowItem.status == "published")
                .order_by(NowItem.sort_order)
            ).all()
        )

    def site_settings(self) -> SiteSettings | None:
        return self.db.get(SiteSettings, 1)
