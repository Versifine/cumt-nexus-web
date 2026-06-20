"use client";

import {
  cloneElement,
  isValidElement,
  useMemo,
  useState,
} from "react";
import rehypeKatex from "rehype-katex";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import {
  getAttachmentIdFromMarkdownUrl,
  isAttachmentGalleryMarkdownUrl,
  isAttachmentMarkdownUrl,
} from "@/features/content/attachment-markdown";
import { ContentImageGallery } from "@/features/content/content-image-gallery";
import { resolveImageMediaBlockFromMarkdownUrl } from "@/features/content/content-media";
import {
  getRedditToken,
  transformRedditMarkdown,
} from "@/features/content/reddit-markdown";
import { remarkRedditAutolink } from "@/features/content/reddit-autolink";
import {
  isExternalMarkdownHref,
  normalizeMarkdownHref,
} from "@/features/content/markdown-url";
import { resolveWhitelistedMediaEmbed } from "@/features/content/media-embed";
import { MediaEmbedPlayer } from "@/features/content/media-embed-player";
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
  const components = useMemo(
    () => createMarkdownComponents(transformed.tokens, attachmentById),
    [attachmentById, transformed.tokens],
  );

  return (
    <div
      className={cn(
        "min-w-0 break-words text-foreground",
        "prose-headings:tracking-normal",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_.katex-display]:my-4 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1",
        "[&_.katex-display>.katex]:text-left",
        className,
      )}
    >
      <ReactMarkdown
        components={components}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        remarkPlugins={[remarkGfm, remarkMath, remarkRedditAutolink]}
        skipHtml
        urlTransform={normalizeMarkdownHref}
      >
        {transformed.markdown}
      </ReactMarkdown>
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

      const safeHref = normalizeMarkdownHref(href);
      if (
        isAttachmentMarkdownUrl(safeHref) ||
        isAttachmentGalleryMarkdownUrl(safeHref)
      ) {
        return <span>{children}</span>;
      }
      const isExternal = isExternalMarkdownHref(safeHref);

      if (!safeHref) {
        return <span>{children}</span>;
      }

      const embed = resolveWhitelistedMediaEmbed(safeHref);

      if (embed) {
        return <MediaEmbedPlayer embed={embed} />;
      }

      return (
        <a
          href={safeHref}
          rel={isExternal ? "nofollow ugc noopener noreferrer" : undefined}
          target={isExternal ? "_blank" : undefined}
          className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
        >
          {children}
        </a>
      );
    },
    img({ alt, src }) {
      const safeSrc = typeof src === "string" ? src : null;
      const mediaBlock = resolveImageMediaBlockFromMarkdownUrl({
        attachmentById,
        caption: typeof alt === "string" ? alt : undefined,
        src: safeSrc,
      });

      if (mediaBlock) {
        return (
          <ContentImageGallery
            attachments={mediaBlock.attachments}
            caption={mediaBlock.caption}
            variant="detail"
          />
        );
      }

      const attachmentId = getAttachmentIdFromMarkdownUrl(safeSrc);

      if (!attachmentId && !isAttachmentGalleryMarkdownUrl(safeSrc)) {
        return (
          <span className="my-4 block rounded-md bg-surface-raised px-3 py-2 text-sm text-muted-foreground">
            外部图片不会直接渲染；请上传图片后放入正文。
          </span>
        );
      }

      return (
        <span className="my-4 block rounded-md bg-surface-raised px-3 py-2 text-sm text-muted-foreground">
          图片附件不存在、尚未随内容返回或当前不可显示。
        </span>
      );
    },
    blockquote({ children }) {
      return (
        <blockquote className="my-4 rounded-md bg-background-soft px-4 py-3 text-muted-foreground ring-1 ring-border/60">
          {children}
        </blockquote>
      );
    },
    code({ children, className }) {
      return (
        <code
          className={cn(
            "rounded-sm bg-background-soft px-1.5 py-0.5 font-mono text-[0.92em] text-foreground",
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
      return (
        <h1 className="mb-3 mt-6 flex min-w-0 items-start gap-2 text-xl font-semibold leading-7 first:mt-0">
          <span
            className="mt-2 size-2 shrink-0 rounded-full bg-primary"
            aria-hidden="true"
          />
          <span className="min-w-0">{children}</span>
        </h1>
      );
    },
    h2({ children }) {
      return (
        <h2 className="mb-2 mt-5 flex min-w-0 items-start gap-2 text-lg font-semibold leading-7 first:mt-0">
          <span
            className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
            aria-hidden="true"
          />
          <span className="min-w-0">{children}</span>
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className="mb-2 mt-4 flex min-w-0 items-start gap-2 text-base font-semibold leading-6 first:mt-0">
          <span
            className="mt-2 size-1.5 shrink-0 rounded-full bg-primary-muted"
            aria-hidden="true"
          />
          <span className="min-w-0">{children}</span>
        </h3>
      );
    },
    hr() {
      return <hr className="my-6 h-1 w-16 rounded-full border-0 bg-primary-muted" />;
    },
    input({ checked, type }) {
      if (type === "checkbox") {
        return (
          <input
            type="checkbox"
            checked={Boolean(checked)}
            disabled
            readOnly
            aria-label={checked ? "已完成" : "未完成"}
            className="mr-2 size-4 translate-y-0.5 accent-primary"
          />
        );
      }

      return <input type={type} checked={checked} disabled readOnly />;
    },
    li({ children, className }) {
      const isTaskListItem = className?.includes("task-list-item");

      return (
        <li
          className={cn(
            "pl-1 leading-7 marker:text-primary/70 [&>p]:my-0",
            isTaskListItem && "list-none pl-0",
            className,
          )}
        >
          {children}
        </li>
      );
    },
    ol({ children, className }) {
      return <ol className={cn("my-4 list-decimal space-y-1 pl-6 marker:text-primary/70", className)}>{children}</ol>;
    },
    p({ children }) {
      return <p className="my-3 whitespace-pre-wrap leading-7 first:mt-0 last:mb-0">{children}</p>;
    },
    pre({ children }) {
      const codeBlock = isValidElement<{ className?: string }>(children)
        ? cloneElement(children, {
            className: cn(
              children.props.className,
              "block border-0 bg-transparent px-0 py-0 text-sm leading-6",
            ),
          })
        : children;

      return (
        <pre className="my-4 min-w-0 max-w-full overflow-x-auto rounded-md bg-background-soft p-3 font-mono text-sm leading-6">
          {codeBlock}
        </pre>
      );
    },
    table({ children }) {
      return (
        <div className="my-4 min-w-0 max-w-full overflow-x-auto rounded-lg bg-background-soft p-1">
          <table className="w-full min-w-[560px] border-separate border-spacing-0 overflow-hidden rounded-md bg-surface text-sm">
            {children}
          </table>
        </div>
      );
    },
    tbody({ children }) {
      return <tbody>{children}</tbody>;
    },
    td({ children }) {
      return <td className="border-r border-t border-border px-3 py-2 align-top first:border-l last:border-r">{children}</td>;
    },
    th({ children }) {
      return (
        <th className="border-r border-t border-border bg-background-soft px-3 py-2 text-left text-xs font-semibold text-muted-foreground first:border-l last:border-r">
          {children}
        </th>
      );
    },
    thead({ children }) {
      return <thead>{children}</thead>;
    },
    ul({ children, className }) {
      const containsTaskList = className?.includes("contains-task-list");

      return (
        <ul
          className={cn(
            "my-4 list-disc space-y-1 pl-6",
            "marker:text-primary/70",
            containsTaskList && "list-none pl-0",
            className,
          )}
        >
          {children}
        </ul>
      );
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
