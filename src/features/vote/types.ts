export type VoteValue = -1 | 1;

export type PostVote = {
  post_id: string;
  user_id: string;
  value: VoteValue;
  created_at: string;
  updated_at: string;
};

export type SetPostVoteResponse = {
  vote: PostVote;
};

export type CommentVote = {
  comment_id: string;
  user_id: string;
  value: VoteValue;
  created_at: string;
  updated_at: string;
};

export type SetCommentVoteResponse = {
  vote: CommentVote;
};
