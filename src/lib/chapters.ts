import meta from "../../content/meta.json";

type ChapterMeta = Record<string, string>;

const chapterMeta = meta as ChapterMeta;

export type Chapter = {
  id: string;
  title: string;
};

export const siteTitle = chapterMeta.index ?? "avex way";

export const chapters: Chapter[] = Object.entries(chapterMeta)
  .filter(([id]) => /^\d{4}$/.test(id))
  .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
  .map(([id, title]) => ({ id, title }));

const contentModules = import.meta.glob<string>("../../content/*.mdx", {
  import: "default",
  query: "?raw",
});

export function stripLeadingHeading(markdown: string): string {
  return markdown.replace(/^#\s+.+\n+/, "").trim();
}

export function formatChapterNumber(id: string): string {
  return String(Number(id));
}

export async function loadContent(name: string): Promise<string> {
  const loader = contentModules[`../../content/${name}.mdx`];

  if (!loader) {
    throw new Error(`Missing content: ${name}`);
  }

  return loader();
}
