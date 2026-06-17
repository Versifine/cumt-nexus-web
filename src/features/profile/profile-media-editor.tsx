"use client";

import {
  ManagedMediaEditor,
  type ManagedMediaKind,
  type ManagedMediaTriggerVariant,
} from "@/features/media/media-editor";

import { useUpdateProfileMutation } from "./queries";
import type { PublicUser } from "./types";

type ProfileMediaEditorProps = {
  className?: string;
  kind: ManagedMediaKind;
  onSaved?: (user: PublicUser) => void;
  triggerLabel?: string;
  triggerVariant?: ManagedMediaTriggerVariant;
  user: PublicUser;
};

export function ProfileMediaEditor({
  className,
  kind,
  onSaved,
  triggerLabel,
  triggerVariant = "panel",
  user,
}: ProfileMediaEditorProps) {
  const updateMutation = useUpdateProfileMutation();
  const displayName = getProfileMediaDisplayName(user);

  return (
    <ManagedMediaEditor
      altText={`${displayName} 的${kind === "avatar" ? "头像" : "背景图"}`}
      className={className}
      currentUrl={kind === "avatar" ? user.avatar_url ?? "" : user.banner_url ?? ""}
      displayName={displayName}
      entityLabel="个人主页"
      fileBaseName={user.username || displayName}
      kind={kind}
      triggerLabel={triggerLabel}
      triggerVariant={triggerVariant}
      onSaveUrl={(url) =>
        kind === "avatar"
          ? updateMutation.mutateAsync({ avatar_url: url })
          : updateMutation.mutateAsync({ banner_url: url })
      }
      onSaved={(result) => onSaved?.(result.user)}
    />
  );
}

function getProfileMediaDisplayName(user: PublicUser) {
  return user.display_name || user.username;
}
