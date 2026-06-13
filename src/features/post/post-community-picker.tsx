"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Hash, Loader2, Search, X } from "lucide-react";

import {
  readRecentCommunities,
  type RecentCommunity,
} from "@/components/app-shell/recent-communities";
import { Input } from "@/components/ui/input";
import type { Community } from "@/features/community/types";
import { useSearchQuery } from "@/features/search/queries";
import type { SearchCommunityResult } from "@/features/search/types";
import { cn } from "@/lib/utils";

type CommunityCandidate = {
  description?: string;
  id: string;
  name: string;
  slug: string;
  source: "followed" | "recent" | "search" | "typed";
  status?: string;
};

type PostCommunityPickerProps = {
  disabled?: boolean;
  isSelectedCommunityLoading?: boolean;
  onChange: (slug: string) => void;
  selectedCommunity?: Community | null;
  suggestedCommunities?: Community[];
  value: string;
};

const SEARCH_RESULT_LIMIT = 8;
const IDLE_CANDIDATE_LIMIT = 5;
const COMMUNITY_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;

export function PostCommunityPicker({
  disabled = false,
  isSelectedCommunityLoading = false,
  onChange,
  selectedCommunity,
  suggestedCommunities = [],
  value,
}: PostCommunityPickerProps) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [draft, setDraft] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [recentCommunities, setRecentCommunities] = useState<RecentCommunity[]>([]);
  const normalizedDraft = normalizeSlugInput(draft);
  const searchQuery = useSearchQuery(
    {
      limit: SEARCH_RESULT_LIMIT,
      offset: 0,
      q: draft,
      scope: "communities",
    },
    isOpen && draft.trim().length > 0 && !disabled,
  );
  const hasSearchDraft = draft.trim().length > 0;
  const searchCandidates = useMemo(
    () =>
      (searchQuery.data?.communities ?? [])
        .filter(canUseSearchCommunity)
        .map(toSearchCandidate),
    [searchQuery.data?.communities],
  );
  const idleCandidates = useMemo(
    () =>
      mergeCandidates([
        ...suggestedCommunities.map(toFollowedCandidate).filter(Boolean),
        ...recentCommunities.map(toRecentCandidate).filter(Boolean),
      ]).slice(0, IDLE_CANDIDATE_LIMIT),
    [recentCommunities, suggestedCommunities],
  );
  const exactTypedCandidate =
    isValidCommunitySlug(normalizedDraft) &&
    !hasCandidateSlug(searchCandidates, normalizedDraft)
      ? ({
          id: `typed:${normalizedDraft}`,
          name: normalizedDraft,
          slug: normalizedDraft,
          source: "typed",
        } satisfies CommunityCandidate)
      : null;
  const visibleCandidates = hasSearchDraft
    ? mergeCandidates([
        ...(exactTypedCandidate ? [exactTypedCandidate] : []),
        ...searchCandidates,
      ]).slice(0, SEARCH_RESULT_LIMIT)
    : idleCandidates;

  useEffect(() => {
    function refreshRecentCommunities() {
      setRecentCommunities(readRecentCommunities());
    }

    refreshRecentCommunities();
    window.addEventListener(
      "cumt-nexus:recent-communities-changed",
      refreshRecentCommunities,
    );

    return () => {
      window.removeEventListener(
        "cumt-nexus:recent-communities-changed",
        refreshRecentCommunities,
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function selectCommunity(slug: string) {
    if (disabled) {
      return;
    }

    onChange(slug);
    setDraft("");
    setIsOpen(false);
  }

  function clearCommunity() {
    if (disabled) {
      return;
    }

    onChange("");
    setDraft("");
    setIsOpen(false);
  }

  return (
    <div className="relative max-w-[520px]" ref={containerRef}>
      <button
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-lg border border-border bg-background-soft px-2.5 text-left text-sm outline-none transition-colors",
          "hover:border-primary/50 hover:bg-muted/45 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          value ? "pr-16" : "pr-9",
          disabled && "cursor-not-allowed opacity-60 hover:border-border hover:bg-background-soft",
        )}
        disabled={disabled}
        id="communitySlug"
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <CommunityAvatar isSelected={Boolean(value)} />
        <SelectedCommunitySummary
          isLoading={isSelectedCommunityLoading}
          selectedCommunity={selectedCommunity}
          value={value}
        />
        <ChevronDown
          className={cn(
            "absolute right-3 size-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {value ? (
        <button
          aria-label="清除已选社区"
          className="absolute right-9 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={clearCommunity}
          type="button"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}

      {isOpen ? (
        <div
          className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-[0_18px_50px_rgb(0_0_0/0.42)]"
          id={panelId}
          role="listbox"
        >
          <div className="relative border-b border-border">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="搜索社区或输入社区 slug"
              autoComplete="off"
              className="h-11 rounded-none border-0 bg-transparent pl-9 pr-3 font-medium focus-visible:border-transparent focus-visible:ring-0"
              disabled={disabled}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  isValidCommunitySlug(normalizedDraft)
                ) {
                  event.preventDefault();
                  selectCommunity(normalizedDraft);
                }
              }}
              placeholder="搜索社区或输入 /slug"
              ref={searchInputRef}
              value={draft}
            />
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            <div className="flex h-8 items-center justify-between px-3 text-[11px] font-semibold text-muted-foreground">
              <span>{hasSearchDraft ? "搜索结果" : "最近和已关注"}</span>
              {searchQuery.isFetching ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
            </div>
            {visibleCandidates.length > 0 ? (
              visibleCandidates.map((candidate) => (
                <CommunityCandidateButton
                  candidate={candidate}
                  disabled={disabled}
                  isSelected={candidate.slug === value}
                  key={`${candidate.source}:${candidate.slug}`}
                  onSelect={selectCommunity}
                />
              ))
            ) : (
              <CommunityPickerEmptyState
                hasSearchDraft={hasSearchDraft}
                isSearching={searchQuery.isFetching}
              />
            )}
          </div>
        </div>
      ) : null}

      {hasSearchDraft && searchQuery.isError ? (
        <p className="mt-2 text-xs leading-5 text-warning">
          社区搜索暂时不可用，可以直接输入完整 slug 后选择。
        </p>
      ) : null}
    </div>
  );
}

function SelectedCommunitySummary({
  isLoading,
  selectedCommunity,
  value,
}: {
  isLoading: boolean;
  selectedCommunity?: Community | null;
  value: string;
}) {
  if (!value) {
    return (
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">选择社区</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="truncate font-semibold text-foreground">
          {selectedCommunity?.name ?? `/${value}`}
        </span>
        <span className="shrink-0 truncate font-mono text-xs text-primary">
          {isLoading ? "确认中" : `/${selectedCommunity?.slug ?? value}`}
        </span>
      </div>
    </div>
  );
}

function CommunityAvatar({ isSelected }: { isSelected: boolean }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold",
        isSelected
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border bg-background text-muted-foreground",
      )}
      aria-hidden="true"
    >
      <Hash className="size-3.5" />
    </span>
  );
}

function CommunityCandidateButton({
  candidate,
  disabled,
  isSelected,
  onSelect,
}: {
  candidate: CommunityCandidate;
  disabled: boolean;
  isSelected: boolean;
  onSelect: (slug: string) => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60",
        isSelected && "bg-muted/70",
      )}
      disabled={disabled}
      onClick={() => onSelect(candidate.slug)}
      role="option"
      aria-selected={isSelected}
      type="button"
    >
      <CommunityAvatar isSelected={isSelected} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-foreground">
            {candidate.name}
          </span>
          <span className="shrink-0 font-mono text-xs text-primary">
            /{candidate.slug}
          </span>
        </div>
        {candidate.description ? (
          <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-muted-foreground">
            {candidate.description}
          </p>
        ) : null}
      </div>
      <span className="hidden shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
        {formatCandidateSource(candidate.source)}
      </span>
      {isSelected ? (
        <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
      ) : null}
    </button>
  );
}

function CommunityPickerEmptyState({
  hasSearchDraft,
  isSearching,
}: {
  hasSearchDraft: boolean;
  isSearching: boolean;
}) {
  return (
    <div className="px-3 py-5 text-sm leading-6 text-muted-foreground">
      {isSearching
        ? "正在搜索社区..."
        : hasSearchDraft
          ? "没有匹配结果。"
          : "暂无最近或已关注社区。"}
    </div>
  );
}

function mergeCandidates(candidates: Array<CommunityCandidate | null>) {
  const seenSlugs = new Set<string>();
  const nextCandidates: CommunityCandidate[] = [];

  candidates.forEach((candidate) => {
    if (!candidate || seenSlugs.has(candidate.slug)) {
      return;
    }

    seenSlugs.add(candidate.slug);
    nextCandidates.push(candidate);
  });

  return nextCandidates;
}

function hasCandidateSlug(candidates: CommunityCandidate[], slug: string) {
  return candidates.some((candidate) => candidate.slug === slug);
}

function toFollowedCandidate(community: Community): CommunityCandidate | null {
  if (!canUseCommunity(community)) {
    return null;
  }

  return {
    description: community.description,
    id: community.id,
    name: community.name,
    slug: community.slug,
    source: "followed",
    status: community.status,
  };
}

function toRecentCandidate(community: RecentCommunity): CommunityCandidate | null {
  const slug = normalizeSlugInput(community.slug);

  if (!slug) {
    return null;
  }

  return {
    id: `recent:${slug}`,
    name: community.name.trim() || slug,
    slug,
    source: "recent",
  };
}

function toSearchCandidate(
  community: SearchCommunityResult,
): CommunityCandidate {
  return {
    description: community.description,
    id: community.id,
    name: community.name,
    slug: community.slug,
    source: "search",
    status: community.status,
  };
}

function canUseCommunity(community: Community) {
  return community.status === "active";
}

function canUseSearchCommunity(community: SearchCommunityResult) {
  return community.status === "active";
}

function normalizeSlugInput(value: string) {
  return value
    .trim()
    .replace(/^\/+/, "")
    .replace(/^r\//i, "")
    .trim()
    .toLowerCase();
}

function isValidCommunitySlug(value: string) {
  return COMMUNITY_SLUG_PATTERN.test(value);
}

function formatCandidateSource(source: CommunityCandidate["source"]) {
  switch (source) {
    case "followed":
      return "已关注";
    case "recent":
      return "最近";
    case "typed":
      return "使用输入";
    case "search":
      return "搜索";
    default:
      return "";
  }
}
