"""identity layer: profile, resumes, global settings, now, timeline, contact

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2026-11-14 10:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d8e9f0a1b2c3"
down_revision: str | None = "c7d8e9f0a1b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- Profile ---------------------------------------------------------
    op.create_table(
        "site_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("professional_title", sa.String(length=200), nullable=True),
        sa.Column("short_bio", sa.Text(), nullable=True),
        sa.Column("long_bio", sa.Text(), nullable=True),
        sa.Column("what_i_build", sa.Text(), nullable=True),
        sa.Column("how_i_work", sa.Text(), nullable=True),
        sa.Column("current_direction", sa.Text(), nullable=True),
        sa.Column("personal_interests", sa.Text(), nullable=True),
        sa.Column("profile_image", sa.String(length=1000), nullable=True),
        sa.Column("location", sa.String(length=160), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("availability", sa.String(length=200), nullable=True),
        sa.Column("resume_url", sa.String(length=500), nullable=True),
        sa.Column("github_url", sa.String(length=500), nullable=True),
        sa.Column("linkedin_url", sa.String(length=500), nullable=True),
        sa.Column("website_url", sa.String(length=500), nullable=True),
        sa.Column(
            "is_placeholder", sa.Boolean(), server_default="0", nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_site_profiles")),
    )

    # --- Resumes ---------------------------------------------------------
    op.create_table(
        "resumes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("version_label", sa.String(length=80), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column(
            "is_current", sa.Boolean(), server_default="0", nullable=False
        ),
        sa.Column(
            "download_count", sa.Integer(), server_default="0", nullable=False
        ),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "is_placeholder", sa.Boolean(), server_default="0", nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'archived')",
            name=op.f("ck_resumes_status_valid"),
        ),
        sa.CheckConstraint("file_size > 0", name=op.f("ck_resumes_file_size_positive")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_resumes")),
        sa.UniqueConstraint("file_name", name=op.f("uq_resumes_file_name")),
    )
    with op.batch_alter_table("resumes") as batch_op:
        batch_op.create_index(
            batch_op.f("ix_resumes_is_current"), ["is_current"], unique=False
        )
        batch_op.create_index(batch_op.f("ix_resumes_status"), ["status"], unique=False)

    # --- Global settings -------------------------------------------------
    with op.batch_alter_table("site_settings") as batch_op:
        batch_op.add_column(
            sa.Column(
                "site_name", sa.String(length=120), server_default="Phill", nullable=False
            )
        )
        batch_op.add_column(sa.Column("site_description", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "wordmark", sa.String(length=80), server_default="Phill", nullable=False
            )
        )
        batch_op.add_column(sa.Column("social_image", sa.String(length=1000), nullable=True))
        batch_op.add_column(sa.Column("favicon", sa.String(length=1000), nullable=True))
        batch_op.add_column(
            sa.Column(
                "accent", sa.String(length=40), server_default="signal", nullable=False
            )
        )
        batch_op.add_column(sa.Column("footer_text", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("copyright_text", sa.String(length=300), nullable=True))
        batch_op.add_column(sa.Column("phone", sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column("website_url", sa.String(length=500), nullable=True))

    # --- Contact messages ------------------------------------------------
    with op.batch_alter_table("contact_messages") as batch_op:
        batch_op.add_column(sa.Column("inquiry_type", sa.String(length=80), nullable=True))
        batch_op.add_column(
            sa.Column(
                "email_status",
                sa.String(length=20),
                server_default="not_configured",
                nullable=False,
            )
        )
        batch_op.add_column(sa.Column("replied_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.drop_constraint(op.f("ck_contact_messages_status_valid"), type_="check")
        batch_op.create_check_constraint(
            op.f("ck_contact_messages_status_valid"),
            "status IN ('new', 'read', 'replied', 'archived')",
        )

    # --- Now items -------------------------------------------------------
    op.execute(
        sa.text(
            "UPDATE now_items SET label = COALESCE(label, 'Other') "
            "WHERE label IS NULL"
        )
    )
    with op.batch_alter_table("now_items") as batch_op:
        batch_op.alter_column("label", existing_type=sa.String(length=80), nullable=True)
        batch_op.add_column(
            sa.Column(
                "category", sa.String(length=40), server_default="other", nullable=False
            )
        )
        batch_op.add_column(
            sa.Column(
                "item_status",
                sa.String(length=20),
                server_default="active",
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column("active", sa.Boolean(), server_default="1", nullable=False)
        )
        batch_op.add_column(
            sa.Column("priority", sa.Integer(), server_default="0", nullable=False)
        )
        batch_op.add_column(sa.Column("external_url", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("related_project_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("related_build_lab_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("related_leadership_id", sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            op.f("fk_now_items_related_project_id_projects"),
            "projects",
            ["related_project_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_foreign_key(
            op.f("fk_now_items_related_build_lab_id_projects"),
            "projects",
            ["related_build_lab_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_foreign_key(
            op.f("fk_now_items_related_leadership_id_leadership_entries"),
            "leadership_entries",
            ["related_leadership_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_check_constraint(
            op.f("ck_now_items_now_category_valid"),
            "category IN ('building', 'learning', 'exploring', 'leading', "
            "'reading', 'experimenting', 'other')",
        )
        batch_op.create_check_constraint(
            op.f("ck_now_items_now_item_status_valid"),
            "item_status IN ('active', 'ongoing', 'paused', 'completed')",
        )
        batch_op.create_index(batch_op.f("ix_now_items_category"), ["category"], unique=False)
        batch_op.create_index(
            batch_op.f("ix_now_items_item_status"), ["item_status"], unique=False
        )
        batch_op.create_index(batch_op.f("ix_now_items_active"), ["active"], unique=False)
        batch_op.create_index(
            batch_op.f("ix_now_items_related_project_id"), ["related_project_id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_now_items_related_build_lab_id"),
            ["related_build_lab_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_now_items_related_leadership_id"),
            ["related_leadership_id"],
            unique=False,
        )

    # Derive a category from the legacy free-text label where it is obvious.
    op.execute(
        sa.text(
            "UPDATE now_items SET category = CASE "
            "WHEN lower(label) LIKE '%build%' THEN 'building' "
            "WHEN lower(label) LIKE '%learn%' THEN 'learning' "
            "WHEN lower(label) LIKE '%explor%' THEN 'exploring' "
            "WHEN lower(label) LIKE '%lead%' THEN 'leading' "
            "WHEN lower(label) LIKE '%read%' THEN 'reading' "
            "WHEN lower(label) LIKE '%experiment%' THEN 'experimenting' "
            "ELSE 'other' END"
        )
    )

    # --- Timeline --------------------------------------------------------
    # SQLite validates CHECK constraints immediately, so the legacy kind
    # constraint has to be removed before cloud/development can be remapped.
    with op.batch_alter_table("timeline_entries") as batch_op:
        batch_op.drop_constraint(op.f("ck_timeline_entries_kind_valid"), type_="check")

    op.execute(
        sa.text(
            "UPDATE timeline_entries SET kind = 'technical' "
            "WHERE kind IN ('cloud', 'development')"
        )
    )
    with op.batch_alter_table("timeline_entries") as batch_op:
        batch_op.alter_column(
            "sort_order",
            new_column_name="display_order",
            existing_type=sa.Integer(),
            existing_server_default="0",
            server_default="0",
            existing_nullable=False,
            nullable=False,
        )
        batch_op.add_column(sa.Column("slug", sa.String(length=220), nullable=True))
        batch_op.add_column(sa.Column("start_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("end_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("summary", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("organization", sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column("location", sa.String(length=160), nullable=True))
        batch_op.add_column(sa.Column("related_project_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("related_experience_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("related_leadership_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("external_url", sa.String(length=500), nullable=True))
        batch_op.add_column(
            sa.Column("featured", sa.Boolean(), server_default="0", nullable=False)
        )
        batch_op.create_foreign_key(
            op.f("fk_timeline_entries_related_project_id_projects"),
            "projects",
            ["related_project_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_foreign_key(
            op.f("fk_timeline_entries_related_experience_id_experience_entries"),
            "experience_entries",
            ["related_experience_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_foreign_key(
            op.f("fk_timeline_entries_related_leadership_id_leadership_entries"),
            "leadership_entries",
            ["related_leadership_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_check_constraint(
            op.f("ck_timeline_entries_kind_valid"),
            "kind IN ('education', 'project', 'experience', 'leadership', "
            "'certification', 'community', 'technical', 'milestone', 'other')",
        )
        batch_op.create_index(batch_op.f("ix_timeline_entries_slug"), ["slug"], unique=True)
        batch_op.create_index(
            batch_op.f("ix_timeline_entries_start_date"), ["start_date"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_timeline_entries_featured"), ["featured"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_timeline_entries_related_project_id"),
            ["related_project_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_timeline_entries_related_experience_id"),
            ["related_experience_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_timeline_entries_related_leadership_id"),
            ["related_leadership_id"],
            unique=False,
        )

    # Derive a timeline date from the retained year/month grouping.
    op.execute(
        sa.text(
            "UPDATE timeline_entries SET start_date = "
            "date(printf('%04d-%02d-01', year, COALESCE(month, 1))) "
            "WHERE start_date IS NULL"
        )
    )

    # --- Slugs for experience & leadership -------------------------------
    with op.batch_alter_table("experience_entries") as batch_op:
        batch_op.add_column(sa.Column("slug", sa.String(length=220), nullable=True))
        batch_op.create_index(
            batch_op.f("ix_experience_entries_slug"), ["slug"], unique=True
        )
    with op.batch_alter_table("leadership_entries") as batch_op:
        batch_op.add_column(sa.Column("slug", sa.String(length=220), nullable=True))
        batch_op.create_index(
            batch_op.f("ix_leadership_entries_slug"), ["slug"], unique=True
        )

    # --- Backfill profile + global settings from existing settings -------
    bind = op.get_bind()
    settings_row = bind.execute(
        sa.text(
            "SELECT display_name, role_title, hero_intro, bio, location, "
            "availability, email, github_url, linkedin_url, cv_url, is_placeholder "
            "FROM site_settings WHERE id = 1"
        )
    ).mappings().first()
    if settings_row is not None:
        bind.execute(
            sa.text(
                "INSERT INTO site_profiles (id, name, display_name, professional_title, "
                "short_bio, long_bio, location, email, availability, resume_url, "
                "github_url, linkedin_url, is_placeholder, created_at, updated_at) "
                "VALUES (1, :name, :display_name, :role_title, :hero_intro, :bio, "
                ":location, :email, :availability, :cv_url, :github_url, :linkedin_url, "
                ":is_placeholder, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "name": settings_row["display_name"],
                "display_name": settings_row["display_name"],
                "role_title": settings_row["role_title"],
                "hero_intro": settings_row["hero_intro"],
                "bio": settings_row["bio"],
                "location": settings_row["location"],
                "email": settings_row["email"],
                "availability": settings_row["availability"],
                "cv_url": settings_row["cv_url"],
                "github_url": settings_row["github_url"],
                "linkedin_url": settings_row["linkedin_url"],
                "is_placeholder": settings_row["is_placeholder"],
            },
        )
        bind.execute(
            sa.text(
                "UPDATE site_settings SET site_name = COALESCE(display_name, 'Phill'), "
                "site_description = COALESCE(site_description, bio), "
                "wordmark = COALESCE(display_name, 'Phill') WHERE id = 1"
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("leadership_entries") as batch_op:
        batch_op.drop_index(batch_op.f("ix_leadership_entries_slug"))
        batch_op.drop_column("slug")
    with op.batch_alter_table("experience_entries") as batch_op:
        batch_op.drop_index(batch_op.f("ix_experience_entries_slug"))
        batch_op.drop_column("slug")

    with op.batch_alter_table("timeline_entries") as batch_op:
        batch_op.drop_index(batch_op.f("ix_timeline_entries_related_leadership_id"))
        batch_op.drop_index(batch_op.f("ix_timeline_entries_related_experience_id"))
        batch_op.drop_index(batch_op.f("ix_timeline_entries_related_project_id"))
        batch_op.drop_index(batch_op.f("ix_timeline_entries_featured"))
        batch_op.drop_index(batch_op.f("ix_timeline_entries_start_date"))
        batch_op.drop_index(batch_op.f("ix_timeline_entries_slug"))
        batch_op.drop_constraint(op.f("fk_timeline_entries_related_leadership_id_leadership_entries"), type_="foreignkey")
        batch_op.drop_constraint(op.f("fk_timeline_entries_related_experience_id_experience_entries"), type_="foreignkey")
        batch_op.drop_constraint(op.f("fk_timeline_entries_related_project_id_projects"), type_="foreignkey")
        batch_op.drop_column("featured")
        batch_op.drop_column("external_url")
        batch_op.drop_column("related_leadership_id")
        batch_op.drop_column("related_experience_id")
        batch_op.drop_column("related_project_id")
        batch_op.drop_column("location")
        batch_op.drop_column("organization")
        batch_op.drop_column("summary")
        batch_op.drop_column("end_date")
        batch_op.drop_column("start_date")
        batch_op.drop_column("slug")
        batch_op.alter_column(
            "display_order", new_column_name="sort_order", existing_type=sa.Integer()
        )
        batch_op.drop_constraint(op.f("ck_timeline_entries_kind_valid"), type_="check")
        batch_op.create_check_constraint(
            op.f("ck_timeline_entries_kind_valid"),
            "kind IN ('education', 'project', 'leadership', 'cloud', "
            "'development', 'milestone')",
        )

    with op.batch_alter_table("now_items") as batch_op:
        batch_op.drop_index(batch_op.f("ix_now_items_related_leadership_id"))
        batch_op.drop_index(batch_op.f("ix_now_items_related_build_lab_id"))
        batch_op.drop_index(batch_op.f("ix_now_items_related_project_id"))
        batch_op.drop_index(batch_op.f("ix_now_items_active"))
        batch_op.drop_index(batch_op.f("ix_now_items_item_status"))
        batch_op.drop_index(batch_op.f("ix_now_items_category"))
        batch_op.drop_constraint(op.f("fk_now_items_related_leadership_id_leadership_entries"), type_="foreignkey")
        batch_op.drop_constraint(op.f("fk_now_items_related_build_lab_id_projects"), type_="foreignkey")
        batch_op.drop_constraint(op.f("fk_now_items_related_project_id_projects"), type_="foreignkey")
        batch_op.drop_column("related_leadership_id")
        batch_op.drop_column("related_build_lab_id")
        batch_op.drop_column("related_project_id")
        batch_op.drop_column("external_url")
        batch_op.drop_column("priority")
        batch_op.drop_column("active")
        batch_op.drop_column("item_status")
        batch_op.drop_column("category")
        batch_op.alter_column("label", existing_type=sa.String(length=80), nullable=False)

    with op.batch_alter_table("contact_messages") as batch_op:
        batch_op.drop_constraint(op.f("ck_contact_messages_status_valid"), type_="check")
        batch_op.create_check_constraint(
            op.f("ck_contact_messages_status_valid"),
            "status IN ('new', 'read', 'archived')",
        )
        batch_op.drop_column("replied_at")
        batch_op.drop_column("email_status")
        batch_op.drop_column("inquiry_type")

    with op.batch_alter_table("site_settings") as batch_op:
        batch_op.drop_column("website_url")
        batch_op.drop_column("phone")
        batch_op.drop_column("copyright_text")
        batch_op.drop_column("footer_text")
        batch_op.drop_column("accent")
        batch_op.drop_column("favicon")
        batch_op.drop_column("social_image")
        batch_op.drop_column("wordmark")
        batch_op.drop_column("site_description")
        batch_op.drop_column("site_name")

    op.drop_table("resumes")
    op.drop_table("site_profiles")
