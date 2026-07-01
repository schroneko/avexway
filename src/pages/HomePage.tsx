import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { KeyboardIndicator } from "../components/KeyboardIndicator";
import { MarkdownContent } from "../components/MarkdownContent";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { useMarkdownContent } from "../hooks/useMarkdownContent";
import { chapters, formatChapterNumber, siteTitle } from "../lib/chapters";

export function HomePage() {
  const { content, error } = useMarkdownContent("index", "序文を読み込めませんでした");
  const { indicator } = useKeyboardNav({
    nextPath: chapters[0] ? `/${chapters[0].id}` : null,
    previousPath: null,
    nextIndicator: chapters[0]?.id ?? null,
    previousIndicator: null,
  });

  const intro = useMemo(() => {
    const separatorIndex = content.indexOf("\n---");

    return separatorIndex >= 0 ? content.slice(0, separatorIndex).trim() : content;
  }, [content]);

  useEffect(() => {
    document.title = siteTitle;
  }, []);

  return (
    <main className="page page-home">
      <header className="page-header">
        <p className="chapter-label">第0章</p>
        <h1 className="page-title">{siteTitle}</h1>
      </header>

      {error ? <p className="status-message">{error}</p> : null}
      {!error && intro ? (
        <MarkdownContent className="prose" key={intro}>
          {intro}
        </MarkdownContent>
      ) : null}

      <hr />

      <section aria-labelledby="chapter-index-heading" className="chapter-index">
        <h2 className="sr-only" id="chapter-index-heading">
          目次
        </h2>
        <ol className="chapter-index-list">
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <Link className="chapter-index-link" to={`/${chapter.id}`}>
                <span className="chapter-index-number">{formatChapterNumber(chapter.id)}</span>
                <span className="chapter-index-title">{chapter.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {chapters[0] ? (
        <Link
          aria-label={`次の章へ: ${chapters[0].title}`}
          className="edge-nav-hint edge-nav-hint-right"
          to={`/${chapters[0].id}`}
        >
          →
        </Link>
      ) : null}

      <KeyboardIndicator indicator={indicator} />
    </main>
  );
}
