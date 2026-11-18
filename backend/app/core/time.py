"""Timezone helpers.

SQLite returns naive datetimes even for timezone-aware columns. Values are
stored in UTC, so normalize before comparing in Python.
"""

from datetime import UTC, datetime


def now_utc() -> datetime:
    return datetime.now(UTC)


def as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def is_past(value: datetime | None, reference: datetime | None = None) -> bool:
    normalized = as_utc(value)
    if normalized is None:
        return False
    return normalized <= (reference or now_utc())


def seconds_between(start: datetime | None, end: datetime | None) -> float:
    a = as_utc(start)
    b = as_utc(end)
    if a is None or b is None:
        return 0.0
    return (b - a).total_seconds()
