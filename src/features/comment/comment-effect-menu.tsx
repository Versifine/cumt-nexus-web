"use client";

import { ContentEffectMenu } from "@/features/effect/content-effect-menu";

type CommentEffectMenuProps = {
  commentId: string;
  isAuthenticated: boolean;
  postId: string;
  userCommentsUsername?: string;
};

export function CommentEffectMenu({
  commentId,
  isAuthenticated,
  postId,
  userCommentsUsername,
}: CommentEffectMenuProps) {
  return (
    <ContentEffectMenu
      isAuthenticated={isAuthenticated}
      postId={postId}
      targetId={commentId}
      targetType="comment"
      userCommentsUsername={userCommentsUsername}
    />
  );
}
