"use client";

import { useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  getRedditToken,
  transformRedditMarkdown,
} from "@/features/content/reddit-markdown";
import { cn } from "@/lib/utils";

type ContentBodyProps = {
  className?: string;
  value: string;
};

export function ContentBody({ className, value }: ContentBodyProps) {
  const transformed = useMemo(() => transformRedditMarkdown(value), [value]);
  const components = useMemo(
    () => createMarkdownComponents(transformed.tokens),
    [transformed.tokens],
  );

  return (
    <div
      className={cn(
        "min-w-0 break-words text-foreground",
        "prose-headings:tracking-normal",
        className,
      )}
    >
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={safeUrlTransform}
      >
        {transformed.markdown}
      </ReactMarkdown>
    </div>
  );
}

function createMarkdownComponents(tokens: ReturnType<typeof transformRedditMarkdown>["tokens"]): Components {
  return {
    a({ children, href }) {
      const token = getRedditToken(href, tokens);

      if (token?.type === "spoiler") {
        return <SpoilerText text={token.text} />;
      }

      if (token?.type === "sup") {
        return <sup className="align-super text-[0.72em]">{token.text}</sup>;
      }

      const safeHref = safeUrlTransform(href ?? "");
      const isExternal = safeHref.startsWith("http://") || safeHref.startsWith("https://");

      if (!safeHref) {
        return <span>{children}</span>;
      }

      return (
        <a
          href={safeHref}
          rel={isExternal ? "nofollow ugc noopener noreferrer" : undefined}
          target={isExternal ? "_blank" : undefined}
          className="text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
        >
          {children}
        </a>
      );
    },
    blockquote({ children }) {
      return (
        <blockquote className="my-4 border-l-2 border-primary/50 bg-primary/5 px-4 py-2 text-muted-foreground">
          {children}
        </blockquote>
      );
    },
    code({ children, className }) {
      return (
        <code
          className={cn(
            "border border-border bg-background-soft px-1.5 py-0.5 font-mono text-[0.92em] text-foreground",
            className,
          )}
        >
          {children}
        </code>
      );
    },
    del({ children }) {
      return <del className="text-muted-foreground decoration-muted-foreground">{children}</del>;
    },
    h1({ children }) {
      return <h1 className="mb-3 mt-6 text-3xl font-black leading-tight">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="mb-3 mt-6 text-2xl font-black leading-tight">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="mb-2 mt-5 text-xl font-semibold leading-tight">{children}</h3>;
    },
    hr() {
      return <hr className="my-6 border-border" />;
    },
    li({ children }) {
      return <li className="pl-1 leading-7">{children}</li>;
    },
    ol({ children }) {
      return <ol className="my-4 list-decimal space-y-1 pl-6">{children}</ol>;
    },
    p({ children }) {
      return <p className="my-3 whitespace-pre-wrap leading-7 first:mt-0 last:mb-0">{children}</p>;
    },
    pre({ children }) {
      return (
        <pre className="my-4 overflow-x-auto border border-border bg-background-soft p-3 text-sm leading-6">
          {children}
        </pre>
      );
    },
    table({ children }) {
      return (
        <div className="my-4 overflow-x-auto border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            {children}
          </table>
        </div>
      );
    },
    tbody({ children }) {
      return <tbody className="divide-y divide-border">{children}</tbody>;
    },
    td({ children }) {
      return <td className="border-r border-border px-3 py-2 align-top last:border-r-0">{children}</td>;
    },
    th({ children }) {
      return (
        <th className="border-r border-border bg-background-soft px-3 py-2 text-left text-xs font-semibold text-muted-foreground last:border-r-0">
          {children}
        </th>
      );
    },
    thead({ children }) {
      return <thead className="border-b border-border">{children}</thead>;
    },
    ul({ children }) {
      return <ul className="my-4 list-disc space-y-1 pl-6">{children}</ul>;
    },
  };
}

function SpoilerText({ text }: { text: string }) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <button
      type="button"
      aria-label={isRevealed ? "隐藏内容" : "显示隐藏内容"}
      className={cn(
        "mx-1 inline-flex min-h-7 items-center border px-2 py-0.5 text-left align-baseline text-[0.92em] leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isRevealed
          ? "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15"
          : "border-zinc-700 bg-zinc-950 text-zinc-500 hover:border-primary/50 hover:bg-zinc-900 hover:text-primary",
      )}
      onClick={() => setIsRevealed((current) => !current)}
    >
      {isRevealed ? text : "显示隐藏内容"}
    </button>
  );
}

function safeUrlTransform(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (trimmedUrl.startsWith("#") || trimmedUrl.startsWith("/")) {
    return trimmedUrl;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    const allowedProtocols = new Set(["http:", "https:", "mailto:"]);

    return allowedProtocols.has(parsedUrl.protocol) ? trimmedUrl : "";
  } catch {
    return "";
  }
}
