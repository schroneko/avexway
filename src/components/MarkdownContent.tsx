import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";

type MarkdownContentProps = {
  children: string;
  className?: string;
};

const allowedProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

function isRelativeUrl(url: string) {
  return (
    url.startsWith("#") ||
    url.startsWith("/") ||
    url.startsWith("./") ||
    url.startsWith("../") ||
    url.startsWith("?")
  );
}

function getSafeUrl(url: string) {
  if (!url) {
    return null;
  }

  if (isRelativeUrl(url)) {
    return url;
  }

  try {
    const parsed = new URL(url, "https://example.invalid");

    if (!allowedProtocols.has(parsed.protocol)) {
      return null;
    }

    return url.startsWith("//") ? parsed.toString() : url;
  } catch {
    return null;
  }
}

function MarkdownLink({ href, ...props }: ComponentProps<"a">) {
  const safeHref = href ? getSafeUrl(href) : null;

  if (!safeHref) {
    return <>{props.children}</>;
  }

  const isExternal = /^(?:https?:)?\/\//.test(safeHref);

  return (
    <a
      {...props}
      href={safeHref}
      rel={isExternal ? "noopener noreferrer" : props.rel}
      target={isExternal ? "_blank" : props.target}
    />
  );
}

export function MarkdownContent({ children, className }: MarkdownContentProps) {
  const markdown = (
    <ReactMarkdown
      components={{ a: MarkdownLink }}
      skipHtml
      urlTransform={(url) => getSafeUrl(url) ?? ""}
    >
      {children}
    </ReactMarkdown>
  );

  return className ? <div className={className}>{markdown}</div> : markdown;
}
