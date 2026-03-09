import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router-dom';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { chapters, loadChapterContent, siteTitle, stripLeadingHeading } from '../lib/chapters';

function formatChapterNumber(id: string) {
  return String(Number(id));
}

export function ChapterPage() {
  const { id } = useParams();
  const chapterIndex = chapters.findIndex((chapter) => chapter.id === id);
  const chapter = chapterIndex >= 0 ? chapters[chapterIndex] : null;
  const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;
  const previousPath = chapterIndex === 0 ? "/" : previousChapter ? `/${previousChapter.id}` : null;
  const previousIndicator = chapterIndex === 0 ? "0" : previousChapter?.id ?? null;
  const { indicator } = useKeyboardNav({
    nextPath: nextChapter ? `/${nextChapter.id}` : null,
    previousPath,
    nextIndicator: nextChapter?.id ?? null,
    previousIndicator,
  });

  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(chapter));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chapter) {
      document.title = `存在しない章 | ${siteTitle}`;
      return;
    }

    document.title = `${chapter.title} | ${siteTitle}`;
    window.scrollTo({ top: 0, behavior: 'auto' });
    setContent('');
    setIsLoading(true);
    setError(null);

    let active = true;

    void loadChapterContent(chapter.id)
      .then((markdown) => {
        if (!active) {
          return;
        }

        setContent(stripLeadingHeading(markdown));
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setError('この章を開けませんでした');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [chapter]);

  if (!chapter) {
    return (
      <main className="page page-chapter">
        <p className="status-message">存在しない章です</p>
        <Link className="back-link" to="/">
          目次へ戻る
        </Link>
      </main>
    );
  }

  return (
    <main className="page page-chapter">
      <header className="page-header chapter-header">
        <Link className="back-link" to="/">
          <svg aria-hidden="true" className="back-link-icon" fill="none" viewBox="0 0 12 12">
            <path
              d="M10 6H2M5 3L2 6l3 3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
          <span>目次</span>
        </Link>
        <p className="chapter-label">第{formatChapterNumber(chapter.id)}章</p>
        <h1 className="page-title">{chapter.title}</h1>
      </header>

      {error ? <p className="status-message">{error}</p> : null}
      {!isLoading && !error ? (
        <article className="prose" key={chapter.id}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      ) : null}

      {previousPath ? (
        <Link
          aria-label={chapterIndex === 0 ? "第0章へ戻る" : `前の章へ: ${previousChapter?.title}`}
          className="edge-nav-hint edge-nav-hint-left"
          to={previousPath}
        >
          ←
        </Link>
      ) : null}
      {nextChapter ? (
        <Link
          aria-label={`次の章へ: ${nextChapter.title}`}
          className="edge-nav-hint edge-nav-hint-right"
          to={`/${nextChapter.id}`}
        >
          →
        </Link>
      ) : null}

      {previousPath || nextChapter ? (
        <>
          <nav aria-label="章送り" className="chapter-nav">
            {previousPath ? (
              <Link className="chapter-nav-link" to={previousPath}>
                <span className="chapter-nav-meta">{chapterIndex === 0 ? "← 第0章" : "← 前の章"}</span>
                <span className="chapter-nav-title">{chapterIndex === 0 ? siteTitle : previousChapter?.title}</span>
              </Link>
            ) : null}
            {nextChapter ? (
              <Link className="chapter-nav-link chapter-nav-link-next" to={`/${nextChapter.id}`}>
                <span className="chapter-nav-meta">次の章 →</span>
                <span className="chapter-nav-title">{nextChapter.title}</span>
              </Link>
            ) : null}
          </nav>
        </>
      ) : null}

      {indicator ? (
        <div aria-live="polite" className="keyboard-indicator" role="status">
          第{formatChapterNumber(indicator)}章
        </div>
      ) : null}
    </main>
  );
}
