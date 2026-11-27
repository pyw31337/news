#!/usr/bin/env python3
"""
media_processor_rule74.py
RULE #74 영구 표준 이미지·문서 처리 유틸리티
- 정방향 자동 회전 (EXIF Orientation 0°/90°/180°/270° 자동 보정)
- 고화질 WebP 압축 (긴 변 최대 2400px, 품질 85~86%)
- SHA-256 해시 기반 중복 원천 차단 (att/v1/blobs/<sha256>.<ext>)
- R2 및 D1 메타데이터 레지스트리 규격 준수
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageOps

MAX_LONG_EDGE = 2400
WEBP_QUALITY = 86

class MediaProcessorRule74:
    def __init__(self, r2_checkpoint_path: str | Path | None = None):
        self.checkpoint_path = Path(r2_checkpoint_path) if r2_checkpoint_path else None
        self.known_hashes = set()
        if self.checkpoint_path and self.checkpoint_path.exists():
            try:
                with open(self.checkpoint_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        self.known_hashes = set(data)
                    elif isinstance(data, dict):
                        self.known_hashes = set(data.keys())
            except Exception:
                pass

    def compute_sha256(self, data_bytes: bytes) -> str:
        return hashlib.sha256(data_bytes).hexdigest()

    def process_image(self, input_source: str | Path | bytes, output_dir: str | Path | None = None, source_url: str = "") -> dict:
        """
        Process any JPG/PNG/WebP image strictly following RULE #74.
        Returns metadata dictionary ready for Cloudflare R2 and D1 index.
        """
        if isinstance(input_source, (str, Path)):
            with open(input_source, "rb") as f:
                raw_bytes = f.read()
            original_filename = Path(input_source).name
        else:
            raw_bytes = input_source
            original_filename = "stream_image"

        # 1. EXIF 정방향 자동 회전
        img = Image.open(io.BytesIO(raw_bytes))
        img = ImageOps.exif_transpose(img)

        # RGBA / Palette 처리
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        # 2. 리사이즈 (긴 변 2400px 제한, 가로세로비 유지)
        w, h = img.size
        long_edge = max(w, h)
        if long_edge > MAX_LONG_EDGE:
            scale = MAX_LONG_EDGE / float(long_edge)
            new_w = max(1, int(round(w * scale)))
            new_h = max(1, int(round(h * scale)))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            w, h = new_w, new_h

        # 3. 고화질 WebP 압축 (품질 85~86%)
        out_buf = io.BytesIO()
        img.save(out_buf, format="WEBP", quality=WEBP_QUALITY, method=6)
        webp_bytes = out_buf.getvalue()

        # 4. SHA-256 해시 및 Blob Key 산출
        sha256_hash = self.compute_sha256(webp_bytes)
        blob_key = f"att/v1/blobs/{sha256_hash}.webp"
        is_duplicate = sha256_hash in self.known_hashes

        out_path = None
        if output_dir:
            out_dir = Path(output_dir)
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"{sha256_hash}.webp"
            if not out_path.exists() or not is_duplicate:
                with open(out_path, "wb") as f:
                    f.write(webp_bytes)

        if self.checkpoint_path and not is_duplicate:
            self.known_hashes.add(sha256_hash)

        return {
            "status": "SUCCESS",
            "blob_key": blob_key,
            "sha256": sha256_hash,
            "mime_type": "image/webp",
            "width": w,
            "height": h,
            "size_bytes": len(webp_bytes),
            "original_size_bytes": len(raw_bytes),
            "compression_ratio": round(len(webp_bytes) / max(1, len(raw_bytes)), 3),
            "is_duplicate_prevented": is_duplicate,
            "local_path": str(out_path) if out_path else None,
            "source_url": source_url,
            "credit_line": f"ⓘ 출처: {source_url}" if source_url else ""
        }

    def process_document(self, input_source: str | Path | bytes, output_dir: str | Path | None = None, source_url: str = "") -> dict:
        """
        Process PDF document (RULE #74: keep PDF original intact, compute SHA256 blob).
        """
        if isinstance(input_source, (str, Path)):
            with open(input_source, "rb") as f:
                raw_bytes = f.read()
        else:
            raw_bytes = input_source

        sha256_hash = self.compute_sha256(raw_bytes)
        blob_key = f"att/v1/blobs/{sha256_hash}.pdf"
        is_duplicate = sha256_hash in self.known_hashes

        out_path = None
        if output_dir:
            out_dir = Path(output_dir)
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"{sha256_hash}.pdf"
            if not out_path.exists():
                with open(out_path, "wb") as f:
                    f.write(raw_bytes)

        return {
            "status": "SUCCESS",
            "blob_key": blob_key,
            "sha256": sha256_hash,
            "mime_type": "application/pdf",
            "size_bytes": len(raw_bytes),
            "is_duplicate_prevented": is_duplicate,
            "local_path": str(out_path) if out_path else None,
            "source_url": source_url,
            "credit_line": f"ⓘ 출처: {source_url}" if source_url else ""
        }

if __name__ == "__main__":
    print("Testing MediaProcessorRule74...")
    processor = MediaProcessorRule74()
    # Test synthetic image
    test_img = Image.new("RGB", (800, 600), color=(36, 80, 224))
    buf = io.BytesIO()
    test_img.save(buf, format="PNG")
    res = processor.process_image(buf.getvalue(), source_url="https://example.com/test.png")
    print("Processed result:", json.dumps(res, indent=2, ensure_ascii=False))
