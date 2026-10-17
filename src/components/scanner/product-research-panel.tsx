"use client";
import { useQuery } from "@tanstack/react-query";
import type { PhotoReview } from "@/core/ai/vision-contract";
import { productResearchSchema } from "@/core/product-research-schema";
import { requestApi } from "@/core/browser-api";
import { Button } from "../ui/button";
const date = (text: string) =>
  new Date(text).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export function ProductResearchPanel({ review }: { review: PhotoReview }) {
  const research = useQuery({
    queryKey: [
      "product-research",
      review.name,
      review.brand,
      review.servingSizeGrams,
      JSON.stringify(review.nutrition),
    ],
    queryFn: () =>
      requestApi("/api/product-research", productResearchSchema, {
        method: "POST",
        body: JSON.stringify(review),
      }),
    staleTime: 600000,
    retry: false,
  });
  const hasNutrition = Object.values(review.nutrition).some((v) => v !== null);
  const sources = research.data?.sources ?? [];
  const manufacturer = sources.find((s) => s.kind === "MANUFACTURER");
  const variants = sources.filter((s) => s.match === "NAME_VARIANT");
  return (
    <section
      className="product-research"
      aria-label="Pencarian dan validasi sumber produk"
    >
      <h2>Produk ini dikenali dari mana?</h2>
      {research.isPending ? (
        <p role="status">
          {hasNutrition
            ? "Mencari sumber produk di belakang layar. Ringkasan angka sudah bisa Anda pakai."
            : "Mencari sumber merek. Foto tabel gizi tetap diperlukan; data merek tidak mengisi angka yang belum terbaca."}
        </p>
      ) : research.error ? (
        <>
          <p role="status">
            {hasNutrition
              ? "Pencarian sumber belum berhasil. Angka pada foto tetap tersedia."
              : "Pencarian sumber belum berhasil. Ambil foto tabel gizi; angka tidak ditebak dari merek."}
          </p>
          <Button variant="ghost" onClick={() => research.refetch()}>
            Coba cari sumber lagi
          </Button>
        </>
      ) : (
        <>
          <p>
            {manufacturer
              ? "Merek ditemukan di situs produsen."
              : variants.length
                ? "Ada kandidat dengan nama varian yang serupa."
                : sources.length
                  ? "Ada catatan merek atau nama yang serupa."
                  : "Belum ada sumber yang cukup cocok."}{" "}
            Barcode kemasan belum dicocokkan, jadi ini belum membuktikan
            formulasi yang sama.
          </p>
          {manufacturer && (
            <a href={manufacturer.url} target="_blank" rel="noreferrer">
              {manufacturer.title} — sumber produsen ↗
            </a>
          )}
          {!manufacturer && variants[0] && (
            <a href={variants[0].url} target="_blank" rel="noreferrer">
              Lihat kandidat {variants[0].title} ↗
            </a>
          )}
          <details>
            <summary>
              Rincian sumber & kecocokan
              {sources.length ? ` (${sources.length})` : ""}
            </summary>
            <p>
              Foto Anda tetap menjadi sumber angka. Data internet tidak menimpa
              label, mengisi nilai kosong, atau dianggap membuktikan keamanan
              produk.
            </p>
            {research.data?.warnings.map((warning, i) => (
              <p key={i} className="research-warning">
                {warning}
              </p>
            ))}
            <ul>
              {sources.map((source) => (
                <li key={source.id}>
                  <h3>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title} ↗
                    </a>
                  </h3>
                  <p>
                    {source.kind === "MANUFACTURER"
                      ? "Produsen resmi"
                      : source.kind === "LIVE_CATALOGUE"
                        ? "Katalog komunitas, diambil langsung"
                        : "Katalog komunitas, salinan lokal"}{" "}
                    ·{" "}
                    {source.match === "NAME_VARIANT"
                      ? "nama varian serupa"
                      : source.match === "BRAND_ONLY"
                        ? "merek saja"
                        : "nama saja"}
                  </p>
                  <p>{source.excerpt}</p>
                  <ul>
                    {source.agreements.map((a, i) => (
                      <li key={`a${i}`}>{a}</li>
                    ))}
                    {source.differences.map((a, i) => (
                      <li key={`d${i}`}>{a}</li>
                    ))}
                  </ul>
                  <p className="muted">
                    Tanggal sumber/koleksi:{" "}
                    {source.sourceDate
                      ? date(source.sourceDate)
                      : "tidak tersedia"}
                    . Diperiksa: {date(source.checkedAt)}.
                  </p>
                </li>
              ))}
            </ul>
            <p>
              {research.data?.ai.mode === "DETERMINISTIC"
                ? "Pencocokan mengikuti aturan merek, varian dan satuan."
                : "AI membantu memilih sumber; aturan merek, varian dan satuan tetap memeriksa kecocokannya."}{" "}
              Pencarian ini dilakukan saat hasil dibuka, bukan arsip sumber pada
              saat foto diambil.
            </p>
          </details>
          {research.data?.status !== "FOUND" && (
            <p className="muted">
              Sebagian sumber belum dapat divalidasi. Label kemasan tetap perlu
              diutamakan.
            </p>
          )}
        </>
      )}
    </section>
  );
}
