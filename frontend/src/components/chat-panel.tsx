"use client";

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type ChatMessage = {
  id: string;
  authorId: string;
  authorName: string;
  authorSeason: number | null;
  authorEpisode: number | null;
  content: string;
  time: string;
  editedAt: string | null;
  deletedAt: string | null;
  reactions: { emoji: string; userId: string }[];
};

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

function isSpoiler(
  message: ChatMessage,
  viewerSeason: number,
  viewerEpisode: number,
): boolean {
  if (message.authorSeason == null || message.authorEpisode == null) return false;
  if (message.authorSeason > viewerSeason) return true;
  return message.authorSeason === viewerSeason && message.authorEpisode > viewerEpisode;
}

// "@Ad Soyad" geçen kısımları, o an gruptaki bilinen üye adlarıyla eşleşiyorsa
// vurgular. En uzun ada göre eşleştirir ki "@Ali" varken "@Ali Can" yanlışlıkla
// yarım kesilmesin.
function renderWithMentions(content: string, memberNames: string[]) {
  if (memberNames.length === 0) return content;
  const sorted = [...memberNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`@(${sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
  const parts: (string | { mention: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    parts.push({ mention: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));

  return parts.map((part, i) =>
    typeof part === "string" ? (
      <span key={i}>{part}</span>
    ) : (
      <span key={i} className="font-medium text-signal">
        {part.mention}
      </span>
    ),
  );
}

function ReactionBar({
  message,
  viewerId,
  onReact,
}: {
  message: ChatMessage;
  viewerId: string;
  onReact: (emoji: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const grouped = message.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});
  const mine = new Set(message.reactions.filter((r) => r.userId === viewerId).map((r) => r.emoji));

  return (
    <div className="relative mt-1.5 flex flex-wrap items-center gap-1.5">
      {Object.entries(grouped).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={`rounded-full border px-1.5 py-0.5 font-mono text-[11px] transition-colors ${
            mine.has(emoji)
              ? "border-signal bg-signal-soft text-text-primary"
              : "border-screen-line text-text-muted hover:border-signal"
          }`}
        >
          {emoji} {count}
        </button>
      ))}
      <button
        onClick={() => setPickerOpen((v) => !v)}
        aria-label="Tepki ekle"
        className="rounded-full border border-dashed border-screen-line px-1.5 py-0.5 font-mono text-[11px] text-text-faint transition-colors hover:border-signal hover:text-text-primary"
      >
        +
      </button>
      {pickerOpen && (
        <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-lg border border-screen-line bg-screen px-2 py-1.5 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)]">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(emoji);
                setPickerOpen(false);
              }}
              className="rounded p-1 text-base transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SpoilerMessage({ message }: { message: ChatMessage }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <p className="mt-0.5 text-[14px] leading-relaxed text-text-secondary">{message.content}</p>;
  }

  return (
    <button
      onClick={() => setRevealed(true)}
      className="mt-1.5 flex w-full items-center gap-2 rounded border border-dashed border-screen-line bg-screen px-3 py-2.5 text-left transition-colors hover:border-signal"
    >
      <span className="text-sm">🙈</span>
      <span className="font-mono text-xs text-text-muted">
        Spoiler olabilir — {message.authorName} senden ileride. Göstermek için tıkla.
      </span>
    </button>
  );
}

function typingLabel(names: string[]) {
  if (names.length === 1) return `${names[0]} yazıyor…`;
  if (names.length === 2) return `${names[0]} ve ${names[1]} yazıyor…`;
  return `${names[0]} ve ${names.length - 1} kişi daha yazıyor…`;
}

function MessageBody({
  message,
  isMine,
  canModerate,
  viewerSeason,
  viewerEpisode,
  memberNames,
  onEdit,
  onDelete,
  onReport,
}: {
  message: ChatMessage;
  isMine: boolean;
  canModerate: boolean;
  viewerSeason: number;
  viewerEpisode: number;
  memberNames: string[];
  onEdit: (content: string) => void;
  onDelete: () => void;
  onReport: (reason: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportReason, setReportReason] = useState("");

  if (message.deletedAt) {
    return <p className="mt-0.5 text-[14px] leading-relaxed text-text-faint italic">Mesaj silindi.</p>;
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = draft.trim();
          if (trimmed && trimmed !== message.content) onEdit(trimmed);
          setEditing(false);
        }}
        className="mt-1 flex items-center gap-2"
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(message.content);
              setEditing(false);
            }
          }}
          className="flex-1 rounded border border-signal bg-transparent px-2 py-1 text-[14px] text-text-primary outline-none"
        />
        <button type="submit" className="font-mono text-[11px] text-sync hover:text-text-primary">
          kaydet
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(message.content);
            setEditing(false);
          }}
          className="font-mono text-[11px] text-text-faint hover:text-text-primary"
        >
          vazgeç
        </button>
      </form>
    );
  }

  return (
    <div className="group/msg relative">
      {isSpoiler(message, viewerSeason, viewerEpisode) ? (
        <SpoilerMessage message={message} />
      ) : (
        <p className="mt-0.5 text-[14px] leading-relaxed text-text-secondary">
          {renderWithMentions(message.content, memberNames)}
          {message.editedAt && (
            <span className="ml-1.5 font-mono text-[10px] text-text-faint">(düzenlendi)</span>
          )}
        </p>
      )}
      <div className="absolute top-0 right-0 hidden items-center gap-1.5 group-hover/msg:flex">
        {confirmingDelete ? (
          <>
            <button
              onClick={onDelete}
              className="font-mono text-[10px] text-danger hover:text-text-primary"
            >
              sil, emin misin?
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="font-mono text-[10px] text-text-faint hover:text-text-primary"
            >
              vazgeç
            </button>
          </>
        ) : reporting ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onReport(reportReason.trim());
              setReporting(false);
              setReported(true);
            }}
            className="flex items-center gap-1.5 rounded border border-screen-line bg-screen px-2 py-1"
          >
            <input
              autoFocus
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Sebep (opsiyonel)"
              className="w-28 bg-transparent font-mono text-[10px] text-text-primary outline-none placeholder:text-text-faint"
            />
            <button type="submit" className="font-mono text-[10px] text-danger hover:text-text-primary">
              bildir
            </button>
            <button
              type="button"
              onClick={() => setReporting(false)}
              className="font-mono text-[10px] text-text-faint hover:text-text-primary"
            >
              vazgeç
            </button>
          </form>
        ) : (
          <>
            {isMine && (
              <button
                onClick={() => setEditing(true)}
                aria-label="Mesajı düzenle"
                className="font-mono text-[10px] text-text-faint hover:text-text-primary"
              >
                ✎
              </button>
            )}
            {(isMine || canModerate) && (
              <button
                onClick={() => setConfirmingDelete(true)}
                aria-label="Mesajı sil"
                className="font-mono text-[10px] text-text-faint hover:text-danger"
              >
                🗑
              </button>
            )}
            {!isMine &&
              (reported ? (
                <span className="font-mono text-[10px] text-text-faint">bildirildi</span>
              ) : (
                <button
                  onClick={() => setReporting(true)}
                  aria-label="Mesajı bildir"
                  className="font-mono text-[10px] text-text-faint hover:text-signal"
                >
                  🚩
                </button>
              ))}
          </>
        )}
      </div>
    </div>
  );
}

export function ChatPanel({
  messages,
  viewerId,
  viewerSeason,
  viewerEpisode,
  typingNames = [],
  memberNames = [],
  canModerate = false,
  onSend,
  onReact,
  onTyping,
  onEdit,
  onDelete,
  onReport,
}: {
  messages: ChatMessage[];
  viewerId: string;
  viewerSeason: number;
  viewerEpisode: number;
  typingNames?: string[];
  memberNames?: string[];
  canModerate?: boolean;
  onSend: (content: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onTyping?: () => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onReport: (messageId: string, reason: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);

  const mentionQuery = useMemo(() => {
    const match = /@(\S*)$/.exec(draft);
    return match ? match[1] : null;
  }, [draft]);

  const mentionMatches = useMemo(() => {
    if (mentionQuery == null) return [];
    return memberNames.filter((n) => n.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 5);
  }, [mentionQuery, memberNames]);

  function pickMention(name: string) {
    setDraft((prev) => prev.replace(/@(\S*)$/, `@${name} `));
    setMentionOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    onSend(content);
    setDraft("");
    setMentionOpen(false);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") setMentionOpen(false);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded border border-screen-line bg-screen-glow">
      <div className="border-b border-screen-line px-5 py-4 font-mono text-xs tracking-[0.1em] text-text-muted uppercase">
        Grup sohbeti
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-text-faint">Henüz mesaj yok. İlk mesajı sen yaz.</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-text-primary">{message.authorName}</span>
                <span className="font-mono text-[11px] tabular-nums text-text-faint">{message.time}</span>
              </div>
              <MessageBody
                message={message}
                isMine={message.authorId === viewerId}
                canModerate={canModerate}
                viewerSeason={viewerSeason}
                viewerEpisode={viewerEpisode}
                memberNames={memberNames}
                onEdit={(content) => onEdit(message.id, content)}
                onDelete={() => onDelete(message.id)}
                onReport={(reason) => onReport(message.id, reason)}
              />
              {!message.deletedAt && (
                <ReactionBar message={message} viewerId={viewerId} onReact={(emoji) => onReact(message.id, emoji)} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="h-4 px-5">
        {typingNames.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-[11px] text-text-muted italic"
          >
            {typingLabel(typingNames)}
          </motion.p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative flex gap-2 border-t border-screen-line p-3">
        {mentionOpen && mentionMatches.length > 0 && (
          <div className="absolute bottom-full left-3 z-20 mb-1 w-48 overflow-hidden rounded border border-screen-line bg-screen shadow-[0_12px_28px_-12px_rgba(0,0,0,0.7)]">
            {mentionMatches.map((name) => (
              <button
                key={name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickMention(name)}
                className="block w-full px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-signal-soft"
              >
                @{name}
              </button>
            ))}
          </div>
        )}
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setMentionOpen(true);
            onTyping?.();
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Bir şeyler yaz… (@ ile birini etiketle)"
          className="flex-1 rounded border border-screen-line bg-transparent px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-signal"
        />
        <button
          type="submit"
          className="rounded-[3px] border border-screen-line px-4 py-2 font-mono text-[13px] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft"
        >
          Gönder
        </button>
      </form>
    </div>
  );
}
