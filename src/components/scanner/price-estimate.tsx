"use client";
import { useQuery } from "@tanstack/react-query";
import type { PhotoReview } from "@/core/ai/vision-contract";
import { priceEstimateSchema } from "@/core/price-estimate-schema";
import { requestApi } from "@/core/browser-api";
import { rupiah } from "@/core/utils";
import { Button } from "../ui/button";
export function PriceEstimate({ review }: { review: PhotoReview }) {
  const price = useQuery({
    queryKey: [
      "price-estimate",
      review.name,
      review.brand,
      review.servingSizeGrams,
      review.servingsPerContainer,
      review.evidence.servingText,
    ],
    queryFn: () =>
      requestApi("/api/price-estimate", priceEstimateSchema, {
        method: "POST",
        body: JSON.stringify(review),
      }),
    staleTime: 900000,
    retry: false,
  });
  const data = price.data;
  return (
    <section
      className="price-estimate result-section"
      aria-label="Estimasi harga kemasan"
    >
      <h2>Estimasi harga kemasan</h2>
      {price.isPending ? (
        <p role="status">
          Nara sedang memeriksa sumber harga dan menyiapkan kisaran. Hasil gizi
          sudah bisa Anda baca.
        </p>
      ) : price.error ? (
        <>
          <p role="status">
            Estimasi belum berhasil dimuat. Angka gizi tetap tersedia.
          </p>
          <Button variant="ghost" onClick={() => price.refetch()}>
            Coba estimasi harga lagi
          </Button>
        </>
      ) : (
        data && (
          <>
            {data.mode !== "UNAVAILABLE" && (
              <p className="price-estimate-amount">
                {data.lowIdr === data.highIdr
                  ? rupiah(data.lowIdr!)
                  : `${rupiah(data.lowIdr!)}–${rupiah(data.highIdr!)}`}{" "}
                <span>{data.packageText}</span>
              </p>
            )}
            <p>
              {data.mode === "AI_ESTIMATE"
                ? "Perkiraan Nara · belum terverifikasi toko"
                : data.mode === "SOURCED_ESTIMATE"
                  ? "Kisaran dari observasi harga bersumber"
                  : "Kisaran harga belum tersedia"}
            </p>
            <details>
              <summary>Dasar estimasi & sumber harga</summary>
              <p className="muted text-sm">{data.note}</p>
              <p className="muted text-sm">
                {data.internetStatus === "CHECKED"
                  ? "API publik Open Prices diperiksa. Cakupannya terbatas pada observasi rupiah yang tersedia, bukan seluruh toko."
                  : data.internetStatus === "UNAVAILABLE"
                    ? "Sumber harga online belum dapat diakses. Perkiraan AI bukan hasil pencarian toko yang berhasil."
                    : "Nama dan ukuran kemasan perlu jelas sebelum mencari harga."}
              </p>
              {data.mode === "AI_ESTIMATE" && (
                <p className="muted text-sm">
                  Kisaran ini berasal dari model AI, tanpa bukti harga produk
                  yang cocok. Tidak digunakan untuk menetapkan batas anggaran
                  atau mengklaim penghematan.
                </p>
              )}
              {data.sources.map((source) => (
                <p key={source.url} className="muted text-sm">
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {rupiah(source.priceIdr)} · observasi {source.date}
                  </a>
                  <br />
                  {source.location}
                </p>
              ))}
              <p className="muted text-sm">
                Diperiksa{" "}
                {new Date(data.checkedAt).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                })}{" "}
                WIB.
              </p>
            </details>
            {data.mode === "UNAVAILABLE" && (
              <Button
                variant="ghost"
                disabled={price.isFetching}
                onClick={() => price.refetch()}
              >
                {price.isFetching ? "Memeriksa…" : "Coba estimasi harga lagi"}
              </Button>
            )}
          </>
        )
      )}
    </section>
  );
}
