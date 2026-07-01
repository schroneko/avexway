import { useEffect, useState } from "react";
import { loadContent, stripLeadingHeading } from "../lib/chapters";

export function useMarkdownContent(name: string | null, errorMessage: string) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(name !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      return;
    }

    setContent("");
    setIsLoading(true);
    setError(null);

    let active = true;

    void loadContent(name)
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

        setError(errorMessage);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [name, errorMessage]);

  return { content, error, isLoading };
}
