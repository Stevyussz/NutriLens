"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { photoReviewSchema, type PhotoReview } from "@/core/ai/vision-contract";
import type { HealthProfile } from "@/core/db/collections";
import { photoDecision, photoDisplayName } from "@/core/photo-decision";
import { requestApi } from "@/core/browser-api";
import { ingredientFunctionLabels } from "@/core/presentation";
import { decimal } from "@/core/utils";
import { NaraBrief } from "./nara-brief";
import { AskNara } from "./ask-nara";
import { PriceEstimate } from "./price-estimate";
import { ProductResearchPanel } from "./product-research-panel";
import {
  usePhotoAlternatives,
  AlternativesHint,
  AlternativesPanel,
} from "./photo-alternatives";
import { Button } from "../ui/button";
const fields = [
  ["sugarGrams", "Gula", "g"],
  ["sodiumMg", "Natrium", "mg"],
  ["caloriesKcal", "Energi", "kkal"],
  ["proteinGrams", "Protein", "g"],
  ["saturatedFatGrams", "Lemak jenuh", "g"],
  ["fiberGrams", "Serat", "g"],
] as const;
type Detail = "overview" | "ingredients" | "sugar" | "swaps";
export function PhotoResult({
  review,
  health,
  detail,
  onDetail,
  onNew,
  onEdit,
  onUpdate,
}: {
  review: PhotoReview;
  health?: HealthProfile;
  detail: Detail;
  onDetail: (detail: Detail) => void;
  onNew: () => void;
  onEdit: () => void;
  onUpdate: (review: PhotoReview) => void;
}) {
  const decision = photoDecision(review, health);
  const alternatives = usePhotoAlternatives(review);
  const heading = useRef<HTMLHeadingElement>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const save = useMutation({
    mutationFn: (draft: PhotoReview) =>
      requestApi("/api/photo-summary", photoReviewSchema, {
        method: "POST",
        body: JSON.stringify(draft),
      }),
    onSuccess: (draft) => {
      onUpdate(draft);
      setEditing(false);
    },
  });
  const serving =
    review.servingSizeGrams === null
      ? "satu sajian (ukuran belum pasti)"
      : review.evidence.servingText || "satu sajian pada label";
  const value = (key: (typeof fields)[number][0]) =>
    review.nutrition[key] === null
      ? "Tidak tersedia"
      : `${decimal(review.nutrition[key]!)} ${fields.find((f) => f[0] === key)![2]}`;
  return (
    <section
      id="hasil-ringkas"
      className="scan-results photo-result"
      aria-label="Hasil cepat foto label"
    >
      <header className="result-header">
        <h1 ref={heading} tabIndex={-1}>
          {photoDisplayName(review)}
        </h1>
        <p className="photo-result-origin">
          {review.userCorrected
            ? "Bacaan dengan koreksi Anda"
            : review.engine === "LOCAL_OCR"
              ? "Bacaan OCR lama"
              : "Dibaca dengan vision"}{" "}
          · per {serving} · bisa dikoreksi
        </p>
        {detail === "overview" && (
          <section
            className="quick-verdict"
            aria-labelledby="photo-decision-title"
          >
            <h2 id="photo-decision-title">{decision.title}</h2>
            <p className="quick-action">{decision.action}</p>
            <AlternativesHint
              data={alternatives.data}
              onOpen={() => onDetail("swaps")}
            />
            <NaraBrief review={review} fallback={decision.takeaway} />
            <dl className="quick-numbers">
              <div>
                <dt>Gula / {decision.amountBasis}</dt>
                <dd>
                  {decision.displaySugar === null
                    ? "Belum pasti"
                    : `${decimal(decision.displaySugar)} g`}
                </dd>
              </div>
              <div>
                <dt>Natrium / {decision.amountBasis}</dt>
                <dd>
                  {decision.displaySodium === null
                    ? "Belum pasti"
                    : `${decimal(decision.displaySodium)} mg`}
                </dd>
              </div>
            </dl>
            <p className="photo-pack">{decision.portionNote}</p>
            <details className="photo-profile-context">
              <summary>Gulanya berasal dari apa?</summary>
              <p>{decision.ingredientInsights.summary}</p>
              <p>{decision.ingredientInsights.accounting}</p>
              {decision.ingredientInsights.sweeteners.length > 0 && (
                <p>
                  Pemanis yang dikenali:{" "}
                  {decision.ingredientInsights.sweeteners.join(", ")}. Pemanis
                  bukan otomatis gram gula; jenis dan jumlahnya tetap perlu
                  dibedakan.
                </p>
              )}
              <a
                href="https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label"
                target="_blank"
                rel="noreferrer"
              >
                Perbedaan gula total dan tambahan · FDA
              </a>
            </details>
            {!review.ingredientsText && (
              <p className="photo-result-limit">
                Komposisi belum terlihat. Alergen dan asal gula belum dapat
                dipastikan.
              </p>
            )}
            <details className="photo-profile-context">
              <summary>Dasar penjelasan & acuan profil</summary>
              {decision.meaning && <p>{decision.meaning}</p>}
              <p>
                Gula pada tabel adalah gula total. Label ini belum memisahkan
                gula alami, gula tambahan, dan gula bebas.
              </p>
              <p>
                Perbandingan sendok hanya menggambarkan berat gula, memakai
                perkiraan WHO: 50 g sekitar 12 sendok teh rata. Bukan takaran
                gula yang pasti ditambahkan ke produk.
              </p>
              {health && (
                <p>
                  Profil saat scan memakai acuan{" "}
                  {decimal(health.dailySugarLimitGrams)} g gula dan{" "}
                  {decimal(health.dailySodiumLimitMg)} mg natrium per hari. Satu
                  sajian label ini setara{" "}
                  {decision.sugarPercent === null
                    ? "gula belum diketahui"
                    : `${decision.sugarPercent}% acuan gula`}{" "}
                  dan{" "}
                  {decision.sodiumPercent === null
                    ? "natrium belum diketahui"
                    : `${decision.sodiumPercent}% acuan natrium`}
                  . Ini bukan perhitungan sisa jatah makan hari ini.
                </p>
              )}
              <a
                href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet"
                target="_blank"
                rel="noreferrer"
              >
                Dasar perbandingan gula WHO
              </a>
            </details>
            <div className="photo-result-actions">
              <Button onClick={onNew}>
                {decision.needsVision
                  ? "Scan ulang dengan vision"
                  : !decision.hasNutrition
                    ? "Foto tabel gizi"
                    : review.nutrition.sugarGrams === null
                      ? "Foto ulang baris gula"
                      : "Scan produk pembanding"}
              </Button>
              <Button variant="ghost" onClick={() => setEditing((v) => !v)}>
                Koreksi angka bila perlu
              </Button>
            </div>
          </section>
        )}
        <nav className="result-navigation" aria-label="Telusuri hasil foto">
          {[
            ["overview", "Ringkasan", "hasil-ringkas"],
            ["ingredients", "Komposisi", "komposisi"],
            ["sugar", "Sumber gula", "sumber-gula"],
            ["swaps", "Pilihan pengganti", "pilihan-pengganti"],
          ].map(([id, label, hash]) => (
            <a
              key={id}
              href={`#${hash}`}
              aria-current={detail === id ? "page" : undefined}
              onClick={() => onDetail(id as Detail)}
            >
              {label}
            </a>
          ))}
        </nav>
        {detail === "ingredients" && (
          <section className="photo-detail">
            <h2>Komposisi yang terlihat</h2>
            <p>
              {review.ingredientsText ||
                "Daftar komposisi belum ada pada foto. Tidak perlu menyalin semuanya untuk membaca ringkasan gula di atas."}
            </p>
            {decision.ingredientInsights.recognized.length > 0 && (
              <ul>
                {decision.ingredientInsights.recognized.map((ingredient) => (
                  <li key={ingredient.name}>
                    {ingredient.name} ·{" "}
                    {ingredient.name === "laktosa"
                      ? "Gula susu · asal alami/tambahan belum dipastikan"
                      : ingredientFunctionLabels[ingredient.category]}
                  </li>
                ))}
              </ul>
            )}
            <p>
              Pemetaan nama bahan tidak memastikan jumlah atau risiko pada kadar
              yang digunakan. Bahan yang belum dikenal kamus bisa terlewat; nama
              kimia saja bukan bukti berbahaya.
            </p>
            <Button variant="secondary" onClick={onNew}>
              Tambahkan foto komposisi
            </Button>
            {review.ingredientsText && (
              <Button variant="ghost" onClick={onEdit}>
                Buka analisis komposisi lengkap
              </Button>
            )}
          </section>
        )}
        {detail === "sugar" && (
          <section className="photo-detail">
            <h2>Berapa gulanya?</h2>
            <p>
              {review.nutrition.sugarGrams === null
                ? "Baris gula belum dapat dipastikan. Foto ulang bagian itu; Anda tidak perlu mengisi semua gizi."
                : `Label menyebut ${value("sugarGrams")} gula per ${serving}.`}
            </p>
            <p>
              Angka gram gula berasal dari tabel gizi. Jumlah nama seperti gula,
              sirup, atau madu dalam komposisi bukan ukuran gram gula.
            </p>
            <p>{decision.ingredientInsights.summary}</p>
          </section>
        )}
        {detail === "swaps" && (
          <AlternativesPanel
            query={alternatives}
            historyId={review.historyId}
            onScan={onNew}
          />
        )}
        {editing && (
          <form
            className="photo-correction"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const nutrition = { ...review.nutrition };
              for (const [key] of fields) {
                const raw = String(data.get(key) ?? "").trim();
                nutrition[key] = raw ? Number(raw) : null;
              }
              save.mutate({
                ...review,
                userCorrected: true,
                name: String(data.get("name") || review.name),
                nutrition,
                issues: review.issues.filter(
                  (i) =>
                    !fields.some(
                      ([key, label]) =>
                        nutrition[key] !== null && i.startsWith(`${label}:`),
                    ),
                ),
              });
            }}
          >
            <h2>Koreksi hanya yang berbeda</h2>
            <p>
              Kosong tetap berarti tidak tersedia. Harga, serat, atau komposisi
              yang tidak tercantum tidak perlu dikarang.
            </p>
            <label className="field">
              Nama produk
              <input name="name" defaultValue={review.name} maxLength={250} />
            </label>
            <div className="form-grid">
              {fields.map(([key, label, unit]) => (
                <label className="field" key={key}>
                  {label} ({unit}), per sajian
                  <input
                    type="number"
                    name={key}
                    min={0}
                    max={
                      key === "sodiumMg"
                        ? 100000
                        : key === "caloriesKcal"
                          ? 10000
                          : 1000
                    }
                    step="any"
                    defaultValue={review.nutrition[key] ?? ""}
                  />
                </label>
              ))}
            </div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Menyimpan…" : "Simpan koreksi"}
            </Button>
          </form>
        )}
        {save.error && (
          <p role="alert">Koreksi belum tersimpan. {save.error.message}</p>
        )}
        <details className="photo-facts">
          <summary>Gizi lain & arti istilahnya</summary>
          <dl>
            {fields.slice(2).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{value(key)}</dd>
              </div>
            ))}
          </dl>
          <p>
            Natrium adalah komponen garam; angka ini bukan berat garam. Lemak
            jenuh adalah jenis lemak yang perlu dibatasi dalam pola makan.
            Energi menunjukkan kalori per sajian.
          </p>
          <p>
            Gizi yang tidak tersedia tidak dianggap nol dan tidak menghalangi
            ringkasan angka yang terbaca.
          </p>
          <a
            href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet"
            target="_blank"
            rel="noreferrer"
          >
            Panduan pola makan WHO
          </a>
        </details>
        <details className="photo-evidence">
          <summary>Lihat bacaan asli & batas hasil</summary>
          <p>
            Kolom: {review.evidence.basisText || "belum pasti"}. Sajian:{" "}
            {review.evidence.servingText || "belum tersedia"}.
          </p>
          {review.visionReview && (
            <>
              <p>{review.visionReview.notice}</p>
              {review.visionReview.differences.map((d) => (
                <p key={d.field}>
                  {fields.find((f) => f[0] === d.field)?.[1]}: bacaan visual
                  pertama {d.first || "belum terbaca"}; bacaan ulang{" "}
                  {d.second || "belum terbaca"}. Nilai akhir belum dipilih.
                </p>
              ))}
            </>
          )}
          {review.issues.length > 0 && (
            <ul>
              {review.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          )}
          {review.conversions.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
          <p>
            Angka berikut adalah transkripsi awal. Ringkasan hanya memakai angka
            yang lolos pemeriksaan satuan, porsi, dan konflik bacaan.
          </p>
          <dl>
            {fields.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {review.evidence.nutritionText[key] ||
                    "Tidak tersedia pada bacaan"}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            {review.providerNotice} Bacaan otomatis dapat salah. Jika satu angka
            meragukan, foto ulang bagian tersebut atau koreksi hanya angka itu.
          </p>
        </details>
        <PriceEstimate review={review} />
        <AskNara
          key={review.historyId || JSON.stringify(review.nutrition)}
          historyId={review.historyId}
        />
        <ProductResearchPanel review={review} />
        <p className="photo-history">
          {review.historyId ? (
            <Link href="/history">
              Tersimpan di riwayat pribadi · baca lagi nanti →
            </Link>
          ) : (
            <Button
              variant="ghost"
              disabled={save.isPending}
              onClick={() => save.mutate(review)}
            >
              Simpan ke riwayat
            </Button>
          )}
        </p>
      </header>
    </section>
  );
}
