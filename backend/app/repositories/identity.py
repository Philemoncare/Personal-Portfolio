from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    ExperienceEntry,
    LeadershipEntry,
    NowItem,
    Resume,
    SiteProfile,
    SiteSettings,
    TimelineEntry,
)


class IdentityRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # --- Profile ----------------------------------------------------------
    def profile(self) -> SiteProfile | None:
        return self.db.get(SiteProfile, 1)

    def site_settings(self) -> SiteSettings | None:
        return self.db.get(SiteSettings, 1)

    # --- Resumes ----------------------------------------------------------
    def resumes(self) -> list[Resume]:
        return list(
            self.db.scalars(
                select(Resume).order_by(
                    Resume.is_current.desc(), Resume.created_at.desc()
                )
            ).all()
        )

    def current_resume(self) -> Resume | None:
        return self.db.scalar(
            select(Resume)
            .where(Resume.status == "published", Resume.is_current.is_(True))
            .order_by(Resume.published_at.desc().nulls_last(), Resume.created_at.desc())
            .limit(1)
        )

    def resume(self, resume_id) -> Resume | None:
        return self.db.get(Resume, resume_id)

    # --- Experience / leadership detail -----------------------------------
    def experience_by_slug(self, slug: str) -> ExperienceEntry | None:
        return self.db.scalar(
            select(ExperienceEntry).where(
                ExperienceEntry.slug == slug,
                ExperienceEntry.status == "published",
            )
        )

    def leadership_by_slug(self, slug: str) -> LeadershipEntry | None:
        return self.db.scalar(
            select(LeadershipEntry).where(
                LeadershipEntry.slug == slug,
                LeadershipEntry.status == "published",
            )
        )

    # --- Timeline ---------------------------------------------------------
    def timeline(self, kind: str | None = None) -> list[TimelineEntry]:
        statement = select(TimelineEntry).where(TimelineEntry.status == "published")
        if kind:
            statement = statement.where(TimelineEntry.kind == kind)
        return list(
            self.db.scalars(
                statement.order_by(
                    TimelineEntry.start_date.desc().nulls_last(),
                    TimelineEntry.year.desc(),
                    TimelineEntry.month.desc().nulls_last(),
                    TimelineEntry.display_order,
                    TimelineEntry.title,
                )
            ).all()
        )

    def timeline_by_slug(self, slug: str) -> TimelineEntry | None:
        return self.db.scalar(
            select(TimelineEntry).where(
                TimelineEntry.slug == slug, TimelineEntry.status == "published"
            )
        )

    # --- Now --------------------------------------------------------------
    def now_items(self, category: str | None = None) -> list[NowItem]:
        statement = select(NowItem).where(
            NowItem.status == "published",
            NowItem.active.is_(True),
        )
        if category:
            statement = statement.where(NowItem.category == category)
        return list(
            self.db.scalars(
                statement.order_by(
                    NowItem.priority.desc(),
                    NowItem.sort_order,
                    NowItem.updated_at.desc(),
                )
            ).all()
        )
