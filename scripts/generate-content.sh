#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PDF_DIR="$PROJECT_DIR/pdf"
CONTENT_DIR="$PROJECT_DIR/content"
REPLACEMENTS="$SCRIPT_DIR/replacements.tsv"
EXTRACT="$HOME/.claude/skills/pdf-to-text/scripts/extract.sh"

PDF_ORDER=(
  01.pdf
  02.pdf
  03.pdf
  04.pdf
  05.pdf
  06.pdf
  07.pdf
  08.pdf
  09.pdf
  09-2.pdf
  10.pdf
  11-1.pdf
  11-2.pdf
  afterword.pdf
)

COMBINED="$PROJECT_DIR/.tmp-combined.txt"
trap 'rm -f "$COMBINED"' EXIT

echo "[1/5] Extracting text from PDFs..."
> "$COMBINED"
for pdf in "${PDF_ORDER[@]}"; do
  pdf_path="$PDF_DIR/$pdf"
  if [ ! -f "$pdf_path" ]; then
    echo "  SKIP: $pdf (not found)"
    continue
  fi
  echo "  $pdf"
  "$EXTRACT" "$pdf_path" pdfkit 2>/dev/null >> "$COMBINED"
  printf '\n' >> "$COMBINED"
done

echo "[2/5] Applying replacements..."
REPLACED="$PROJECT_DIR/.tmp-replaced.txt"
trap 'rm -f "$COMBINED" "$REPLACED"' EXIT
cp "$COMBINED" "$REPLACED"

while IFS=$'\t' read -r wrong correct; do
  [ -z "$wrong" ] && continue
  [[ "$wrong" =~ ^# ]] && continue
  escaped_wrong=$(printf '%s' "$wrong" | sed 's/[&/\]/\\&/g; s/\[/\\[/g; s/\]/\\]/g')
  escaped_correct=$(printf '%s' "$correct" | sed 's/[&/\]/\\&/g')
  sed -i '' "s/$escaped_wrong/$escaped_correct/g" "$REPLACED"
done < "$REPLACEMENTS"

echo "[3/5] Stripping page number artifacts..."
sed -i '' -E '/^[0-9$¥£=¾#■◎]{0,3}[0-9]{1,4}[%:)=-]{0,3}$/d' "$REPLACED"

echo "[4/5] Processing and splitting into chapters..."
npx tsx "$SCRIPT_DIR/process-text.ts" "$REPLACED" "$CONTENT_DIR/meta.json" "$CONTENT_DIR"

echo "[5/5] Done."
echo "Generated $(ls "$CONTENT_DIR"/*.mdx 2>/dev/null | wc -l | tr -d ' ') .mdx files in $CONTENT_DIR"
