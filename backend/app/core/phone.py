"""Ghana phone number normalization.

The canonical stored and delivery format is ``233`` followed by nine digits,
for example ``0599811870`` -> ``233599811870``.
"""

from __future__ import annotations

import re

_GH_PREFIXES = {
    "020",
    "023",
    "024",
    "025",
    "026",
    "027",
    "028",
    "029",
    "050",
    "053",
    "054",
    "055",
    "056",
    "057",
    "058",
    "059",
}


class PhoneNumberError(ValueError):
    pass


def _digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def normalize_ghana_phone(value: str | None) -> str:
    """Return the canonical ``233XXXXXXXXX`` form or raise PhoneNumberError."""

    if not value:
        raise PhoneNumberError("Enter your phone number.")

    raw = value.strip()
    if raw.startswith("00"):
        raw = f"+{raw[2:]}"

    digits = _digits(raw)

    if digits.startswith("233") and len(digits) == 12:
        local = f"0{digits[3:]}"
    elif digits.startswith("0") and len(digits) == 10:
        local = digits
    elif len(digits) == 9 and digits[0] in {"2", "5"}:
        local = f"0{digits}"
    else:
        raise PhoneNumberError("Enter a valid Ghana mobile number.")

    if local[:3] not in _GH_PREFIXES:
        raise PhoneNumberError("Enter a valid Ghana mobile number.")

    if len(set(local[3:])) == 1:
        raise PhoneNumberError("Enter a valid Ghana mobile number.")

    return f"233{local[1:]}"


def is_valid_ghana_phone(value: str | None) -> bool:
    try:
        normalize_ghana_phone(value)
    except PhoneNumberError:
        return False
    return True


def mask_phone(value: str | None) -> str:
    """Safe representation for logs and API hints, e.g. ``233*****870``."""

    if not value:
        return ""
    digits = _digits(value)
    if len(digits) < 6:
        return "*" * len(digits)
    return f"{digits[:3]}{'*' * (len(digits) - 6)}{digits[-3:]}"
