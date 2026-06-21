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
        "my-4 block min-w-0 overflow-hidden rounded-lg bg-background-soft p-1",
        getPlayerRootClassName(embed),
        embed.layout === "music-compact" && "max-w-[520px]",
      )}
      data-media-provider={embed.provider}
      data-media-resource-type={embed.resourceType}
    >
      <span
        className={cn(
          "flex items-center justify-between gap-3 text-xs text-muted-foreground",
          embed.layout === "music-compact"
            ? "min-h-7 px-2.5 py-1"
            : "min-h-9 px-3 py-1.5",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span className="min-w-0 truncate">
            {embed.providerLabel} · {getResourceLabel(embed)}
          </span>
        </span>
        <a
          href={embed.originalUrl}
          rel="nofollow ugc noopener noreferrer"
          target="_blank"
          className="shrink-0 border-b border-transparent font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-soft"
        >
          打开原链接
        </a>
      </span>
      <span className={cn("block overflow-hidden rounded-md bg-surface", getFrameClassName(embed))}>
        <iframe
          suppressHydrationWarning
          title={embed.iframeTitle}
          src={embed.embedUrl}
          loading="lazy"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy={getPlayerReferrerPolicy(embed)}
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
    "my-4 block min-w-0 overflow-hidden rounded-lg bg-background-soft p-1",
    getPlayerRootClassName(embed),
    embed.layout === "music-compact" && "max-w-[520px]",
  );
  root.dataset.mediaProvider = embed.provider;
  root.dataset.mediaResourceType = embed.resourceType;

  const header = document.createElement("span");
  header.className = cn(
    "flex items-center justify-between gap-3 text-xs text-muted-foreground",
    embed.layout === "music-compact"
      ? "min-h-7 px-2.5 py-1"
      : "min-h-9 px-3 py-1.5",
  );

  const label = document.createElement("span");
  label.className = "flex min-w-0 items-center gap-2";
  const marker = document.createElement("span");
  marker.className = "size-1.5 shrink-0 rounded-full bg-primary";
  marker.setAttribute("aria-hidden", "true");
  const labelText = document.createElement("span");
  labelText.className = "min-w-0 truncate";
  labelText.textContent = `${embed.providerLabel} · ${getResourceLabel(embed)}`;
  label.append(marker, labelText);

  const link = document.createElement("a");
  link.href = embed.originalUrl;
  link.rel = "nofollow ugc noopener noreferrer";
  link.target = "_blank";
  link.className =
    "shrink-0 border-b border-transparent font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-soft";
  link.textContent = "打开原链接";

  const frame = document.createElement("span");
  frame.className = cn(
    "block overflow-hidden rounded-md bg-surface",
    getFrameClassName(embed),
  );

  const iframe = document.createElement("iframe");
  iframe.title = embed.iframeTitle;
  iframe.src = embed.embedUrl;
  iframe.loading = "lazy";
  iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = getPlayerReferrerPolicy(embed);
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

function getPlayerReferrerPolicy(embed: WhitelistedMediaEmbed) {
  if (embed.provider === "douyin") {
    return "unsafe-url";
  }

  return "strict-origin-when-cross-origin";
}

function getPlayerRootClassName(embed: WhitelistedMediaEmbed) {
  if (embed.provider === "douyin") {
    return "w-[320px] max-w-full";
  }

  if (embed.layout === "portrait-video") {
    return "w-full max-w-[380px]";
  }

  return "";
}

function getFrameClassName(embed: WhitelistedMediaEmbed) {
  switch (embed.layout) {
    case "music-compact":
      return "h-[86px]";
    case "music-tall":
      return "h-[450px]";
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
