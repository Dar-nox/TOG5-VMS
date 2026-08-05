#!/usr/bin/env python3
"""
Builds the subsetted IBM Plex web fonts in `public/fonts/`.

Why this exists rather than an npm font package:

The obvious route is `@fontsource/ibm-plex-*`, and it is wrong for this app.
Its `latin` subset declares a unicode-range that does not include U+20B1, the
peso sign — so the subsetting drops the glyph. Every amount in TOG 5 VMS is in
pesos, so every currency string would have rendered its symbol in a fallback
font while the digits came from Plex. The complete fonts upstream do contain
the glyph; only the subsetting removed it.

So we subset from the complete fonts ourselves and keep U+20B1.

The output is committed, so this only needs running to change weights or to
take a new upstream version. Requires `pip install "fonttools[woff]"`.
"""

import io
import shutil
import tarfile
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

# Pinned so a rebuild produces the same files.
PACKAGES = {
    "sans": "https://registry.npmjs.org/@ibm/plex-sans/-/plex-sans-1.1.0.tgz",
    "mono": "https://registry.npmjs.org/@ibm/plex-mono/-/plex-mono-2.5.0.tgz",
}

# Interface text needs three weights; measured values need two. Anything more
# is bytes on a phone for a distinction nobody would notice.
FACES = [
    ("sans", "IBMPlexSans-Regular", "IBMPlexSans", 400),
    ("sans", "IBMPlexSans-SemiBold", "IBMPlexSans", 600),
    ("sans", "IBMPlexSans-Bold", "IBMPlexSans", 700),
    ("mono", "IBMPlexMono-Regular", "IBMPlexMono", 400),
    ("mono", "IBMPlexMono-SemiBold", "IBMPlexMono", 600),
]

# Latin, as the common web subsets define it, plus U+20B1 — the whole reason
# this script exists. U+2191/2193 are the trend arrows; U+2212 is the real
# minus sign, which is not the hyphen.
UNICODES = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
    "U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+20B1,U+2122,U+2191,U+2193,"
    "U+2212,U+2215,U+FEFF,U+FFFD"
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"


def download(url: str) -> tarfile.TarFile:
    print(f"  fetching {url.rsplit('/', 1)[-1]}")
    with urllib.request.urlopen(url) as response:
        return tarfile.open(fileobj=io.BytesIO(response.read()), mode="r:gz")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    archives = {name: download(url) for name, url in PACKAGES.items()}

    for family, source_name, out_stem, weight in FACES:
        archive = archives[family]
        member = f"package/fonts/complete/woff2/{source_name}.woff2"
        extracted = archive.extractfile(member)

        if extracted is None:
            raise SystemExit(f"{member} missing from the {family} package")

        font = TTFont(io.BytesIO(extracted.read()))

        if 0x20B1 not in font.getBestCmap():
            raise SystemExit(f"{source_name} has no peso sign — check the upstream version")

        subsetter = subset.Subsetter(
            options=subset.Options(
                layout_features=["*"],  # keep tnum/kern; numbers must align
                notdef_outline=True,
                desubroutinize=True,
            )
        )
        subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
        subsetter.subset(font)

        font.flavor = "woff2"
        target = OUT / f"{out_stem}-{weight}.woff2"
        font.save(target)

        print(f"  {target.name}: {target.stat().st_size / 1024:.1f} KB")

    # OFL requires the licence travel with the fonts.
    licence = archives["sans"].extractfile("package/fonts/complete/woff2/license.txt")
    if licence is not None:
        with open(OUT / "LICENSE.txt", "wb") as handle:
            shutil.copyfileobj(licence, handle)

    print(f"\nWrote {len(FACES)} fonts to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
