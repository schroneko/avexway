import meta from '../../content/meta.json';

type ChapterMeta = Record<string, string>;

const chapterMeta = meta as ChapterMeta;

export type Chapter = {
  id: string;
  title: string;
};

export const siteTitle = chapterMeta.index ?? 'avex way';

export const chapters: Chapter[] = Object.entries(chapterMeta)
  .filter(([id]) => /^\d{4}$/.test(id))
  .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
  .map(([id, title]) => ({ id, title }));

const chapterContentModules = import.meta.glob<string>('../../content/[0-9][0-9][0-9][0-9].mdx', {
  import: 'default',
  query: '?raw',
});

const introContentModules = import.meta.glob<string>('../../content/index.mdx', {
  import: 'default',
  query: '?raw',
});

export function stripLeadingHeading(markdown: string): string {
  return markdown.replace(/^#\s+.+\n+/, '').trim();
}

export async function loadIntroContent(): Promise<string> {
  const loader = introContentModules['../../content/index.mdx'];

  if (!loader) {
    throw new Error('Missing intro content');
  }

  return loader();
}

export async function loadChapterContent(id: string): Promise<string> {
  const loader = chapterContentModules[`../../content/${id}.mdx`];

  if (!loader) {
    throw new Error(`Missing chapter content: ${id}`);
  }

  return loader();
}
