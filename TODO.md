# avex way - 復旧メモ

## 状態

- 既知の復旧項目は対応済み
- `scripts/process-text.ts` を改善し、本文先頭のずれ・目次拾い・巻末拾いを軽減
- `scripts/replacements.tsv` と `content/meta.json` の既知誤りは修正済み
- 主要な本文混入(ページ番号、章見出し、年表断片、巻末混入)は手修正を含めて整理済み
- レイアウトは本文幅を拡張済み

## 確認コマンド

```bash
npm run build
```

```bash
npm run dev
```

## 補足

- OCR由来の細かい誤字は、元PDF自体の崩れがあるため将来的に追加で見つかる可能性はある
- 現時点では、最初に洗い出していた既知の残タスクは完了扱い
