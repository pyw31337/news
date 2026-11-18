#!/usr/bin/env python3
"""Extract searchable text and metadata from collected insurance documents."""
import hashlib, html, json, os, re, shutil, subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "insu"
RAW = DATA / "raw_documents"
OUT_TEXT = DATA / "document_text"
OUT = DATA / "document_index.json"

def visible_html(blob):
    s = blob.decode("utf-8", "ignore")
    s = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()

def pdf_text(path):
    if shutil.which("pdftotext"):
        p = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, timeout=45)
        return p.stdout.decode("utf-8", "ignore")
    try:
        from pypdf import PdfReader
        return "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)
    except Exception:
        return ""

def ocr_text(path):
    if os.environ.get("INSU_ENABLE_OCR", "1") != "1" or not (shutil.which("pdftoppm") and shutil.which("tesseract")):
        return ""
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        prefix = str(Path(td) / "page")
        subprocess.run(["pdftoppm", "-r", "180", "-f", "1", "-l", "20", "-png", str(path), prefix], capture_output=True, timeout=90)
        chunks = []
        for image in sorted(Path(td).glob("page-*.png")):
            p = subprocess.run(["tesseract", str(image), "stdout", "-l", "kor+eng"], capture_output=True, timeout=60)
            chunks.append(p.stdout.decode("utf-8", "ignore"))
        return "\n".join(chunks)

def classify(text):
    kinds = []
    for label, terms in {"policy_terms": ["약관", "보통약관", "특별약관"], "product_summary": ["상품요약서", "상품설명서"], "business_method": ["사업방법서"], "sale_disclosure": ["판매기간", "판매중지", "상품공시"]}.items():
        if any(t in text for t in terms): kinds.append(label)
    dates = sorted(set(re.findall(r"(?:19|20)\d{2}[./-]\d{1,2}(?:[./-]\d{1,2})?", text)))
    return kinds or ["unclassified"], dates[:40]

def run():
    OUT_TEXT.mkdir(parents=True, exist_ok=True)
    rows = []
    for path in sorted(RAW.glob("*.bin")):
        blob = path.read_bytes(); sha = hashlib.sha256(blob).hexdigest(); is_pdf = blob[:5] == b"%PDF-"
        if is_pdf:
            text = pdf_text(path); method = "pdf_text" if len(text.strip()) >= 80 else "ocr"
            if len(text.strip()) < 80: text = ocr_text(path)
        else:
            text = visible_html(blob) if b"<html" in blob[:4096].lower() or b"<!doctype" in blob[:4096].lower() else ""
            method = "html_text" if text else "binary_metadata_only"
        kinds, dates = classify(text); text_path = OUT_TEXT / f"{sha}.txt"
        if text: text_path.write_text(text[:2_000_000], encoding="utf-8")
        rows.append({"sha256": sha, "raw_path": str(path.relative_to(DATA)), "text_path": str(text_path.relative_to(DATA)) if text else None, "format": "pdf" if is_pdf else "html_or_binary", "extractor": method, "text_chars": len(text), "ocr_used": method == "ocr" and bool(text), "document_kinds": kinds, "date_candidates": dates, "indexed_at": datetime.now(timezone.utc).isoformat()})
    payload = {"schema": 1, "updated_at": datetime.now(timezone.utc).isoformat(), "documents": rows, "counts": {"raw_documents": len(rows), "text_extracted": sum(1 for r in rows if r["text_chars"]), "pdfs": sum(1 for r in rows if r["format"] == "pdf"), "ocr_documents": sum(1 for r in rows if r["ocr_used"]), "classified": sum(1 for r in rows if r["document_kinds"] != ["unclassified"])}}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload["counts"], ensure_ascii=False))

if __name__ == "__main__": run()
