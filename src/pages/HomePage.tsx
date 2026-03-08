import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { chapters, loadIntroContent, siteTitle, stripLeadingHeading } from "../lib/chapters";

function formatChapterNumber(id: string) {
  return String(Number(id));
}

export function HomePage() {
  const [intro, setIntro] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    </main>
  );
}
