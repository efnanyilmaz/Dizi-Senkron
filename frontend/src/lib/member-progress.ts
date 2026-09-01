import type { MemberProgress } from "@/components/sync-ticker";
import type { GroupMemberDTO } from "@/types/group";

const avatarPalette = ["#f2c265", "#7fd1c4", "#e38b8b", "#9ca8e3", "#c7a8e3", "#8fd18a"];

function colorForUser(userId: string) {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarPalette[hash % avatarPalette.length];
}

function relativeJoinLabel(joinedAt: string) {
  const days = Math.floor((Date.now() - new Date(joinedAt).getTime()) / 86_400_000);
  if (days < 1) return "bugün katıldı";
  if (days < 14) return `${days} gün önce katıldı`;
  return `${Math.floor(days / 7)} hafta önce katıldı`;
}

const rank = (m: GroupMemberDTO) => m.currentSeason * 1000 + m.currentEpisode;

export function toMemberProgress(
  members: GroupMemberDTO[],
  currentUserId?: string,
  onlineUserIds?: Set<string>,
): MemberProgress[] {
  const maxRank = Math.max(...members.map(rank));
  const leader = members.find((m) => rank(m) === maxRank)!;

  return members.map((m) => {
    const inSync = rank(m) === maxRank;
    const behindBy =
      !inSync && m.currentSeason === leader.currentSeason
        ? leader.currentEpisode - m.currentEpisode
        : undefined;

    return {
      id: m.id,
      name: m.user.id === currentUserId ? `${m.user.displayName} (sen)` : m.user.displayName,
      avatarColor: colorForUser(m.user.id),
      joinedLabel: relativeJoinLabel(m.joinedAt),
      season: m.currentSeason,
      episode: m.currentEpisode,
      segmentsOn: Math.min(m.currentEpisode, 10),
      status: inSync ? "sync" : "behind",
      behindBy,
      online: onlineUserIds?.has(m.user.id) ?? false,
    };
  });
}
