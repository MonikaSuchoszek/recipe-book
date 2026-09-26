"""Shrink recipe photos before they are committed.

Caps the longest side at 2000 px, applies the EXIF rotation, re-encodes JPEGs at
quality 85 and removes all metadata (including GPS location from phone photos).
Files that are already small enough and carry no metadata are left alone, so the
script is safe to run repeatedly.

Usage: python3 scripts/shrink_photos.py src/assets/images/recipes
"""
from pathlib import Path
import sys

from PIL import Image, ImageOps

MAX_SIDE = 2000
JPEG_QUALITY = 85
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def needs_work(image):
    has_metadata = bool(image.getexif()) or any(key in image.info for key in ("exif", "xmp", "XML:com.adobe.xmp"))
    return max(image.size) > MAX_SIDE or has_metadata


def shrink(path):
    with Image.open(path) as original:
        if not needs_work(original):
            return None
        before = path.stat().st_size
        image = ImageOps.exif_transpose(original)  # rotate pixels, since the EXIF tag is dropped
        image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
        icc_profile = original.info.get("icc_profile")
        fmt = original.format

    # Saving without exif= and xmp= drops all metadata; the colour profile is kept
    options = {"icc_profile": icc_profile} if icc_profile else {}
    if fmt == "JPEG":
        image.convert("RGB").save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True, **options)
    elif fmt == "PNG":
        image.save(path, "PNG", optimize=True, **options)
    else:
        image.save(path, fmt, quality=JPEG_QUALITY, **options)
    return before, path.stat().st_size


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "src/assets/images/recipes")
    if not root.exists():
        print(f"No photo folder at {root}, nothing to do.")
        return
    photos = sorted(p for p in root.rglob("*") if p.suffix.lower() in EXTENSIONS)
    changed = 0
    for path in photos:
        result = shrink(path)
        if result:
            changed += 1
            before, after = result
            print(f"  shrunk {path.relative_to(root)}: {before // 1024} KB -> {after // 1024} KB")
    print(f"{len(photos)} photos checked, {changed} shrunk, {len(photos) - changed} already fine.")


if __name__ == "__main__":
    main()
