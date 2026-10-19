"use client";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestApi } from "@/core/browser-api";
import {
  photoAlternativesSchema,
  type PhotoAlternative,
  type PhotoAlternatives,
} from "@/core/photo-alternatives-schema";
import { priceEstimateSchema } from "@/core/price-estimate-schema";
import type { PhotoReview } from "@/core/ai/vision-contract";
import { decimal, rupiah } from "@/core/utils";
import { Button } from "../ui/button";
export function usePhotoAlternatives(review: PhotoReview) {
  return useQuery({
    queryKey: [
      "photo-alternatives",
      review.historyId,
      review.nutrition,
      review.ingredientsText,
    ],
    enabled: Boolean(review.historyId),
    staleTime: 300000,
    retry: false,
    queryFn: () =>
      requestApi("/api/photo-alternatives", photoAlternativesSchema, {
        method: "POST",
        body: JSON.stringify({ historyId: review.historyId }),
      }),
  });
}
export function AlternativesHint({
  data,
  onOpen,
}: {
  data?: PhotoAlternatives;
  onOpen: () => void;
}) {
  if (!data || !["FOUND", "ALLERGY_ALERT"].includes(data.status)) return null;
  return (
    <div className="alternatives-hint">
      <p>
        {data.status === "FOUND"
          ? `Untuk gula lebih sedikit, pertimbangkan ${data.candidates[0].name}.`
          : data.title}
      </p>
      <Button variant="ghost" onClick={onOpen}>
        {data.status === "FOUND"
          ? `Lihat ${data.candidates.length} pilihan pembanding`
          : "Lihat hal yang perlu dihindari"}
      </Button>
    </div>
  );
}
function AlternativePrice({
  candidate,
  historyId,
}: {
  candidate: PhotoAlternative;
  historyId: string;
}) {
  const price = useQuery({
    queryKey: ["alternative-price", historyId, candidate.id],
    enabled: candidate.packageQuantity !== null,
    staleTime: 900000,
    retry: false,
    queryFn: () =>
      requestApi("/api/photo-alternatives/price", priceEstimateSchema, {
        method: "POST",
        body: JSON.stringify({ historyId, candidateId: candidate.id }),
      }),
  });
  if (candidate.packageQuantity === null)
    return (
      <p className="muted">
        Harga belum dapat ditaksir: ukuran satu kemasan belum tersedia pada
        sumber.
      </p>
    );
  if (price.isPending)
    return (
      <p role="status">
        Menyiapkan estimasi harga untuk {decimal(candidate.packageQuantity)}{" "}
        {candidate.packageUnit}…
      </p>
    );
  if (price.isError)
    return (
      <p>
        Estimasi harga belum tersedia.{" "}
        <Button variant="ghost" onClick={() => price.refetch()}>
          Coba harga lagi
        </Button>
      </p>
    );
  const p = price.data;
  return (
    <div className="alternative-price">
      <p>
        {p.mode === "UNAVAILABLE"
          ? "Estimasi harga belum tersedia"
          : `${p.mode === "AI_ESTIMATE" ? "Perkiraan AI" : "Kisaran harga bersumber"}: ${rupiah(p.lowIdr!)}${p.lowIdr !== p.highIdr ? `–${rupiah(p.highIdr!)}` : ""} / ${p.packageText}`}
      </p>
      <details>
        <summary>Dasar harga & keterbatasan</summary>
        <p>{p.note}</p>
        {p.sources.map((s) => (
          <p key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              Observasi {s.date} · {s.location}
            </a>
          </p>
        ))}
      </details>
    </div>
  );
}
function Candidate({
  candidate: p,
  historyId,
}: {
  candidate: PhotoAlternative;
  historyId: string;
}) {
  return (
    <article className="alternative-row">
      <h3>{p.name}</h3>
      <p className="muted">{p.brand} · pembanding sejenis</p>
      <p>
        Gula pada label{" "}
        <strong>{decimal(p.reductionPercent)}% lebih sedikit</strong> pada
        ukuran yang sama.
      </p>
      <dl className="alternative-numbers">
        <div>
          <dt>
            Gula / {decimal(p.comparisonSize)} {p.unit}
          </dt>
          <dd>
            {decimal(p.sugarGrams)} g{" "}
            <span>dibanding {decimal(p.originalSugarGrams)} g</span>
          </dd>
        </div>
        <div>
          <dt>
            Natrium / {decimal(p.comparisonSize)} {p.unit}
          </dt>
          <dd>
            {p.sodiumMg === null
              ? "Belum tersedia"
              : `${decimal(p.sodiumMg)} mg`}
          </dd>
        </div>
      </dl>
      <AlternativePrice candidate={p} historyId={historyId} />
      <details>
        <summary>Kekurangan & sumber data</summary>
        {p.tradeoffs.map((t) => (
          <p key={t}>{t}</p>
        ))}
        <p>
          <a href={p.sourceUrl} target="_blank" rel="noreferrer">
            {p.sourceKind === "OWN_SCAN"
              ? "Foto di riwayatmu"
              : p.sourceKind === "LIVE_CATALOGUE"
                ? "Katalog internet"
                : "Katalog tersimpan"}{" "}
            · {new Date(p.sourceDate).toLocaleDateString("id-ID")}
          </a>
        </p>
        <p>
          Belum menjamin formula sama, bebas alergen, stok tersedia, atau lebih
          sehat dalam semua hal.
        </p>
      </details>
    </article>
  );
}
export function AlternativesPanel({
  query,
  historyId,
  onScan,
}: {
  query: ReturnType<typeof usePhotoAlternatives>;
  historyId?: string;
  onScan: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.focus();
  }, []);
  if (!historyId)
    return (
      <section
        ref={panel}
        tabIndex={-1}
        id="pilihan-pengganti"
        className="photo-detail"
      >
        <h2>Simpan hasil scan terlebih dahulu.</h2>
        <p>Rekomendasi memakai hasil dan profil yang tersimpan bersama scan.</p>
      </section>
    );
  if (query.isPending)
    return (
      <section
        ref={panel}
        tabIndex={-1}
        id="pilihan-pengganti"
        className="photo-detail"
      >
        <h2>Mencari pembanding yang sesuai</h2>
        <p role="status">
          Memeriksa jenis produk, ukuran dan sumber angka gizinya. Ringkasan
          hasil scan tetap bisa dibuka.
        </p>
      </section>
    );
  if (query.isError)
    return (
      <section
        ref={panel}
        tabIndex={-1}
        id="pilihan-pengganti"
        className="photo-detail"
      >
        <h2>Pembanding belum berhasil dimuat.</h2>
        <p>
          Hasil scan tetap tersedia. Coba lagi atau foto label produk lain di
          rak.
        </p>
        <Button onClick={() => query.refetch()}>Cari pembanding lagi</Button>
        <Button variant="ghost" onClick={onScan}>
          Scan produk lain
        </Button>
      </section>
    );
  const data = query.data;
  return (
    <section
      ref={panel}
      tabIndex={-1}
      id="pilihan-pengganti"
      className="photo-detail alternatives-panel"
      aria-label="Pilihan produk pembanding"
    >
      <h2>{data.title}</h2>
      <p>{data.action}</p>
      {data.comparison && data.candidates.length > 0 && (
        <p className="muted">
          Semua angka dibandingkan pada {decimal(data.comparison.size)}{" "}
          {data.comparison.unit}, bukan membandingkan dua ukuran sajian yang
          berbeda.
        </p>
      )}
      {data.candidates[0] && (
        <Candidate candidate={data.candidates[0]} historyId={historyId} />
      )}
      {data.candidates.length > 1 && (
        <details className="more-alternatives">
          <summary>Lihat {data.candidates.length - 1} pilihan lain</summary>
          {data.candidates.slice(1).map((p) => (
            <Candidate key={p.id} candidate={p} historyId={historyId} />
          ))}
        </details>
      )}
      <Button variant="secondary" onClick={onScan}>
        Scan label pembanding di rak
      </Button>
      <details className="shopping-lessons">
        <summary>Bekal memilih saat belanja</summary>
        {data.lessons.map((l) => (
          <div key={l.title}>
            <h3>{l.title}</h3>
            <p>{l.text}</p>
          </div>
        ))}
        <a
          href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet"
          target="_blank"
          rel="noreferrer"
        >
          Prinsip pola makan WHO
        </a>
      </details>
      <details>
        <summary>Cakupan pencarian & keterbatasan</summary>
        {data.warnings.map((w) => (
          <p key={w}>{w}</p>
        ))}
        <p>
          Urutan mempertimbangkan gula lebih rendah dan pertukaran zat gizi yang
          diketahui; bukan skor kesehatan atau jaminan termurah. Harga perkiraan
          tidak dipakai sebagai bukti harga pasar.
        </p>
        <Button variant="ghost" onClick={() => query.refetch()}>
          Perbarui pembanding
        </Button>
      </details>
    </section>
  );
}
