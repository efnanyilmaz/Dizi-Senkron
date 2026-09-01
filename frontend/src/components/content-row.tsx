"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

function ReelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="5.4" r="1.5" />
      <circle cx="17.8" cy="9.1" r="1.5" />
      <circle cx="15.7" cy="16" r="1.5" />
      <circle cx="8.3" cy="16" r="1.5" />
      <circle cx="6.2" cy="9.1" r="1.5" />
    </svg>
  );
}

function RowArrow({
  direction,
  onHoverStart,
  onHoverEnd,
  onClick,
}: {
  direction: "left" | "right";
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
}) {
  const isLeft = direction === "left";
  return (
    <button
      type="button"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      onClick={onClick}
      aria-label={isLeft ? "Geriye kaydır" : "İleri kaydır"}
      className={`absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-screen-line bg-screen text-text-muted transition-colors hover:border-signal hover:text-signal ${
        isLeft ? "-left-5" : "-right-5"
      }`}
    >
      <motion.div
        whileHover={{ rotate: isLeft ? -360 : 360 }}
        transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
      >
        <ReelIcon />
      </motion.div>
    </button>
  );
}

export function ContentRow({
  label,
  title,
  children,
  action,
}: {
  label: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [children]);

  function stopAutoScroll() {
    if (autoScrollRef.current !== null) {
      window.clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }

  // Fareyi okun üzerinde tutmak yeterli — tıklamaya gerek yok. Kenara
  // ulaşınca (scrollBy artık ilerlemeyince) otomatik duruyor.
  function startAutoScroll(direction: 1 | -1) {
    stopAutoScroll();
    autoScrollRef.current = window.setInterval(() => {
      const el = scrollRef.current;
      if (!el) return stopAutoScroll();
      const before = el.scrollLeft;
      el.scrollBy({ left: direction * 7 });
      if (el.scrollLeft === before) stopAutoScroll();
    }, 16);
  }

  useEffect(() => stopAutoScroll, []);

  function scrollByCards(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-10"
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">{label}</div>
          <h2 className="font-display text-xl text-text-primary">{title}</h2>
        </div>
        {action}
      </div>
      <div className="relative">
        <div className="overflow-hidden rounded-lg border border-screen-line">
          <div className="sprocket-strip sprocket-strip-live" />
          <div ref={scrollRef} className="no-scrollbar flex gap-4 overflow-x-auto bg-screen-glow p-4">
            {children}
          </div>
          <div className="sprocket-strip sprocket-strip-live" />
        </div>
        {canScrollLeft && (
          <RowArrow
            direction="left"
            onHoverStart={() => startAutoScroll(-1)}
            onHoverEnd={stopAutoScroll}
            onClick={() => scrollByCards(-1)}
          />
        )}
        {canScrollRight && (
          <RowArrow
            direction="right"
            onHoverStart={() => startAutoScroll(1)}
            onHoverEnd={stopAutoScroll}
            onClick={() => scrollByCards(1)}
          />
        )}
      </div>
    </motion.section>
  );
}
