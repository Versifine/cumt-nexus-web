import { apiRequest } from "@/lib/api/client";

export type ResolvedContentEmbed = {
  author_name?: string | null;
  canonical_url?: string | null;
  description?: string | null;
  embed_url?: string | null;
  id: string;
  iframe_allowed?: boolean;
  image_url?: string | null;
  original_url?: string | null;
  provider: string;
  provider_ref?: string | null;
  provider_resource_id?: string | null;
  status?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  url?: string | null;
};

export type ResolveContentEmbedResponse = {
  embed: ResolvedContentEmbed;
};

export function resolveContentEmbed(url: string, token?: string | null) {
  return apiRequest<ResolveContentEmbedResponse>("/api/v1/embeds/resolve", {
    body: { url },
    method: "POST",
    token,
  });
}
