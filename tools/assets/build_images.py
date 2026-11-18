"""Build the served image set from masters.

Masters live in ``frontend/assets/masters`` and are never served. This script
writes responsive JPEG/WebP variants into ``frontend/public/assets`` and a
machine-readable manifest into ``frontend/src/assets/generated``.

Run from the repository root:

    backend/.venv/Scripts/python.exe tools/assets/build_images.py

The script is deterministic: identical masters produce identical variants.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
MASTERS = FRONTEND / "assets" / "masters"
PUBLIC = FRONTEND / "public" / "assets"
GENERATED = FRONTEND / "src" / "assets" / "generated"

INK = (10, 11, 13)
PAPER = (233, 229, 220)
MUTED = (139, 138, 132)
ACCENT = (255, 78, 31)

FONTS = Path("C:/Windows/Fonts")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONTS / name
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


# id -> (master file, output folder, basename, widths, formats)
# ``crop`` is an optional (left, top, right, bottom) box applied before resizing.
SPECS: list[dict] = [
    {
        "id": "profile.portrait",
        "master": "phill-portrait-studio.jpg",
        "folder": "profile",
        "basename": "phill-portrait",
        "widths": [480, 800, 1200],
        "formats": ["jpg", "webp"],
        "quality": 82,
    },
    {
        "id": "profile.portrait.square",
        "master": "phill-portrait-studio.jpg",
        "folder": "profile",
        "basename": "phill-portrait-square",
        "widths": [240, 480, 800],
        "formats": ["jpg", "webp"],
        "quality": 82,
        "crop": (42, 40, 1002, 1000),
    },
    {
        "id": "profile.event",
        "master": "phill-event-conference.jpg",
        "folder": "profile",
        "basename": "phill-event-conference",
        "widths": [480, 800],
        "formats": ["jpg", "webp"],
        "quality": 80,
    },
    {
        "id": "leadership.stage",
        "master": "phill-speaker-event.jpg",
        "folder": "leadership",
        "basename": "phill-event-stage",
        "widths": [433, 800],
        "formats": ["jpg", "webp"],
        "quality": 80,
    },
    {
        "id": "projects.omnimarket.logo",
        "master": "omnimarket-logo.jpg",
        "folder": "projects/omnimarket",
        "basename": "omnimarket-logo",
        "widths": [480, 900],
        "formats": ["webp", "png"],
        "quality": 92,
    },
]

OG_SIZE = (1200, 630)


def save_variants(item: dict) -> dict:
    master = MASTERS / item["master"]
    if not master.exists():
        raise SystemExit(f"Missing master: {master}")

    source = Image.open(master).convert("RGB")
    if item.get("crop"):
        source = source.crop(item["crop"])
    out_dir = PUBLIC / item["folder"]
    out_dir.mkdir(parents=True, exist_ok=True)

    # Remove previously generated variants so renamed/resized runs do not leave orphans.
    for stale in out_dir.glob(f"{item['basename']}-*"):
        stale.unlink()

    variants: list[dict] = []
    seen_widths: set[int] = set()
    for width in item["widths"]:
        if width > source.width:
            width = source.width
        if width in seen_widths:
            continue
        seen_widths.add(width)
        height = round(source.height * width / source.width)
        resized = source.resize((width, height), Image.LANCZOS)
        entry: dict = {"w": width, "h": height, "src": {}, "bytes": {}}

        if "webp" in item["formats"]:
            webp = out_dir / f"{item['basename']}-{width}.webp"
            resized.save(webp, "WEBP", quality=item["quality"], method=6)
            entry["src"]["webp"] = f"/assets/{item['folder']}/{webp.name}"
            entry["bytes"]["webp"] = webp.stat().st_size

        if "jpg" in item["formats"]:
            jpg = out_dir / f"{item['basename']}-{width}.jpg"
            resized.save(jpg, "JPEG", quality=item["quality"], optimize=True, progressive=True)
            entry["src"]["jpg"] = f"/assets/{item['folder']}/{jpg.name}"
            entry["bytes"]["jpg"] = jpg.stat().st_size

        if "png" in item["formats"]:
            png = out_dir / f"{item['basename']}-{width}.png"
            resized.save(png, "PNG", optimize=True)
            entry["src"]["png"] = f"/assets/{item['folder']}/{png.name}"
            entry["bytes"]["png"] = png.stat().st_size

        variants.append(entry)

    dominant = source.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    variants.sort(key=lambda v: v["w"])

    return {
        "id": item["id"],
        "kind": "logo" if "logo" in item["id"] else "photo",
        "intrinsic": {"w": source.width, "h": source.height},
        "dominantColor": "#%02x%02x%02x" % dominant,
        "variants": variants,
    }


def build_og(portrait_manifest: dict) -> None:
    """Compose the social preview from the portrait and the site's typography."""

    canvas = Image.new("RGB", OG_SIZE, INK)
    draw = ImageDraw.Draw(canvas)

    portrait_path = PUBLIC / "profile" / "phill-portrait-800.jpg"
    portrait = Image.open(portrait_path).convert("RGB")

    # Right-hand editorial crop. Cover-fill the panel, then anchor to the face.
    panel_w, panel_h = 460, OG_SIZE[1]
    target_ratio = panel_w / panel_h
    src_ratio = portrait.width / portrait.height
    if src_ratio > target_ratio:
        new_w = round(portrait.height * target_ratio)
        portrait = portrait.crop(((portrait.width - new_w) // 2, 0, (portrait.width + new_w) // 2, portrait.height))
    else:
        new_h = round(portrait.width / target_ratio)
        top = max(0, round((portrait.height - new_h) * 0.18))
        portrait = portrait.crop((0, top, portrait.width, top + new_h))
    portrait = portrait.resize((panel_w, panel_h), Image.LANCZOS)
    canvas.paste(portrait, (OG_SIZE[0] - panel_w, 0))

    # Slight darkening so overlaid marks stay legible without flattening the face.
    scrim = Image.new("RGBA", (panel_w, panel_h), (10, 11, 13, 40))
    canvas.paste(Image.alpha_composite(portrait.convert("RGBA"), scrim).convert("RGB"), (OG_SIZE[0] - panel_w, 0))

    # Hairlines
    draw.line([(0, 88), (OG_SIZE[0], 88)], fill=(44, 46, 50), width=1)
    draw.line([(0, 556), (OG_SIZE[0], 556)], fill=(44, 46, 50), width=1)
    draw.line([(740, 0), (740, OG_SIZE[1])], fill=(44, 46, 50), width=1)

    # Wordmark
    draw.rectangle([64, 38, 100, 74], outline=(70, 70, 72), width=1)
    draw.text((71, 44), "P", font=font("consolab.ttf", 24), fill=PAPER)
    draw.rectangle([96, 70, 102, 76], fill=ACCENT)
    draw.text((116, 38), "PHILL", font=font("segoeuib.ttf", 26), fill=PAPER)
    draw.text((116, 68), "PHILEMON MELABAH", font=font("consola.ttf", 12), fill=MUTED)

    draw.text((58, 122), "PORTFOLIO  /  SELECTED WORK  /  OPEN TO COLLABORATION", font=font("consola.ttf", 14), fill=MUTED)

    draw.text((56, 186), "FULL-STACK", font=font("segoeuib.ttf", 108), fill=PAPER)
    draw.text((56, 300), "developer.", font=font("georgiai.ttf", 132), fill=ACCENT)
    draw.rectangle([640, 372, 654, 386], fill=ACCENT)

    draw.text((58, 456), "Software products. Data work. The systems that connect them.", font=font("segoeui.ttf", 22), fill=(196, 192, 183))

    draw.text((58, 586), "DATA & ANALYTICS   /   TECHNOLOGY BUILDING", font=font("consola.ttf", 13), fill=MUTED)
    draw.text((756, 586), "GHANA  /  2026", font=font("consola.ttf", 13), fill=MUTED)

    target = PUBLIC / "social" / "og-image.jpg"
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, "JPEG", quality=88, optimize=True, progressive=True)


def main() -> None:
    manifest: dict = {
        "generatedAt": datetime.now(UTC).isoformat(timespec="seconds"),
        "note": "Generated by tools/assets/build_images.py. Do not edit by hand.",
        "assets": {},
    }
    for spec in SPECS:
        manifest["assets"][spec["id"]] = save_variants(spec)

    build_og(manifest["assets"]["profile.portrait"])

    GENERATED.mkdir(parents=True, exist_ok=True)
    target = GENERATED / "manifest.json"
    target.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    total = sum(
        size
        for item in manifest["assets"].values()
        for variant in item["variants"]
        for size in variant["bytes"].values()
    )
    print(f"assets: {len(manifest['assets'])}")
    print(f"variants: {sum(len(i['variants']) for i in manifest['assets'].values())}")
    print(f"served bytes: {total / 1024:.0f} kB")
    print(f"manifest: {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
