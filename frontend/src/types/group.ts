import type { ShowDTO } from "./show";

export type GroupMemberDTO = {
  id: string;
  currentSeason: number;
  currentEpisode: number;
  joinedAt: string;
  isModerator: boolean;
  user: { id: string; displayName: string; avatarUrl: string | null };
};

export type GroupDetail = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  nowPlayingVideoId: string | null;
  nowPlayingDailymotionId: string | null;
  nowPlayingExternalUrl: string | null;
  nowPlayingEmbeddable: boolean;
  show: ShowDTO;
  members: GroupMemberDTO[];
};

export type ReactionDTO = { id: string; emoji: string; userId: string };

export type MessageDTO = {
  id: string;
  content: string;
  createdAt: string;
  authorSeason: number | null;
  authorEpisode: number | null;
  editedAt: string | null;
  deletedAt: string | null;
  user: { id: string; displayName: string; avatarUrl: string | null };
  reactions: ReactionDTO[];
};
