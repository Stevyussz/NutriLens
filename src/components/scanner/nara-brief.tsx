"use client";
import { useQuery } from "@tanstack/react-query";
import { requestApi } from "@/core/browser-api";
import { naraAnswerSchema } from "@/core/nara-schema";
import type { PhotoReview } from "@/core/ai/vision-contract";
import { Button } from "../ui/button";
import { NaraThinking } from "./nara-thinking";

export function NaraBrief({
  review,
  fallback,
}: {
  review: PhotoReview;
  fallback: string | null;
}) {
  const brief = useQuery({
    queryKey: [
      "nara-brief",
      review.historyId,
      review.nutrition,
      review.ingredientsText,
    ],
    enabled: Boolean(review.historyId) && review.engine !== "LOCAL_OCR",
    staleTime: Infinity,
    retry: false,
    queryFn: () =>
      requestApi("/api/ask-nara", naraAnswerSchema, {
        method: "POST",
        body: JSON.stringify({
          historyId: review.historyId,
          purpose: "brief",
          question:
            "Jelaskan singkat alasan di balik pilihan mengurangi gula ini, serta satu hal penting dari komposisi atau zat gizi lain. Jangan ulang total gula dan porsi yang sudah terlihat. Satu paragraf pendek; jangan menjamin sehat atau aman.",
        }),
      }),
  });
  return (
    <div className="nara-brief">
      {brief.isFetching && (
        <NaraThinking task="question" compact />
      )}
      {brief.data?.mode === "AI_GUIDED" ? (
        <>
          <h3 className="photo-choice-title">Kenapa pilihan ini?</h3>
          {brief.data.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
          <small>
            Penjelasan AI dari label tersimpan · periksa bacaan jika ada yang
            janggal
          </small>
        </>
      ) : (
        fallback && (
          <>
            <h3 className="photo-choice-title">Hal lain yang perlu dilihat</h3>
            <p>{fallback}</p>
          </>
        )
      )}
      {brief.isError && (
        <p>
          Penjelasan AI belum tersedia. Angka dan perhitungan label tetap bisa
          dilihat di atas.{" "}
          <Button variant="ghost" type="button" onClick={() => brief.refetch()}>
            Coba penjelasan lagi
          </Button>
        </p>
      )}
    </div>
  );
}
