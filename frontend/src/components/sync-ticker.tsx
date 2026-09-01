"use client";

import { motion } from "framer-motion";

export type MemberProgress = {
  id: string;
  name: string;
  avatarColor: string;
  joinedLabel: string;
  season: number;
  episode: number;
  segmentsOn: number;
  status: "sync" | "behind";
  behindBy?: number;
  online?: boolean;
};

const totalSegments = 10;

function initial(name: string) {
  return name.charAt(0).toUpperCase();
}

function Notch({ position }: { position: "top" | "bottom" }) {
  return (
    <span
      className={`absolute left-[132px] h-3 w-3 rounded-full bg-screen-glow ${
        position === "top" ? "-top-1.5" : "-bottom-1.5"
      }`}
    />
  );
}

export function SyncTicker({
  showTitle,
  showSubtitle,
  members,
}: {
  showTitle: string;
  showSubtitle: string;
  members: MemberProgress[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-screen-line bg-screen-glow shadow-[0_40px_80px_-40px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between border-b border-dashed border-screen-line px-5 py-4">
        <div className="font-mono text-xs tracking-[0.1em] text-text-caption">
          <b className="font-semibold text-guide">
            {showTitle.toLocaleUpperCase("tr-TR")}
          </b>{" "}
          · {showSubtitle.toLocaleUpperCase("tr-TR")}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-signal">
          <span className="h-1.5 w-1.5 animate-signal-pulse rounded-full bg-signal" />
          YAYINDA
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        {members.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
            className="relative flex items-stretch overflow-hidden rounded-md bg-guide text-ink shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)]"
          >
            <Notch position="top" />
            <Notch position="bottom" />

            <div className="flex flex-1 items-center gap-3 px-4 py-3">
              <div className="relative shrink-0">
                <div
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-full font-mono text-xs font-semibold text-guide"
                  style={{ background: member.avatarColor }}
                >
                  {initial(member.name)}
                </div>
                {member.online && (
                  <span
                    aria-label="Çevrimiçi"
                    className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-guide bg-sync"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 text-sm font-semibold">
                <div className="truncate">{member.name}</div>
                <small className="mt-0.5 block font-mono text-[10.5px] font-normal text-ink-soft">
                  {member.joinedLabel}
                </small>
              </div>

              <div className="hidden gap-[3px] sm:flex">
                {Array.from({ length: totalSegments }).map((_, seg) => (
                  <i
                    key={seg}
                    className="h-3.5 w-[5px] rounded-[1px]"
                    style={{
                      background:
                        seg < member.segmentsOn
                          ? member.status === "behind"
                            ? "var(--signal)"
                            : "var(--sync)"
                          : "var(--guide-edge)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex w-[132px] shrink-0 flex-col items-center justify-center gap-1.5 border-l border-dashed border-guide-edge px-3 py-3 text-center">
              <span className="font-mono text-[9px] tracking-[0.14em] text-ink-soft uppercase">Konum</span>
              <div className="font-mono text-sm font-semibold tabular-nums">
                S{String(member.season).padStart(2, "0")}·B{String(member.episode).padStart(2, "0")}
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.15 + i * 0.06 }}
                className="rounded-full px-2 py-0.5 font-mono text-[9.5px] tracking-[0.05em] whitespace-nowrap"
                style={{
                  background: member.status === "sync" ? "var(--sync-soft)" : "var(--signal-soft)",
                  color: member.status === "sync" ? "var(--sync)" : "var(--signal)",
                }}
              >
                {(member.status === "sync"
                  ? "Senkronda"
                  : member.behindBy != null
                    ? `${member.behindBy} geride`
                    : "Geride"
                ).toLocaleUpperCase("tr-TR")}
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between border-t border-dashed border-screen-line px-5 py-3 font-mono text-[11px] text-text-muted">
        <span>{members.length} üye</span>
        <span>her hareket anında yansır</span>
      </div>
    </div>
  );
}
