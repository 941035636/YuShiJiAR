"""Prepare bounded raw RGBA input for native target training and offline tests.

Requires Pillow. No camera pictures are read or uploaded.
"""
import argparse
import json
import tempfile
from pathlib import Path
from PIL import Image, ImageOps

parser = argparse.ArgumentParser()
parser.add_argument("--image", type=Path, default=Path(__file__).resolve().parent.parent / "recovery-assets/cards/tssgd.jpg")
parser.add_argument("--output-prefix", type=Path, default=Path(tempfile.gettempdir()) / "ysj-native-target")
args = parser.parse_args()
image = ImageOps.exif_transpose(Image.open(args.image)).convert("RGBA")
image.thumbnail((640, 640))
args.output_prefix.parent.mkdir(parents=True, exist_ok=True)
args.output_prefix.with_suffix(".rgba").write_bytes(image.tobytes())
args.output_prefix.with_suffix(".json").write_text(json.dumps({"width": image.width, "height": image.height}), encoding="utf-8")
print(args.output_prefix)
