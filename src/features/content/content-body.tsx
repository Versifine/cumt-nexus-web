"use client";

import { useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  getAttachmentIdFromMarkdownUrl,
  getReferencedAttachmentIds,
  isAttachmentMarkdownUrl,
} from "@/features/content/attachment-markdown";
import {
  getRedditToken,
  transformRedditMarkdown,
} from "@/features/content/reddit-markdown";
import { MediaAttachmentFigure } from "@/features/media/media-attachments";
import type { MediaAttachment } from "@/features/media/types";
import { cn } from "@/lib/utils";

type ContentBodyProps = {
  attachments?: MediaAttachment[];
  className?: string;
  value: string;
};

export function ContentBody({
  attachments = [],
  className,
  value,
}: ContentBodyProps) {
  const transformed = useMemo(() => transformRedditMarkdown(value), [value]);
  const attachmentById = useMemo(
    () =>
      new Map(
        attachments.map((attachment) => [attachment.id, attachment] as const),
      ),
    [attachments],
  );
  const referencedAttachmentIds = useMemo(
    () => getReferencedAttachmentIds(value),
    [value],
  );
  const fallbackAttachments = useMemo(
    () =>
      attachments.filter(
        (attachment) =>
          isVisibleImageAttachment(attachment) &&
          !referencedAttachmentIds.has(attachment.id),
      ),
    [attachments, referencedAttachmentIds],
  );
  const components = useMemo(
    () => createMarkdownComponents(transformed.tokens, attachmentById),
    [attachmentById, transformed.tokens],
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
      {fallbackAttachments.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {fallbackAttachments.map((attachment) => (
            <MediaAttachmentFigure key={attachment.id} attachment={attachment} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function createMarkdownComponents(
  tokens: ReturnType<typeof transformRedditMarkdown>["tokens"],
  attachmentById: Map<string, MediaAttachment>,
): Components {
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
      if (isAttachmentMarkdownUrl(safeHref)) {
        return <span>{children}</span>;
      }
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
    img({ alt, src }) {
      const attachmentId = getAttachmentIdFromMarkdownUrl(
        typeof src === "string" ? src : null,
      );

      if (!attachmentId) {
        return (
          <span className="my-4 block border border-border bg-background-soft px-3 py-2 text-sm text-muted-foreground">
            外部图片不会直接渲染；请使用图片上传后插入正文。
          </span>
        );
      }

      const attachment = attachmentById.get(attachmentId);

      if (!attachment) {
        return (
          <span className="my-4 block border border-border bg-background-soft px-3 py-2 text-sm text-muted-foreground">
            图片附件不存在或尚未随内容返回。
          </span>
        );
      }

      if (!isVisibleImageAttachment(attachment)) {
        return (
          <span className="my-4 block border border-border bg-background-soft px-3 py-2 text-sm text-muted-foreground">
            图片当前不可显示。
          </span>
        );
      }

      return (
        <MarkdownAttachmentImage
          attachment={attachment}
          caption={typeof alt === "string" ? alt : undefined}
        />
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

function MarkdownAttachmentImage({
  attachment,
  caption,
}: {
  attachment: MediaAttachment;
  caption?: string;
}) {
  return (
    <span className="my-4 block border border-border bg-background-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachment.url}
        alt={caption || attachment.alt_text || "内容图片"}
        loading="lazy"
        decoding="async"
        className="max-h-[520px] w-full object-contain"
      />
      <span className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="truncate">{caption || getAttachmentCaption(attachment)}</span>
        <span className="font-mono">{formatFileSize(attachment.size_bytes)}</span>
      </span>
    </span>
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

  if (isAttachmentMarkdownUrl(trimmedUrl)) {
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

function isVisibleImageAttachment(attachment: MediaAttachment) {
  return (
    attachment.kind === "image" &&
    attachment.status !== "blocked" &&
    Boolean(attachment.url)
  );
}

function getAttachmentCaption(attachment: MediaAttachment) {
  if (attachment.alt_text.trim()) {
    return attachment.alt_text;
  }

  switch (attachment.status) {
    case "ready":
      return "图片附件";
    case "pending":
      return "等待处理";
    case "processing":
      return "处理中";
    case "blocked":
      return "已拦截";
    case "failed":
      return "图片不可用";
    default:
      return attachment.status;
  }
}

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "--";
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.ceil(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}
