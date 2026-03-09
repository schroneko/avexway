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
    .replace(/[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ]/g, (c) => {
      const smallKanaMap: Record<string, string> = {
        ぁ: "あ",
        ぃ: "い",
        ぅ: "う",
        ぇ: "え",
        ぉ: "お",
        っ: "つ",
        ゃ: "や",
        ゅ: "ゆ",
        ょ: "よ",
        ゎ: "わ",
        ァ: "ア",
        ィ: "イ",
        ゥ: "ウ",
        ェ: "エ",
        ォ: "オ",
        ッ: "ツ",
        ャ: "ヤ",
        ュ: "ユ",
        ョ: "ヨ",
        ヮ: "ワ",
      };
      return smallKanaMap[c] ?? c;
    })
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

function consumeTitle(rawSlice: string, title: string): number {
  const titleInText = rawSlice.indexOf(title);
  if (titleInText >= 0) {
    return titleInText + title.length;
  }

  const normalizedTitle = normalizeForMatch(title);
  let consumed = 0;
  let pos = 0;
  while (pos < rawSlice.length && consumed < normalizedTitle.length) {
    const nc = normalizeForMatch(rawSlice[pos]);
    if (nc.length > 0) consumed += nc.length;
    pos++;
  }
  return pos;
}

function scoreOccurrence(position: number, title: string): number {
  const rawSlice = raw.slice(position, Math.min(position + 400, raw.length));
  const bodyStart = consumeTitle(rawSlice, title);
  const prefix = rawSlice.slice(0, 220).trimStart();
  const condensedPrefix = prefix.replace(/\s+/g, " ");
  const firstSentence =
    condensedPrefix.match(/^[^。!?」\n]{0,24}[。!?」]?/u)?.[0].trim() ?? condensedPrefix;
  const before = raw.slice(Math.max(0, position - 8), position);
  const afterTitle = rawSlice.slice(bodyStart, Math.min(bodyStart + 64, rawSlice.length)).trimStart();

  let score = 0;

  if (position < 1000) score += 120;
  if (position > raw.length - 12000) score += 90;

  if (!/\n\s*$/u.test(before)) {
    score += 35;
  }

  if (!/[\n\r\s「『（]$/u.test(before)) {
    score += 90;
  }

  if (/^.{0,140}[。!?」]\s*\d{1,3}\b/u.test(condensedPrefix)) {
    score += 120;
  }

  if (/^(?:\d{1,3}\b|Chapter-\d|CONTENTS|avex way\b)/i.test(condensedPrefix)) {
    score += 120;
  }

  if (/(?:Chapter-\d|CONTENTS|avex wayの制作を終えて)/.test(condensedPrefix.slice(0, 120))) {
    score += 120;
  }

  if (/\bPhoto by\b/.test(condensedPrefix) || /\d{4}年\d{1,2}月\d{1,2}日/.test(condensedPrefix)) {
    score += 40;
  }

  if (/^(?:から|ので|たが|でも|と|て|を|に|へ)[、。！？]/u.test(afterTitle)) {
    score += 80;
  }

  if (/^[ぁ-んァ-ヶー]{1,3}(?=[0-9A-Za-z一-龯])/u.test(condensedPrefix)) {
    score += 35;
  }

  if (/^[ぁ-んァ-ヶー]/u.test(firstSentence) && firstSentence.length <= 18) {
    score += 25;
  }

  return score;
}

function pickBodyOccurrence(positions: number[], title: string): number {
  let bestPos = positions[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const position of positions) {
    const score = scoreOccurrence(position, title);
    if (score < bestScore || (score === bestScore && position < bestPos)) {
      bestScore = score;
      bestPos = position;
    }
  }

  return bestPos;
}

interface ChapterPosition {
  id: string;
  title: string;
  charPos: number;
}

const chapterSpecificCleanups: Record<string, Array<[RegExp, string]>> = {
  "0069": [
    [
      /『これ、曲が短いなあ。Dメロ（大サビ）がほしい』と言われて、『エッー！曲、出来ちゃっ『Dear My Friend』は、/g,
      "『これ、曲が短いなあ。Dメロ（大サビ）がほしい』と言われて、『エッー！曲、出来ちゃってるのに』ってことになって…・・。なので、3枚目のシングルの『Dear My Friend』は、",
    ],
    [/ながら邦楽の\s*曲をつくっていたという。/g, "ながら邦楽の曲をつくっていたという。"],
    [/ながら邦楽の\s*\n+\s*曲をつくっていたという。/g, "ながら邦楽の曲をつくっていたという。"],
  ],
  "0070": [
    [
      /当時の松浦専務に「エイベックスがこんなに大きくなりまし\s*たが、いつの時代がいちばん楽しかったですか？」/g,
      "当時の松浦専務に「エイベックスがこんなに大きくなりましたが、いつの時代がいちばん楽しかったですか？」",
    ],
    [
      /松浦の視界に管理強化の暗雲がたれ込めていった。その当時を、いま松浦があらためて振り返る。\s*って言っていた。/g,
      "しかし、エイベックスの株式公開が具体化するにつれて、松浦の視界に管理強化の暗雲がたれ込めていった。その当時を、いま松浦があらためて振り返る。「ELTがデビューした年は、『絶対にELTを売ってみせる』って言っていた。",
    ],
    [
      /松浦の視界に管理強化の暗雲がたれ込めていった。その当時を、いま松浦があらためて振り返る。って言っていた。/g,
      "しかし、エイベックスの株式公開が具体化するにつれて、松浦の視界に管理強化の暗雲がたれ込めていった。その当時を、いま松浦があらためて振り返る。「ELTがデビューした年は、『絶対にELTを売ってみせる』って言っていた。",
    ],
    [/きて。その抑圧が/g, "それはイコール『株式公開だから』っていうことになってきて。その抑圧が"],
    [/我慢しようと思ったたから。/g, "我慢しようと思ったんです。株式の店頭公開、その先の上場には興味がありましたから。"],
  ],
  "0084": [
    [
      /衝撃的でしたね」\s*ていた。「あゆはあーっ」/g,
      "衝撃的でしたね」\n\n1998年4月に、ファーストシングル『poker face』で浜崎あゆみはデビューした。\n\n初め、女の子から反発が起きていた。「あゆはあーっ」",
    ],
    [/嫌われるのは嫉妬があるからで、認められ\s*ちゃう/g, "嫌われるのは嫉妬があるからで、認められちゃう"],
    [
      /12月には『Depend on you』と、松浦はたたみかけるように\s*20位、20位、8位、/g,
      "12月には『Depend on you』と、松浦はたたみかけるように浜崎あゆみのシングルをリリースした。\n\nオリコンの順位は、20位、20位、8位、",
    ],
    [
      /松浦の販売促進戦略は次第に狂気を帯びていった。なんで大事な大事な、浜崎のこの仕事で、おまえがミスるんだよ！俺は悲しいよ！1998年12月24日から25日にかけて、JR渋谷駅前・ハチ公広場に面した交差点のビルの壁面に並ぶビジョンに、浜崎流れるというイベントが仕掛けられていた。-230/g,
      "松浦の販売促進戦略は次第に狂気を帯びていった。1998年12月24日から25日にかけて、JR渋谷駅前・ハチ公広場に面した交差点のビルの壁面に並ぶビジョンに、浜崎あゆみのファーストアルバムのプロモーション映像が一斉に流れるというイベントが仕掛けられていた。",
    ],
    [
      /松浦の販売促進戦略は次第に狂気を帯びていった。なんで大事な大事な、浜崎のこの仕事で、おまえがミスるんだよ！俺は悲しいよ！1998年12月24日から25日にかけて、JR渋谷駅前・ハチ公広場に面した交差点のビルの壁面に並ぶビジョンに、浜崎流れるというイベントが仕掛けられていた。\s*-230/g,
      "松浦の販売促進戦略は次第に狂気を帯びていった。1998年12月24日から25日にかけて、JR渋谷駅前・ハチ公広場に面した交差点のビルの壁面に並ぶビジョンに、浜崎あゆみのファーストアルバムのプロモーション映像が一斉に流れるというイベントが仕掛けられていた。",
    ],
  ],
  "0114": [
    [
      /そこで優勝する子はいきなり国民ちゃんらしさ”が薄れてきて、ちょっと残念な気もするけどなぁ…・（笑）。/g,
      "そこで優勝する子はいきなり国民的大スターになっちゃう。そういう子たちの楽曲制作とか、プロデュースを熱望されているんですね。",
    ],
    [
      /（談）■東京都知事・作家\s*的大スターになっちゃう。そういう子たちの楽曲制作とか、プロデュースを熱望されているんですね。/g,
      "（談）■東京都知事・作家",
    ],
  ],
};

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
  return s.replace(/^[」』、。！？・\s\n]+/, "");
}

function stripLeadingArtifacts(text: string): string {
  let cleaned = text.trimStart();

  for (let i = 0; i < 4; i++) {
    const before = cleaned;

    cleaned = cleaned
      .replace(/^(?:CONTENTS\s*)?(?:chanter\s*\d+\s*will be your story\s*)?/i, "")
      .replace(/^(?:avex way\s*\d{4}-\d{4}\s*)+/i, "")
      .replace(/^Chapter-\d+[^\n]*\n?/u, "")
      .replace(/^\d{1,3}(?=\D)/u, "")
      .replace(/^[。、！？・\s\n]+/u, "")
      .replace(/^[ぁ-んァ-ヶー]{1,3}(?=[0-9A-Za-z一-龯])/u, "")
      .trimStart();

    const fragment = cleaned.match(/^([ぁ-んァ-ヶー][^。!?」』\n]{0,32}[。!?」』])/u)?.[1];
    if (fragment) {
      cleaned = cleaned.slice(fragment.length).trimStart();
      cleaned = stripLeadingPunctuation(cleaned);
    }

    const connectorFragment = cleaned.match(
      /^(?:と|から|ので|たが|でも|そして|だから)[^。!?」』\n]{0,48}[。!?」』]/u,
    )?.[0];
    if (connectorFragment) {
      cleaned = cleaned.slice(connectorFragment.length).trimStart();
      cleaned = stripLeadingPunctuation(cleaned);
    }

    const quotedFragment = cleaned.match(/^(?:」|』)[^。!?」』\n]{0,64}[。!?」』]/u)?.[0];
    if (quotedFragment) {
      cleaned = cleaned.slice(quotedFragment.length).trimStart();
      cleaned = stripLeadingPunctuation(cleaned);
    }

    if (cleaned === before) break;
  }

  return cleaned;
}

function stripStructuralArtifacts(text: string): string {
  return text
    .replace(/(?:^|\n)\s*(?:CONTENTS(?:\s+chanter\s*\d+\s*will be your story)?|avex way(?:\s*\d{4}-\d{4})?)\s*(?=\n|$)/gi, "\n")
    .replace(/(?:^|\n)\s*Chapter-\d+[^\n]*(?=\n|$)/g, "\n")
    .replace(/(?:^|\n)\s*\d{4}\/\d{2}[^\n]*(?=\n|$)/g, "\n")
    .replace(/(?:^|\n)\s*\d{1,3}\s*(?=\n|$)/g, "\n");
}

function stripInlineArtifacts(text: string): string {
  return text
    .replace(/・デビュー/g, "")
    .replace(/\d{4}年\d{1,2}月(?=[^。\n]*(?:\d{4}年\d{1,2}月|＜))[^。\n]*/g, "")
    .replace(
      /\d{4}年\d{1,2}月[^。\n]{0,240}(?:設立|移転|完成|増資|開催|開始|公開|オープン|社名変更|本社機能|現地法人|資本金|新社屋|スタジオ)[^。\n]*/g,
      "",
    )
    .replace(
      /\d{4}\/\d{2}(?:\/\d{2})?[^。\n]{0,240}(?:シングル|アルバム|DVD|デビュー|受賞|ツアー|ライヴ|ライブ|ベスト)[^。\n]*/g,
      "",
    )
    .replace(/『[^』」]{1,100}[』」]\s*[^。\n]{0,120}?(?:シングル|アルバム|DVD|デビュー|受賞)/g, "")
    .replace(/＜[^＞]{1,100}＞\s*[^。\n]{0,120}?(?:設立|移転|完成|増資|開催|開始|公開|オープン)/g, "");
}

function isArtifactLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (/^受賞$/u.test(trimmed)) return true;
  if (/^・.*(?:シングル|アルバム|DVD|デビュー|受賞)/u.test(trimmed)) return true;
  if (/^『[^』」\n]{1,120}$/u.test(trimmed)) return true;
  if (/^(?:\d{4}年\d{1,2}月|\d{4}\/\d{2}(?:\/\d{2})?)$/u.test(trimmed)) return true;
  if (/^＜[^＞]{1,120}＞$/u.test(trimmed)) return true;

  if (
    /^(?:『[^』」]+[』」]|＜[^＞]+＞|[A-Za-z0-9'".&!?:\- ]+)\s*[^。]*?(?:シングル|アルバム|DVD|デビュー|受賞)\s*$/u.test(
      trimmed,
    )
  ) {
    return true;
  }

  if (
    /^(?:\d{4}年\d{1,2}月|\d{4}\/\d{2}(?:\/\d{2})?)/u.test(trimmed) &&
    /(?:設立|移転|完成|増資|開催|開始|公開|オープン|社名変更|現地法人|資本金|シングル|アルバム|DVD|デビュー|受賞|ツアー|ライヴ|ライブ|ベスト)/u.test(
      trimmed,
    )
  ) {
    return true;
  }

  if (/^＜[^＞]{1,120}＞/u.test(trimmed)) {
    return true;
  }

  if (
    trimmed.length <= 80 &&
    !/[。！？]$/u.test(trimmed) &&
    /(?:シングル|アルバム|DVD|デビュー|受賞|設立|移転|完成|増資|開催|開始|公開|オープン|社名変更|現地法人|資本金|ツアー|ライヴ|ライブ|ベスト)/u.test(
      trimmed,
    )
  ) {
    return true;
  }

  return false;
}

function formatBody(text: string): string {
  const cleaned = stripInlineArtifacts(
    stripStructuralArtifacts(stripLeadingPunctuation(stripLeadingArtifacts(text))),
  );
  const lines = cleaned.split("\n");
  const joined: string[] = [];
  let current = "";

  for (const line of lines) {
    const trimmed = line.trim().replace(/^・+/u, "");
    if (trimmed === "") {
      if (current) {
        joined.push(current);
        current = "";
      }
      continue;
    }

    if (isArtifactLine(trimmed)) {
      continue;
    }

    current += trimmed;
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

function applyChapterSpecificCleanups(id: string, text: string): string {
  const rules = chapterSpecificCleanups[id];
  if (!rules) {
    return text;
  }

  return rules.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
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
  const bodyStart = consumeTitle(rawSlice, current.title);

  const bodyRaw = rawSlice.slice(bodyStart).trim();
  const body = applyChapterSpecificCleanups(current.id, formatBody(bodyRaw));

  const mdx = body ? `# ${current.title}\n\n${body}\n` : `# ${current.title}\n`;
  writeFileSync(join(outputDir, `${current.id}.mdx`), mdx, "utf-8");
}

console.log(`  Generated ${chapterPositions.length} chapter files.`);
