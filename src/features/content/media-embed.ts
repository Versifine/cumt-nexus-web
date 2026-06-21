import type { ResolvedContentEmbed } from "./api";

export type WhitelistedMediaProvider =
  | "bilibili"
  | "douyin"
  | "netease"
  | "qq-music";

export type WhitelistedMediaKind = "music" | "video";

export type WhitelistedMediaLayout =
  | "music-compact"
  | "music-tall"
  | "portrait-video"
  | "wide-video";

export type WhitelistedMediaEmbed = {
  embedUrl: string;
  iframeTitle: string;
  kind: WhitelistedMediaKind;
  layout: WhitelistedMediaLayout;
  originalUrl: string;
  provider: WhitelistedMediaProvider;
  providerLabel: string;
  resourceId: string;
  resourceType: string;
};

const bilibiliBvidPattern = /^BV[0-9A-Za-z]{8,}$/;
const numericIdPattern = /^\d+$/;
const qqSongMidPattern = /^[0-9A-Za-z]{8,32}$/;

export function resolveWhitelistedMediaEmbed(
  value: string,
): WhitelistedMediaEmbed | null {
  const url = parseHttpUrl(value);

  if (!url) {
    return null;
  }

  return (
    resolveBilibiliEmbed(url, value) ??
    resolveDouyinEmbed(url, value) ??
    resolveNeteaseEmbed(url, value) ??
    resolveQqMusicEmbed(url, value)
  );
}

export function isWhitelistedMediaAutolink(
  href: string,
  childrenText: string,
) {
  const normalizedHref = trimTrailingSlash(href);
  const normalizedChildren = trimTrailingSlash(childrenText);

  return (
    normalizedHref.length > 0 &&
    normalizedHref === normalizedChildren &&
    Boolean(resolveWhitelistedMediaEmbed(href))
  );
}

export function isBackendResolvableMediaEmbedUrl(value: string) {
  const url = parseHttpUrl(value);

  if (!url) {
    return false;
  }

  return isHost(url, [
    "douyin.com",
    "iesdouyin.com",
    "open.douyin.com",
    "v.douyin.com",
  ]);
}

export function createWhitelistedMediaEmbedFromResolvedContentEmbed(
  embed?: ResolvedContentEmbed | null,
): WhitelistedMediaEmbed | null {
  if (
    !embed ||
    embed.provider !== "douyin_video" ||
    embed.iframe_allowed === false ||
    (embed.status && embed.status !== "ready")
  ) {
    return null;
  }

  const resourceId =
    embed.provider_ref?.trim() || embed.provider_resource_id?.trim() || "";
  const embedUrl =
    embed.embed_url?.trim() ||
    (resourceId
      ? `https://open.douyin.com/player/video?vid=${encodeURIComponent(resourceId)}&autoplay=0`
      : "");

  if (!embedUrl) {
    return null;
  }

  return {
    embedUrl,
    iframeTitle: "抖音视频播放器",
    kind: "video",
    layout: "portrait-video",
    originalUrl:
      embed.canonical_url?.trim() ||
      embed.url?.trim() ||
      embed.original_url?.trim() ||
      embedUrl,
    provider: "douyin",
    providerLabel: "抖音",
    resourceId: resourceId || embed.id,
    resourceType: "video",
  };
}

function resolveBilibiliEmbed(
  url: URL,
  originalUrl: string,
): WhitelistedMediaEmbed | null {
  if (!isHost(url, ["bilibili.com", "player.bilibili.com"])) {
    return null;
  }

  const bvidFromPlayer = url.searchParams.get("bvid");
  const aidFromPlayer = url.searchParams.get("aid");
  const videoPathMatch = url.pathname.match(/\/video\/((?:BV[0-9A-Za-z]+)|(?:av\d+))/i);
  const rawVideoId = videoPathMatch?.[1] ?? "";
  const bvidFromPath = rawVideoId.toUpperCase().startsWith("BV")
    ? rawVideoId
    : "";
  const aidFromPath = rawVideoId.toLowerCase().startsWith("av")
    ? rawVideoId.slice(2)
    : "";
  const bvid = isBilibiliBvid(bvidFromPlayer)
    ? bvidFromPlayer
    : isBilibiliBvid(bvidFromPath)
      ? bvidFromPath
      : "";
  const aid = isNumericId(aidFromPlayer)
    ? aidFromPlayer
    : isNumericId(aidFromPath)
      ? aidFromPath
      : "";

  if (!bvid && !aid) {
    return null;
  }

  const embedUrl = new URL("https://player.bilibili.com/player.html");

  if (bvid) {
    embedUrl.searchParams.set("bvid", bvid);
  } else {
    embedUrl.searchParams.set("aid", aid);
  }

  const page = getPositiveIntegerParam(url, "p");
  const start = getPositiveIntegerParam(url, "t");

  if (page) {
    embedUrl.searchParams.set("p", page);
  }

  if (start) {
    embedUrl.searchParams.set("t", start);
  }

  embedUrl.searchParams.set("autoplay", "0");
  embedUrl.searchParams.set("danmaku", "0");

  return {
    embedUrl: embedUrl.toString(),
    iframeTitle: "Bilibili 视频播放器",
    kind: "video",
    layout: "wide-video",
    originalUrl,
    provider: "bilibili",
    providerLabel: "Bilibili",
    resourceId: bvid || aid,
    resourceType: bvid ? "video-bvid" : "video-aid",
  };
}

function resolveDouyinEmbed(
  url: URL,
  originalUrl: string,
): WhitelistedMediaEmbed | null {
  if (!isHost(url, ["douyin.com", "iesdouyin.com", "open.douyin.com"])) {
    return null;
  }

  const videoPathMatch =
    url.pathname.match(/\/video\/(\d+)/) ??
    url.pathname.match(/\/share\/video\/(\d+)/);
  const videoId =
    url.searchParams.get("vid") ??
    url.searchParams.get("video_id") ??
    videoPathMatch?.[1] ??
    "";

  if (!isNumericId(videoId)) {
    return null;
  }

  const embedUrl = new URL("https://open.douyin.com/player/video");
  embedUrl.searchParams.set("vid", videoId);
  embedUrl.searchParams.set("autoplay", "0");

  return {
    embedUrl: embedUrl.toString(),
    iframeTitle: "抖音视频播放器",
    kind: "video",
    layout: "portrait-video",
    originalUrl,
    provider: "douyin",
    providerLabel: "抖音",
    resourceId: videoId,
    resourceType: "video",
  };
}

function resolveNeteaseEmbed(
  url: URL,
  originalUrl: string,
): WhitelistedMediaEmbed | null {
  if (!isHost(url, ["music.163.com"])) {
    return null;
  }

  const outchainType = url.pathname === "/outchain/player"
    ? normalizeNeteaseOutchainType(url.searchParams.get("type"))
    : null;
  const route = outchainType
    ? {
        id: url.searchParams.get("id") ?? "",
        resourceType: outchainType.resourceType,
      }
    : getNeteaseRoute(url);

  if (!route || !isNumericId(route.id)) {
    return null;
  }

  const config = getNeteaseEmbedConfig(route.resourceType);
  const embedUrl = new URL("https://music.163.com/outchain/player");
  embedUrl.searchParams.set("type", config.type);
  embedUrl.searchParams.set("id", route.id);
  embedUrl.searchParams.set("auto", "0");
  embedUrl.searchParams.set("height", config.playerHeight);

  return {
    embedUrl: embedUrl.toString(),
    iframeTitle: `网易云音乐${config.label}播放器`,
    kind: "music",
    layout: config.layout,
    originalUrl,
    provider: "netease",
    providerLabel: "网易云音乐",
    resourceId: route.id,
    resourceType: route.resourceType,
  };
}

function resolveQqMusicEmbed(
  url: URL,
  originalUrl: string,
): WhitelistedMediaEmbed | null {
  if (!isHost(url, ["y.qq.com", "i.y.qq.com"])) {
    return null;
  }

  const songId = url.searchParams.get("songid");
  const songMid =
    url.searchParams.get("songmid") ??
    url.pathname.match(/\/songDetail\/([0-9A-Za-z]+)/)?.[1] ??
    "";

  if (!isNumericId(songId) && !qqSongMidPattern.test(songMid)) {
    return null;
  }

  const embedUrl = new URL("https://i.y.qq.com/n2/m/outchain/player/index.html");

  if (isNumericId(songId)) {
    embedUrl.searchParams.set("songid", songId);
  } else {
    embedUrl.searchParams.set("songmid", songMid);
  }

  embedUrl.searchParams.set("songtype", url.searchParams.get("songtype") ?? "0");

  return {
    embedUrl: embedUrl.toString(),
    iframeTitle: "QQ 音乐播放器",
    kind: "music",
    layout: "music-compact",
    originalUrl,
    provider: "qq-music",
    providerLabel: "QQ 音乐",
    resourceId: songId || songMid,
    resourceType: isNumericId(songId) ? "song-id" : "song-mid",
  };
}

function getNeteaseRoute(url: URL) {
  const pathRoute = getNeteaseRouteFromPath(url.pathname, url.searchParams);

  if (pathRoute) {
    return pathRoute;
  }

  if (!url.hash.startsWith("#/")) {
    return null;
  }

  const hashUrl = new URL(`https://music.163.com/${url.hash.slice(2)}`);

  return getNeteaseRouteFromPath(hashUrl.pathname, hashUrl.searchParams);
}

function getNeteaseRouteFromPath(pathname: string, params: URLSearchParams) {
  const routeMatch = pathname.match(/^\/(song|playlist|album)(?:\/(\d+))?$/);

  if (!routeMatch) {
    return null;
  }

  return {
    id: routeMatch[2] ?? params.get("id") ?? "",
    resourceType: routeMatch[1],
  };
}

function getNeteaseEmbedConfig(resourceType: string) {
  switch (resourceType) {
    case "album":
      return {
        label: "专辑",
        layout: "music-tall" as const,
        playerHeight: "430",
        type: "1",
      };
    case "playlist":
      return {
        label: "歌单",
        layout: "music-tall" as const,
        playerHeight: "430",
        type: "0",
      };
    case "song":
    default:
      return {
        label: "单曲",
        layout: "music-compact" as const,
        playerHeight: "66",
        type: "2",
      };
  }
}

function normalizeNeteaseOutchainType(value: string | null) {
  switch (value) {
    case "0":
      return { resourceType: "playlist" };
    case "1":
      return { resourceType: "album" };
    case "2":
      return { resourceType: "song" };
    default:
      return null;
  }
}

function parseHttpUrl(value: string) {
  try {
    const parsedUrl = new URL(value);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
      ? parsedUrl
      : null;
  } catch {
    return null;
  }
}

function isHost(url: URL, allowedHosts: string[]) {
  const hostname = url.hostname.toLowerCase();

  return allowedHosts.some((host) => {
    const normalizedHost = host.toLowerCase();

    return hostname === normalizedHost || hostname.endsWith(`.${normalizedHost}`);
  });
}

function isBilibiliBvid(value?: string | null): value is string {
  return Boolean(value && bilibiliBvidPattern.test(value));
}

function isNumericId(value?: string | null): value is string {
  return Boolean(value && numericIdPattern.test(value));
}

function getPositiveIntegerParam(url: URL, name: string) {
  const value = url.searchParams.get(name);

  return isNumericId(value) && Number(value) > 0 ? value : "";
}

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, "");
}
