import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [, , textPath, metaPath, outputDir] = process.argv;

if (!textPath || !metaPath || !outputDir) {
  console.error("Usage: npx tsx process-text.ts <text-file> <meta.json> <output-dir>");
  process.exit(1);
}

const raw = readFileSync(textPath, "utf-8");
const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as Record<string, string>;

const titles = Object.entries(meta)
  .filter(([id]) => /^\d{4}$/.test(id))
  .sort(([a], [b]) => a.localeCompare(b));

function normalizeForMatch(s: string): string {
  if (!s) return "";
  return s
    .replace(/\s+/g, "")
    .replace(/[、。！？「」『』（）【】\-\s"'\u201c\u201d\u2018\u2019:：.・…\u00b7]/g, "")
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

function buildNormalizedMap(text: string): { normalized: string; posMap: number[] } {
  const normalized: string[] = [];
  const posMap: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const nc = normalizeForMatch(c);
    for (const ch of nc) {
      normalized.push(ch);
      posMap.push(i);
    }
  }

  return { normalized: normalized.join(""), posMap };
}

const { normalized: normalizedText, posMap } = buildNormalizedMap(raw);

function findAllOccurrences(searchStr: string): number[] {
  const positions: number[] = [];
  let pos = 0;
  while (pos < normalizedText.length) {
    const idx = normalizedText.indexOf(searchStr, pos);
    if (idx === -1) break;
    positions.push(posMap[idx]);
    pos = idx + 1;
  }
  return positions;
}

function pickBodyOccurrence(positions: number[], _title: string): number {
  if (positions.length === 2) return positions[1];

  let bestIdx = positions.length - 1;
  let bestGap = 0;

  for (let i = 0; i < positions.length; i++) {
    const nextPos = i < positions.length - 1 ? positions[i + 1] : raw.length;
    const gap = nextPos - positions[i];
    if (gap > bestGap) {
      bestGap = gap;
      bestIdx = i;
    }
  }

  return positions[bestIdx];
}

interface ChapterPosition {
  id: string;
  title: string;
  charPos: number;
}

const chapterPositions: ChapterPosition[] = [];
let unmatchedCount = 0;

for (const [id, title] of titles) {
  const normalizedTitle = normalizeForMatch(title);
  if (normalizedTitle.length < 4) {
    console.warn(`  WARNING: Title too short for ${id}: ${title}`);
    unmatchedCount++;
    continue;
  }

  const searchStr = normalizedTitle.slice(0, Math.min(normalizedTitle.length, 20));
  const occurrences = findAllOccurrences(searchStr);

  if (occurrences.length === 0) {
    console.warn(`  WARNING: Could not find title for ${id}: ${title.slice(0, 30)}...`);
    unmatchedCount++;
    continue;
  }

  if (occurrences.length === 1) {
    chapterPositions.push({ id, title, charPos: occurrences[0] });
  } else {
    const bestPos = pickBodyOccurrence(occurrences, title);
    chapterPositions.push({ id, title, charPos: bestPos });
  }
}

if (unmatchedCount > 0) {
  console.warn(`  ${unmatchedCount} titles could not be matched.`);
}

chapterPositions.sort((a, b) => a.charPos - b.charPos);

for (let i = 0; i < chapterPositions.length; i++) {
  const gap = chapterPositions[i + 1]
    ? chapterPositions[i + 1].charPos - chapterPositions[i].charPos
    : raw.length - chapterPositions[i].charPos;
  if (gap < 10) {
    console.warn(
      `  WARNING: Very small gap (${gap} chars) for ${chapterPositions[i].id}: ${chapterPositions[i].title.slice(0, 20)}...`,
    );
  }
}

function stripLeadingPunctuation(s: string): string {
  return s.replace(/^[。、！？・\s\n]+/, "");
}

function formatBody(text: string): string {
  const cleaned = stripLeadingPunctuation(text);
  const lines = cleaned.split("\n");
  const joined: string[] = [];
  let current = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      if (current) {
        joined.push(current);
        current = "";
      }
    } else {
      current += trimmed;
    }
  }
  if (current) {
    joined.push(current);
  }

  const paragraphs: string[] = [];
  for (const block of joined) {
    const sentences = splitIntoParagraphs(block);
    paragraphs.push(...sentences);
  }

  return paragraphs.join("\n\n");
}

function splitIntoParagraphs(block: string): string[] {
  const results: string[] = [];
  let current = "";

  for (let i = 0; i < block.length; i++) {
    current += block[i];

    const isEndOfSentence = block[i] === "。" || block[i] === "」";
    const nextChar = block[i + 1];
    const isFollowedByNewContent =
      nextChar && nextChar !== "」" && nextChar !== "。" && nextChar !== "、";

    if (isEndOfSentence && isFollowedByNewContent && current.length > 40) {
      results.push(current);
      current = "";
    }
  }

  if (current) {
    results.push(current);
  }

  return results;
}

for (let i = 0; i < chapterPositions.length; i++) {
  const current = chapterPositions[i];
  const next = chapterPositions[i + 1];

  const startPos = current.charPos;
  const endPos = next ? next.charPos : raw.length;

  const rawSlice = raw.slice(startPos, endPos);

  const titleInText = rawSlice.indexOf(current.title);
  let bodyStart: number;
  if (titleInText >= 0) {
    bodyStart = titleInText + current.title.length;
  } else {
    const normalizedTitle = normalizeForMatch(current.title);
    let consumed = 0;
    let pos = 0;
    while (pos < rawSlice.length && consumed < normalizedTitle.length) {
      const nc = normalizeForMatch(rawSlice[pos]);
      if (nc.length > 0) consumed += nc.length;
      pos++;
    }
    bodyStart = pos;
  }

  const bodyRaw = rawSlice.slice(bodyStart).trim();
  const body = formatBody(bodyRaw);

  const mdx = body ? `# ${current.title}\n\n${body}\n` : `# ${current.title}\n`;
  writeFileSync(join(outputDir, `${current.id}.mdx`), mdx, "utf-8");
}

console.log(`  Generated ${chapterPositions.length} chapter files.`);
