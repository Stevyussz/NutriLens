"use client";
import { useEffect, useRef, useState } from "react";
/** Indeterminate reading motion: no invented progress or internal reasoning transcript. */
export function NaraThinking({
  task = "photo",
  compact = false,
}: {
  task?: "photo" | "analysis" | "question";
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let visible = true;
    const update = () => setPaused(document.hidden || !visible);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    if (ref.current) {
      observer.observe(ref.current);
      if (!compact) {
        const box = ref.current.getBoundingClientRect();
        if (box.bottom > window.innerHeight || box.top < 0)
          ref.current.scrollIntoView({ block: "center", behavior: "instant" });
      }
    }
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [compact]);
  const title =
    task === "photo"
      ? "Nara sedang membaca label"
      : task === "analysis"
        ? "Nara menyiapkan penjelasan"
        : "Nara mencari konteks jawaban";
  return (
    <div
      ref={ref}
      className={`nara-thinking${compact ? " nara-thinking-compact" : ""}`}
      data-paused={paused || undefined}
      role="status"
      aria-live="polite"
    >
      <span className="nara-reading-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <b />
      </span>
      <div>
        <strong>{title}</strong>
        <p>
          {task === "photo"
            ? "Angka, porsi, dan komposisi diperiksa bersama. Hasil langsung muncul setelah bacaan siap."
            : task === "analysis"
              ? "Mencocokkan bahan dengan kamus dan aturan profil Anda."
              : "Jawaban tetap mengacu pada label ini dan fakta yang tersedia."}
        </p>
      </div>
    </div>
  );
}
