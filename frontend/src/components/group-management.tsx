"use client";

import { useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { FieldError } from "@/components/field-error";
import { UtilityPanel } from "@/components/utility-panel";
import type { GroupDetail, GroupMemberDTO } from "@/types/group";

function ActionChip({
  onClick,
  disabled,
  tone = "muted",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone?: "muted" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border border-dashed px-3 py-1 font-mono text-xs transition-colors disabled:opacity-50 ${
        tone === "danger"
          ? "border-danger/50 text-danger hover:bg-danger/10"
          : "border-screen-line text-text-muted hover:border-signal hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

export function GroupManagement({
  group,
  myUserId,
  onLeftOrDeleted,
  onMemberRemoved,
  onMemberModeratorChanged,
}: {
  group: GroupDetail;
  myUserId: string;
  onLeftOrDeleted: () => void;
  onMemberRemoved: (userId: string) => void;
  onMemberModeratorChanged: (userId: string, isModerator: boolean) => void;
}) {
  const isOwner = group.ownerId === myUserId;
  const isModerator = group.members.some((m) => m.user.id === myUserId && m.isModerator);
  const canManageMembers = isOwner || isModerator;

  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/groups/${group.id}/leave`, { method: "DELETE" });
      onLeftOrDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti.");
      setBusy(false);
    }
  }

  async function handleDeleteGroup() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/groups/${group.id}`, { method: "DELETE" });
      onLeftOrDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti.");
      setBusy(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/groups/${group.id}/members/${userId}`, { method: "DELETE" });
      onMemberRemoved(userId);
      setConfirming(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleModerator(member: GroupMemberDTO) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/groups/${group.id}/members/${member.user.id}/moderator`, {
        method: "PATCH",
        body: JSON.stringify({ isModerator: !member.isModerator }),
      });
      onMemberModeratorChanged(member.user.id, !member.isModerator);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <UtilityPanel label="Grup yönetimi">
      {canManageMembers ? (
        <div className="space-y-2">
          {group.members
            .filter((m) => m.user.id !== myUserId)
            // Grup sahibi bu listede hiç görünmez — ona kimse dokunamaz.
            .filter((m) => m.user.id !== group.ownerId)
            // Moderatör başka bir moderatörü çıkaramaz — o satırda sadece rozet görünür.
            .filter((m) => isOwner || !m.isModerator)
            .map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                  {m.user.displayName}
                  {m.isModerator && (
                    <span className="rounded-full border border-sync/40 bg-sync-soft px-1.5 py-0.5 font-mono text-[9px] tracking-[0.06em] text-sync uppercase">
                      Mod
                    </span>
                  )}
                </span>
                {confirming === m.user.id ? (
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-muted">emin misin?</span>
                    <ActionChip tone="danger" disabled={busy} onClick={() => handleRemoveMember(m.user.id)}>
                      evet, çıkar
                    </ActionChip>
                    <ActionChip onClick={() => setConfirming(null)}>vazgeç</ActionChip>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isOwner && (
                      <ActionChip disabled={busy} onClick={() => handleToggleModerator(m)}>
                        {m.isModerator ? "moderatörlükten al" : "moderatör yap"}
                      </ActionChip>
                    )}
                    <ActionChip onClick={() => setConfirming(m.user.id)}>çıkar</ActionChip>
                  </span>
                )}
              </div>
            ))}

          <div className="mt-4 border-t border-dashed border-screen-line pt-4">
            {isOwner ? (
              confirming === "delete-group" ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-text-muted">
                    grubu tamamen silmek üzeresin, emin misin?
                  </span>
                  <ActionChip tone="danger" disabled={busy} onClick={handleDeleteGroup}>
                    evet, sil
                  </ActionChip>
                  <ActionChip onClick={() => setConfirming(null)}>vazgeç</ActionChip>
                </span>
              ) : (
                <ActionChip tone="danger" onClick={() => setConfirming("delete-group")}>
                  Grubu sil
                </ActionChip>
              )
            ) : confirming === "leave" ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-text-muted">
                  bu gruptan ayrılmak üzeresin, emin misin?
                </span>
                <ActionChip tone="danger" disabled={busy} onClick={handleLeave}>
                  evet, ayrıl
                </ActionChip>
                <ActionChip onClick={() => setConfirming(null)}>vazgeç</ActionChip>
              </span>
            ) : (
              <ActionChip tone="danger" onClick={() => setConfirming("leave")}>
                Gruptan ayrıl
              </ActionChip>
            )}
          </div>
        </div>
      ) : confirming === "leave" ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-text-muted">
            bu gruptan ayrılmak üzeresin, emin misin?
          </span>
          <ActionChip tone="danger" disabled={busy} onClick={handleLeave}>
            evet, ayrıl
          </ActionChip>
          <ActionChip onClick={() => setConfirming(null)}>vazgeç</ActionChip>
        </span>
      ) : (
        <ActionChip tone="danger" onClick={() => setConfirming("leave")}>
          Gruptan ayrıl
        </ActionChip>
      )}

      {error && <FieldError>{error}</FieldError>}
    </UtilityPanel>
  );
}
