"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText, Camera, ClipboardList } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { requestApi } from "@/core/browser-api";
import { presetOutputSchema } from "@/core/api-schemas";
import { analysisSchema } from "@/core/analysis-schema";
import { categorySchema, productSchema } from "@/core/db/collections";
import { parseIngredients } from "@/core/ai/local-parser";
import { decimal, rupiah } from "@/core/utils";
import { claimStatusLabels, profileStatusLabels } from "@/core/presentation";
import { Button } from "../ui/button";
import { XRayIngredientCard } from "./XRayIngredientCard";
import { SugarSplittingChart } from "./SugarSplittingChart";
import { ParetoSwapMatrix } from "./ParetoSwapMatrix";
const nutrientLabels = [
  ["caloriesKcal", "Energi (kkal)"],
  ["sugarGrams", "Gula (g)"],
  ["proteinGrams", "Protein (g)"],
  ["sodiumMg", "Natrium (mg)"],
  ["saturatedFatGrams", "Lemak jenuh (g)"],
  ["fiberGrams", "Serat (g)"],
] as const;
export function ScannerConsole() {
  const [mode, setMode] = useState<"label" | "text" | "photo">("label");
  const [activeCase, setActiveCase] = useState("");
  const [formError, setFormError] = useState("");
  const [labelExpanded, setLabelExpanded] = useState(false);
  const reducedMotion = useReducedMotion();
  const presets = useQuery({
    queryKey: ["presets"],
    queryFn: () => requestApi("/api/products/preset", presetOutputSchema),
  });
  const scan = useMutation({
    mutationFn: (body: object | FormData) =>
      requestApi("/api/scan", analysisSchema, {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setActiveCase("");
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "photo") {
        const body = new FormData();
        const file = form.get("image");
        if (!(file instanceof File) || !file.size)
          throw new Error("Pilih foto label terlebih dahulu.");
        body.set("image", file);
        scan.mutate(body);
        return;
      }
      if (mode === "text") {
        scan.mutate({ text: String(form.get("text")) });
        return;
      }
      const product = productSchema.parse({
        barcode: `manual-${crypto.randomUUID()}`,
        name: String(form.get("name")),
        brand: String(form.get("brand")),
        category: form.get("category"),
        priceIdr: Number(form.get("price")),
        servingSizeGrams: Number(form.get("serving")),
        flavorTags: String(form.get("tags"))
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
        nutrition: Object.fromEntries(
          nutrientLabels.map(([key]) => [key, Number(form.get(key))]),
        ),
        novaGroup: 1,
        marketingClaims: String(form.get("claims"))
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean),
        orderedIngredients: parseIngredients(String(form.get("ingredients"))),
        source: {
          kind: "USER_INPUT",
          url: null,
          retrievedAt: new Date().toISOString(),
          note: "Disalin oleh pengguna dari label. Verifikasi kembali semua angka dan satuan.",
        },
        priceSource: "USER_INPUT",
        priceSourceUrl: null,
      });
      scan.mutate({ product });
    } catch (error) {
      setFormError(
        error instanceof Error && !("issues" in error)
          ? error.message
          : "Periksa kelengkapan label, batas angka dan satuan yang dimasukkan.",
      );
    }
  }
  const result = scan.data;
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);
  return (
    <div className={`scanner-layout${result ? " has-result" : ""}`}>
      <section className="panel scanner-entry" id="label-entry" tabIndex={-1}>
        <p className="eyebrow">Mulai dari kemasan Anda</p>
        <h2>Masukkan label Anda</h2>
        <div className="tab-switch" aria-label="Cara memasukkan label">
          {[
            {
              id: "label" as const,
              label: "Label lengkap",
              Icon: ClipboardList,
              hint: "Salin angka gizi",
            },
            {
              id: "text" as const,
              label: "Teks bebas",
              Icon: FileText,
              hint: "Tempel isi label",
            },
            {
              id: "photo" as const,
              label: "Foto kemasan",
              Icon: Camera,
              hint: "Unggah foto",
            },
          ].map(({ id, label, Icon, hint }) => (
            <Button
              key={id}
              variant="ghost"
              aria-pressed={mode === id}
              aria-label={label}
              disabled={scan.isPending}
              onClick={() => {
                setMode(id);
                if (id === "label") setLabelExpanded(true);
                setFormError("");
                setActiveCase("");
                scan.reset();
              }}
            >
              <Icon size={18} aria-hidden />
              <span>
                <strong>{label}</strong>
                <small aria-hidden>{hint}</small>
              </span>
            </Button>
          ))}
        </div>
        {mode === "label" && !labelExpanded && (
          <div className="entry-start">
            <h3>Label pertama Anda menunggu</h3>
            <p className="muted">
              Salin komposisi dan gizi per sajian dari kemasan Anda.
            </p>
            <Button onClick={() => setLabelExpanded(true)}>
              Isi informasi kemasan
            </Button>
            <p className="muted text-sm mt-4 mb-0">
              Belum punya kemasan? Coba contoh analisis di halaman ini.
            </p>
          </div>
        )}
        <form
          onSubmit={submit}
          hidden={mode === "label" && !labelExpanded}
          aria-busy={scan.isPending}
        >
          <fieldset
            className="form-grid"
            hidden={mode !== "label"}
            disabled={mode !== "label" || scan.isPending}
          >
            <legend className="form-section-title">
              Identitas dan isi kemasan
            </legend>
            <label className="field full">
              Nama produk
              <input name="name" required maxLength={250} />
            </label>
            <label className="field">
              Merek
              <input name="brand" maxLength={150} />
            </label>
            <label className="field">
              Kategori
              <select name="category">
                {categorySchema.options.map((c) => (
                  <option key={c} value={c}>
                    {c.replaceAll("_", " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Harga per sajian (Rp)
              <input
                type="number"
                name="price"
                min={1}
                max={10000000}
                required
              />
            </label>
            <label className="field">
              Ukuran sajian (g/ml)
              <input
                type="number"
                name="serving"
                min={0.1}
                max={10000}
                step="any"
                required
              />
            </label>
            <label className="field full">
              Komposisi sesuai urutan, pisahkan dengan koma
              <textarea
                name="ingredients"
                rows={3}
                required
                maxLength={15000}
              />
            </label>
            <p className="form-section-title full">Informasi gizi per sajian</p>
            {nutrientLabels.map(([key, label]) => (
              <label key={key} className="field">
                {label}, per sajian
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
                  required
                />
              </label>
            ))}
            <label className="field full">
              Rasa atau fungsi, pisahkan dengan koma
              <input name="tags" maxLength={500} />
            </label>
            <label className="field full">
              Klaim kemasan (opsional), pisahkan dengan titik koma
              <input name="claims" maxLength={1000} />
            </label>
          </fieldset>
          <fieldset
            hidden={mode !== "text"}
            disabled={mode !== "text" || scan.isPending}
          >
            <label className="field full">
              Salin nama, komposisi dan seluruh informasi gizi
              <textarea
                name="text"
                required
                minLength={20}
                maxLength={20000}
                rows={8}
              />
              <span className="muted">
                Teks bebas diproses Gemini. Mode lokal menerima format satu
                field per baris. Jangan sertakan data pribadi.
              </span>
            </label>
          </fieldset>
          <fieldset
            hidden={mode !== "photo"}
            disabled={mode !== "photo" || scan.isPending}
          >
            <label className="field full">
              Foto komposisi dan informasi gizi
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                name="image"
                required
              />
              <span className="muted">
                JPEG, PNG, WEBP, maksimal 5 MB. Isi file diperiksa sebelum
                diproses.
              </span>
            </label>
          </fieldset>
          {mode !== "label" && !presets.data?.aiAvailable && (
            <p className="notice mt-4">
              Gemini belum diaktifkan. Gunakan Label lengkap, studi kasus, atau
              teks dengan baris Nama, Kategori, Harga, Sajian, Energi, Gula,
              Protein, Natrium, Lemak jenuh, Serat dan Komposisi. Pisahkan nama
              field dan nilainya dengan tanda titik dua.
            </p>
          )}
          <Button className="mt-6" type="submit" disabled={scan.isPending}>
            {scan.isPending ? "Memeriksa komposisi…" : "Periksa label ini"}
          </Button>
          {formError && (
            <p role="alert" className="error-text mt-3">
              {formError}
            </p>
          )}
        </form>
        {scan.isPending && (
          <div className="notice mt-6 mb-0" role="status">
            Memeriksa komposisi dan mencari pembanding. Hasil akan tampil di
            bawah.
            <div className="scan-progress">
              <motion.div
                animate={reducedMotion ? { x: 0 } : { x: ["-100%", "300%"] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>
          </div>
        )}
        {scan.error && (
          <p className="error-text mt-4 mb-0" role="alert">
            {scan.error.message}
          </p>
        )}
      </section>
      {result && (
        <div
          className="scan-results"
          aria-live="polite"
          aria-busy={scan.isPending}
        >
          <section className="result-header">
            <p className={`status status-${result.aiVerdict.medicalStatus}`}>
              {profileStatusLabels[result.aiVerdict.medicalStatus]}
            </p>
            <div className="result-heading-row">
              <h2 ref={resultHeading} tabIndex={-1}>
                {result.extractedProductData.name}
              </h2>
              <div className="result-actions">
                <a className="button button-secondary" href="#label-entry">
                  Periksa label lain
                </a>
                <a className="button button-ghost" href="#contoh-analisis">
                  Contoh lainnya
                </a>
              </div>
            </div>
            <nav
              className="result-navigation"
              aria-label="Telusuri hasil analisis"
            >
              <a href="#komposisi">Komposisi</a>
              <a href="#sumber-gula">Sumber gula</a>
              <a href="#pilihan-pengganti">Pilihan pengganti</a>
            </nav>
            <p>{result.aiVerdict.explanation}</p>
            <p className="muted text-sm">
              {result.extractedProductData.source.note}
            </p>
            {result.extractedProductData.source.url && (
              <a
                href={result.extractedProductData.source.url}
                target="_blank"
                rel="noreferrer"
                className="text-link text-sm"
              >
                Sumber label produk
              </a>
            )}
            <dl className="metric-strip">
              <div>
                <dt>Gula / sajian</dt>
                <dd>
                  {decimal(result.extractedProductData.nutrition.sugarGrams)}{" "}
                  <span className="text-base">g</span>
                </dd>
              </div>
              <div>
                <dt>Natrium / sajian</dt>
                <dd>
                  {decimal(result.extractedProductData.nutrition.sodiumMg)}{" "}
                  <span className="text-base">mg</span>
                </dd>
              </div>
              <div>
                <dt>Protein / sajian</dt>
                <dd>
                  {decimal(result.extractedProductData.nutrition.proteinGrams)}{" "}
                  <span className="text-base">g</span>
                </dd>
              </div>
              <div>
                <dt>
                  Harga / sajian{" "}
                  {result.extractedProductData.priceSource === "ESTIMATE"
                    ? "(estimasi)"
                    : ""}
                </dt>
                <dd className="!text-2xl">
                  {rupiah(result.extractedProductData.priceIdr)}
                </dd>
              </div>
            </dl>
            <div className="notice">
              {result.notice}
              <details className="mt-2">
                <summary>Rincian analisis</summary>
                <p className="muted text-sm mb-0">
                  {result.cacheHit ? "Cache sesuai profil" : "Analisis baru"} ·{" "}
                  {decimal(result.executionTimeMs)} ms · NOVA{" "}
                  {result.extractedProductData.novaGroup} (heuristik) · Klaim:{" "}
                  {claimStatusLabels[result.aiVerdict.claimStatus]}
                </p>
              </details>
            </div>
          </section>
          <div className="result-grid">
            <XRayIngredientCard analysis={result} />
            <SugarSplittingChart analysis={result} />
          </div>
          <section className="panel">
            <h2>Konteks populasi pembanding</h2>
            <p>
              Persentil gula:{" "}
              {result.percentiles.sugarPercentileRank ?? "belum tersedia"} ·
              Persentil natrium:{" "}
              {result.percentiles.sodiumPercentileRank ?? "belum tersedia"} ·
              Populasi: {result.percentiles.population} label.
            </p>
            <p className="muted text-sm">{result.percentiles.basis}</p>
            <p className="muted text-sm mb-0">
              Biaya per gram protein:{" "}
              {result.nutritionScore.costPerGramProteinIdr === null
                ? "Tidak dihitung, protein nol"
                : rupiah(result.nutritionScore.costPerGramProteinIdr)}
              . Proksi GL gula:{" "}
              {result.nutritionScore.sugarOnlyGlycemicLoadProxy === null
                ? "Tidak dihitung, GI spesifik belum terverifikasi"
                : decimal(result.nutritionScore.sugarOnlyGlycemicLoadProxy)}
              .
            </p>
          </section>
          <ParetoSwapMatrix analysis={result} />
        </div>
      )}
      <aside className="panel sample-panel" id="contoh-analisis" tabIndex={-1}>
        <p className="eyebrow">Belajar dari contoh</p>
        <h2>Coba contoh analisis</h2>
        <p className="muted text-sm">
          Pilih contoh untuk melihat cara kerja pemeriksaan. Resep dan gizi
          bersifat ilustratif, bukan klaim tentang merek riil.
        </p>
        {presets.isPending ? (
          <p role="status">Memuat studi kasus…</p>
        ) : presets.error ? (
          <div>
            <p role="alert" className="error-text">
              {presets.error.message}
            </p>
            <Button variant="secondary" onClick={() => presets.refetch()}>
              Muat ulang studi kasus
            </Button>
          </div>
        ) : !presets.data?.presets.length ? (
          <p className="muted">
            Contoh analisis belum tersedia. Anda tetap dapat memasukkan label
            sendiri.
          </p>
        ) : (
          <div className="preset-list">
            {presets.data.presets.map((p, i) => (
              <button
                key={p.id}
                className="preset-button"
                disabled={scan.isPending}
                aria-pressed={activeCase === p.id}
                onClick={() => {
                  setActiveCase(p.id);
                  setFormError("");
                  scan.mutate({ presetId: p.id });
                }}
              >
                <span className="preset-number">0{i + 1}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
