import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { useKeyboardNav } from "../hooks/useKeyboardNav";
import { chapters, loadIntroContent, siteTitle, stripLeadingHeading } from "../lib/chapters";

function formatChapterNumber(id: string) {
  return String(Number(id));
}

export function HomePage() {
  const [intro, setIntro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { indicator } = useKeyboardNav({
    nextPath: chapters[0] ? `/${chapters[0].id}` : null,
    previousPath: null,
    nextIndicator: chapters[0]?.id ?? null,
    previousIndicator: null,
  });

  useEffect(() => {
    document.title = siteTitle;

    let active = true;

    void loadIntroContent()
      .then((markdown) => {
        if (!active) {
          return;
        }

        const stripped = stripLeadingHeading(markdown);
        const separatorIndex = stripped.indexOf("\n---");
        setIntro(separatorIndex >= 0 ? stripped.slice(0, separatorIndex).trim() : stripped);
        setError(null);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setError("この章を開けませんでした");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page page-home">
      <header className="page-header">
        <p className="chapter-label">第0章</p>
        <h1 className="page-title">{siteTitle}</h1>
      </header>

      {error ? <p className="status-message">{error}</p> : null}
      {!error && intro ? (
        <div className="prose" key={intro}>
          <ReactMarkdown>{intro}</ReactMarkdown>
        </div>
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

      {indicator ? (
        <div aria-live="polite" className="keyboard-indicator" role="status">
          第{formatChapterNumber(indicator)}章
        </div>
      ) : null}
    </main>
  );
}
