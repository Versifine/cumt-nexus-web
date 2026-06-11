import type { WhitelistedMediaEmbed } from "@/features/content/media-embed";
import { cn } from "@/lib/utils";

type MediaEmbedPlayerProps = {
  embed: WhitelistedMediaEmbed;
};

const playerSandbox =
  "allow-scripts allow-same-origin allow-popups allow-forms allow-presentation";

export function MediaEmbedPlayer({ embed }: MediaEmbedPlayerProps) {
  return (
    <span
      className={cn(
        "my-4 block min-w-0 overflow-hidden border border-border bg-background-soft",
        embed.layout === "portrait-video" && "w-full max-w-[380px]",
        embed.layout === "music-compact" && "max-w-[520px]",
      )}
      data-media-provider={embed.provider}
      data-media-resource-type={embed.resourceType}
    >
      <span className="flex min-h-10 items-center justify-between gap-3 border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {embed.providerLabel} · {getResourceLabel(embed)}
        </span>
        <a
          href={embed.originalUrl}
          rel="nofollow ugc noopener noreferrer"
          target="_blank"
          className="shrink-0 text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
        >
          打开原链接
        </a>
      </span>
      <span className={cn("block overflow-hidden bg-black", getFrameClassName(embed))}>
        <iframe
          suppressHydrationWarning
          title={embed.iframeTitle}
          src={embed.embedUrl}
          loading="lazy"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={playerSandbox}
          className="block size-full border-0"
        />
      </span>
    </span>
  );
}

export function createMediaEmbedPlayerElement(embed: WhitelistedMediaEmbed) {
  const root = document.createElement("span");
  root.className = cn(
    "my-4 block min-w-0 overflow-hidden border border-border bg-background-soft",
    embed.layout === "portrait-video" && "w-full max-w-[380px]",
    embed.layout === "music-compact" && "max-w-[520px]",
  );
  root.dataset.mediaProvider = embed.provider;
  root.dataset.mediaResourceType = embed.resourceType;

  const header = document.createElement("span");
  header.className =
    "flex min-h-10 items-center justify-between gap-3 border-b border-border px-3 py-2 text-xs text-muted-foreground";

  const label = document.createElement("span");
  label.className = "min-w-0 truncate";
  label.textContent = `${embed.providerLabel} · ${getResourceLabel(embed)}`;

  const link = document.createElement("a");
  link.href = embed.originalUrl;
  link.rel = "nofollow ugc noopener noreferrer";
  link.target = "_blank";
  link.className =
    "shrink-0 text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary";
  link.textContent = "打开原链接";

  const frame = document.createElement("span");
  frame.className = cn("block overflow-hidden bg-black", getFrameClassName(embed));

  const iframe = document.createElement("iframe");
  iframe.title = embed.iframeTitle;
  iframe.src = embed.embedUrl;
  iframe.loading = "lazy";
  iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.sandbox.add(
    "allow-scripts",
    "allow-same-origin",
    "allow-popups",
    "allow-forms",
    "allow-presentation",
  );
  iframe.className = "block size-full border-0";

  header.append(label, link);
  frame.append(iframe);
  root.append(header, frame);

  return root;
}

function getFrameClassName(embed: WhitelistedMediaEmbed) {
  switch (embed.layout) {
    case "music-compact":
      return "h-[86px] bg-background";
    case "music-tall":
      return "h-[450px] bg-background";
    case "portrait-video":
      return "aspect-[9/16]";
    case "wide-video":
    default:
      return "aspect-video";
  }
}

function getResourceLabel(embed: WhitelistedMediaEmbed) {
  switch (embed.resourceType) {
    case "album":
      return "专辑";
    case "playlist":
      return "歌单";
    case "song":
    case "song-id":
    case "song-mid":
      return "单曲";
    default:
      return "视频";
  }
}
