"use client";
import { LiveCamera } from "./live-camera";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Camera, ClipboardList, ScanLine } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { requestApi } from "@/core/browser-api";
import { presetOutputSchema } from "@/core/api-schemas";
import { QuickVerdict } from "./quick-verdict";
import Link from "next/link";
import { historyDetailSchema } from "@/core/history-schema";
import { profileOutputSchema } from "@/core/api-schemas";
import { analysisSchema } from "@/core/analysis-schema";
import { photoReviewSchema, type PhotoReview } from "@/core/ai/vision-contract";
import type { CatalogueProduct } from "@/core/db/catalogue";
import { CatalogueSearch } from "./catalogue-search";
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
export function ScannerConsole({ historyId }: { historyId?: string }) {
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: ["history-detail", historyId],
    queryFn: () =>
      requestApi(
        `/api/history/${encodeURIComponent(historyId!)}`,
        historyDetailSchema,
      ),
    enabled: Boolean(historyId),
  });
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => requestApi("/api/profile", profileOutputSchema),
  });
  const [mode, setMode] = useState<"label" | "text" | "photo">("photo");
  const [workspace, setWorkspace] = useState<"entry" | "examples" | "result">(
    "entry",
  );
  const [detail, setDetail] = useState<
    "overview" | "ingredients" | "sugar" | "swaps"
  >("overview");
  const [editorSection, setEditorSection] = useState<"identity" | "nutrition">(
    "identity",
  );
  const [photos, setPhotos] = useState<File[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const selectedFiles = photos.map((file) => file.name);
  const [activeCase, setActiveCase] = useState("");
  const [formError, setFormError] = useState("");
  const [labelExpanded, setLabelExpanded] = useState(false);
  const [review, setReview] = useState<PhotoReview | null>(null);
  const [catalogueDraft, setCatalogueDraft] = useState<CatalogueProduct | null>(
    null,
  );
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedPhotos = useRef<File[]>([]);
  useEffect(
    () => () => photoPreviews.forEach((url) => URL.revokeObjectURL(url)),
    [photoPreviews],
  );
  const reducedMotion = useReducedMotion();
  const presets = useQuery({
    queryKey: ["presets"],
    queryFn: () => requestApi("/api/products/preset", presetOutputSchema),
  });
  const scan = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setWorkspace("result");
      setDetail("overview");
    },
    mutationFn: (body: object | FormData) =>
      requestApi("/api/scan", analysisSchema, {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),
  });
  const extraction = useMutation({
    mutationFn: (body: FormData) =>
      requestApi("/api/extract", photoReviewSchema, { method: "POST", body }),
    onSuccess: (draft) => {
      const form = formRef.current;
      if (!form) return;
      const values = {
        name: draft.name,
        brand: draft.brand,
        category: draft.category,
        serving: draft.servingSizeGrams ?? "",
        price: "",
        ingredients: draft.ingredientsText,
        tags: "",
        claims: "",
        ...draft.nutrition,
      };
      for (const [name, value] of Object.entries(values)) {
        const input = form.elements.namedItem(name);
        if (
          input instanceof HTMLInputElement ||
          input instanceof HTMLTextAreaElement ||
          input instanceof HTMLSelectElement
        )
          input.value = value === null ? "" : String(value);
      }
      setPhotoPreviews(
        submittedPhotos.current.map((file) => URL.createObjectURL(file)),
      );
      setWorkspace("entry");
      setEditorSection(draft.name ? "nutrition" : "identity");
      setReview(draft);
      setCatalogueDraft(null);
      setReviewConfirmed(false);
      setMode("label");
      setLabelExpanded(true);
      scan.reset();
      requestAnimationFrame(() =>
        form
          .querySelector<HTMLInputElement>(
            draft.name
              ? `[name="${draft.servingSizeGrams === null ? "serving" : (nutrientLabels.find(([key]) => draft.nutrition[key] === null)?.[0] ?? "caloriesKcal")}"]`
              : '[name="name"]',
          )
          ?.focus(),
      );
    },
  });
  const busy = scan.isPending || extraction.isPending;
  function chooseCatalogue(draft: CatalogueProduct) {
    const form = formRef.current;
    if (!form) return;
    const values = {
      name: draft.name,
      brand: draft.brand,
      category: draft.category,
      serving: draft.servingSizeGrams ?? "",
      price: "",
      ingredients: draft.ingredientsText,
      tags: "",
      claims: "",
      ...draft.nutrition,
    };
    for (const [name, value] of Object.entries(values)) {
      const element = form.elements.namedItem(name);
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
      )
        element.value = value === null ? "" : String(value);
    }
    setEditorSection("nutrition");
    setCatalogueDraft(draft);
    setReview(null);
    setReviewConfirmed(false);
    setMode("label");
    setLabelExpanded(true);
    scan.reset();
    setFormError("");
    requestAnimationFrame(() =>
      form.querySelector<HTMLInputElement>('[name="price"]')?.focus(),
    );
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setActiveCase("");
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "photo") {
        const body = new FormData();
        const files = photos;
        if (
          !files.length ||
          files.length > 2 ||
          files.some((file) => !(file instanceof File) || !file.size)
        )
          throw new Error("Pilih foto label terlebih dahulu.");
        for (const file of files as File[]) body.append("image", file);
        submittedPhotos.current = files as File[];
        extraction.mutate(body);
        return;
      }
      if (mode === "label") {
        const invalid = event.currentTarget.querySelector<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >(
          "input:not(:disabled):invalid,textarea:not(:disabled):invalid,select:not(:disabled):invalid",
        );
        if (invalid) {
          const disclosure = invalid.closest("details");
          const section = invalid
            .closest("details")
            ?.getAttribute("data-editor");
          if (section === "identity" || section === "nutrition")
            setEditorSection(section);
          requestAnimationFrame(() => {
            if (disclosure) disclosure.open = true;
            invalid.focus();
            invalid.reportValidity();
          });
          return;
        }
      }
      if (mode === "label" && (review || catalogueDraft) && !reviewConfirmed)
        throw new Error(
          "Cocokkan hasil pembacaan dengan foto, lalu centang konfirmasi sebelum analisis.",
        );
      if (mode === "text") {
        scan.mutate({ text: String(form.get("text")) });
        return;
      }
      const product = productSchema.parse({
        barcode: `manual-${crypto.randomUUID()}`,
        name: String(form.get("name")),
        brand: String(form.get("brand")),
        category: form.get("category"),
        priceIdr: String(form.get("price") ?? "").trim()
          ? Number(form.get("price"))
          : null,
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
  const result = scan.data ?? history.data?.result;
  const summaryHealth = scan.data
    ? profile.data?.healthProfile
    : (history.data?.healthProfile ?? profile.data?.healthProfile);
  useEffect(() => {
    if (history.data) {
      setWorkspace("result");
      setDetail("overview");
    }
  }, [history.data]);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (result && workspace === "result") resultHeading.current?.focus();
  }, [result, workspace]);
  function showEntry() {
    setWorkspace("entry");
    requestAnimationFrame(() =>
      document.getElementById("label-entry")?.focus(),
    );
  }
  function showExamples() {
    setWorkspace("examples");
    requestAnimationFrame(() =>
      document.getElementById("contoh-analisis")?.focus(),
    );
  }
  useEffect(() => {
    const change = () => {
      const hash = location.hash;
      const value =
        hash === "#hasil-ringkas"
          ? "overview"
          : hash === "#komposisi"
            ? "ingredients"
            : hash === "#sumber-gula"
              ? "sugar"
              : hash === "#pilihan-pengganti"
                ? "swaps"
                : null;
      if (value) {
        setWorkspace("result");
        setDetail(value);
      }
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return (
    <div className={`scanner-layout${result ? " has-result" : ""}`}>
      <nav className="workspace-switch" aria-label="Ruang pemeriksaan">
        <button aria-pressed={workspace === "entry"} onClick={showEntry}>
          <Camera size={18} aria-hidden />
          Scan label
        </button>
        <button aria-pressed={workspace === "examples"} onClick={showExamples}>
          Contoh analisis
        </button>
        <button
          aria-pressed={workspace === "result"}
          disabled={!result}
          onClick={() => setWorkspace("result")}
        >
          Hasil{result && <span className="result-ready" />}
        </button>
      </nav>
      <section
        className="panel scanner-entry"
        id="label-entry"
        tabIndex={-1}
        hidden={workspace !== "entry"}
      >
        <p className="eyebrow">Baca label dari foto</p>
        <h2>
          {review && mode === "label"
            ? "Periksa hasil bacaan."
            : "Arahkan ke labelnya."}
        </h2>
        <div className="tab-switch" aria-label="Cara memasukkan label">
          {[
            {
              id: "photo" as const,
              label: "Foto kemasan",
              Icon: Camera,
              hint: "Fitur utama",
            },
            {
              id: "label" as const,
              label: "Label lengkap",
              Icon: ClipboardList,
              hint: "Isi atau koreksi",
            },
            {
              id: "text" as const,
              label: "Teks label",
              Icon: FileText,
              hint: "Tempel tulisan",
            },
          ].map(({ id, label, Icon, hint }) => (
            <Button
              key={id}
              variant="ghost"
              aria-pressed={mode === id}
              aria-label={label}
              disabled={busy}
              onClick={() => {
                setMode(id);
                if (id === "label") setLabelExpanded(true);
                setFormError("");
                extraction.reset();
                setActiveCase("");
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
              Belum punya kemasan? Buka tab Contoh analisis.
            </p>
          </div>
        )}
        {review && mode === "label" && (
          <section
            className="ocr-review"
            aria-label="Tinjau hasil pembacaan foto"
          >
            <h3>Cocokkan dengan foto Anda</h3>
            <div className="draft-brief">
              <strong>Terbaca dari foto, belum dikonfirmasi</strong>
              <p>
                Gula{" "}
                {review.nutrition.sugarGrams === null
                  ? "belum terbaca"
                  : `${decimal(review.nutrition.sugarGrams)} g`}{" "}
                · Natrium{" "}
                {review.nutrition.sodiumMg === null
                  ? "belum terbaca"
                  : `${decimal(review.nutrition.sodiumMg)} mg`}{" "}
                / sajian.
              </p>
            </div>
            <p className="muted text-sm">
              Pembaca:{" "}
              {review.engine === "LOCAL_OCR"
                ? "OCR lokal"
                : ["GEMINI_CROSSCHECKED", "ROUTER_CROSSCHECKED"].includes(
                      review.engine,
                    )
                  ? `${review.engine.startsWith("ROUTER") ? "Vision 9Router" : "Gemini"} dengan pemeriksaan OCR lokal`
                  : review.engine === "ROUTER_VISION"
                    ? "Vision 9Router"
                    : "Gemini"}
              . {review.providerNotice}
            </p>
            <p>
              Periksa nama, kolom gizi, ukuran sajian dan urutan komposisi. Isi
              bagian gizi yang kosong sebelum menganalisis. Harga bersifat
              opsional.
            </p>
            <div className="photo-previews">
              {photoPreviews.map((url, index) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt={`Foto label ${index + 1} yang diunggah`}
                  />
                  <span>Buka foto {index + 1}</span>
                </a>
              ))}
            </div>
            {review.issues.length > 0 && (
              <details open>
                <summary>
                  Bagian yang perlu diperiksa ({review.issues.length})
                </summary>
                <ul>
                  {review.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </details>
            )}
            <details>
              <summary>Teks terbaca dan konversi satuan</summary>
              <p>
                Judul kolom: {review.evidence.basisText ?? "Belum terbaca"}.
                Sajian: {review.evidence.servingText ?? "Belum terbaca"}.
              </p>
              <dl>
                {nutrientLabels.map(([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>
                      {review.evidence.nutritionText[key] ?? "Belum terbaca"}
                    </dd>
                  </div>
                ))}
              </dl>
              {review.conversions.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </details>
            {review.rawText && (
              <details>
                <summary>Teks OCR lokal untuk dicocokkan</summary>
                <pre className="ocr-raw-text">{review.rawText}</pre>
              </details>
            )}
          </section>
        )}
        {catalogueDraft && mode === "label" && (
          <div className="notice mb-6">
            <p className="font-semibold">
              Cocokkan data katalog dengan kemasan Anda.
            </p>
            <p className="text-sm">
              {catalogueDraft.name}.{" "}
              {catalogueDraft.missingFields.length
                ? `${catalogueDraft.missingFields.length} bagian belum tersedia pada data sumber.`
                : "Komposisi dan gizi tersedia; pastikan varian dan ukuran sajiannya sama."}{" "}
              Harga per sajian perlu Anda masukkan.
            </p>
            <a
              className="text-link"
              href={catalogueDraft.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Buka label sumber
            </a>
          </div>
        )}
        <form
          ref={formRef}
          onSubmit={submit}
          noValidate={mode === "label"}
          hidden={mode === "label" && !labelExpanded}
          aria-busy={busy}
          onChange={(event) => {
            if (
              event.target instanceof HTMLInputElement &&
              event.target.name === "ocr-confirmation"
            )
              return;
            setReviewConfirmed(false);
          }}
        >
          <fieldset
            className="form-grid"
            hidden={mode !== "label"}
            disabled={mode !== "label" || busy}
          >
            <legend className="sr-only">Informasi label untuk diperiksa</legend>
            <details
              className="label-form-section full"
              data-editor="identity"
              open={editorSection === "identity"}
              onToggle={(e) => {
                if (e.currentTarget.open) setEditorSection("identity");
              }}
            >
              <summary>01 · Identitas & komposisi</summary>
              <div className="form-grid">
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
                <label className="field full">
                  Komposisi sesuai urutan, pisahkan dengan koma
                  <textarea
                    name="ingredients"
                    rows={3}
                    required
                    maxLength={15000}
                  />
                </label>
              </div>
            </details>
            <details
              className="label-form-section full"
              data-editor="nutrition"
              open={editorSection === "nutrition"}
              onToggle={(e) => {
                if (e.currentTarget.open) setEditorSection("nutrition");
              }}
            >
              <summary>02 · Gizi per sajian & harga</summary>
              <div className="form-grid nutrition-fields">
                <label className="field">
                  Harga per sajian (Rp)
                  <input type="number" name="price" min={1} max={10000000} />
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
                <details className="full optional-label-fields">
                  <summary>Tambahkan rasa atau klaim kemasan</summary>
                  <label className="field full">
                    Rasa atau fungsi, pisahkan dengan koma
                    <input name="tags" maxLength={500} />
                  </label>
                  <label className="field full">
                    Klaim kemasan (opsional), pisahkan dengan titik koma
                    <input name="claims" maxLength={1000} />
                  </label>
                </details>
              </div>
            </details>
          </fieldset>
          <fieldset hidden={mode !== "text"} disabled={mode !== "text" || busy}>
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
                Teks label diproses pembaca AI yang terhubung. Mode lokal
                menerima format satu field per baris. Jangan sertakan data
                pribadi.
              </span>
            </label>
          </fieldset>
          <fieldset
            className="photo-entry"
            hidden={mode !== "photo"}
            disabled={mode !== "photo" || busy}
          >
            <LiveCamera
              active={mode === "photo" && workspace === "entry" && !busy}
              files={photos}
              onCapture={(file) =>
                setPhotos((current) => [...current, file].slice(0, 2))
              }
              onRemove={(index) => {
                setPhotos((current) => current.filter((_, i) => i !== index));
                if (photoInput.current) photoInput.current.value = "";
              }}
              onGallery={() => {
                setGalleryOpen(true);
                photoInput.current?.click();
              }}
            />
            <details
              className="gallery-picker"
              open={galleryOpen}
              onToggle={(event) => setGalleryOpen(event.currentTarget.open)}
            >
              <summary>Galeri & format foto</summary>
              <label className="field full photo-picker">
                Foto komposisi dan informasi gizi
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  name="image"
                  multiple
                  onChange={(event) =>
                    setPhotos(Array.from(event.target.files ?? []))
                  }
                />
                {selectedFiles.length > 0 && (
                  <span className="selected-files">
                    {selectedFiles.length} foto dipilih ·{" "}
                    {selectedFiles.join(", ")}
                  </span>
                )}
                <span className="muted">
                  Pilih satu atau dua foto produk yang sama: komposisi dan gizi.
                  JPEG, PNG, WEBP, maksimal 5 MB per foto. Hasilnya diperiksa
                  dahulu sebelum analisis.
                </span>
              </label>
            </details>
          </fieldset>
          {mode === "text" && !presets.data?.aiAvailable && (
            <p className="notice mt-4">
              Pembaca AI belum terhubung. Gunakan Label lengkap, studi kasus,
              atau teks dengan baris Nama, Kategori, Harga, Sajian, Energi,
              Gula, Protein, Natrium, Lemak jenuh, Serat dan Komposisi. Pisahkan
              nama field dan nilainya dengan tanda titik dua.
            </p>
          )}
          {(review || catalogueDraft) && mode === "label" && (
            <label className="ocr-confirmation">
              <input
                name="ocr-confirmation"
                type="checkbox"
                required
                checked={reviewConfirmed}
                onChange={(event) => setReviewConfirmed(event.target.checked)}
              />
              Saya sudah mencocokkan angka, satuan, dan komposisi dengan kemasan
              atau foto.
            </label>
          )}
          <Button
            className={`mt-6 ${mode === "photo" && photos.length > 0 ? "camera-submit-ready" : ""}`}
            type="submit"
            disabled={busy || (mode === "photo" && photos.length === 0)}
          >
            {extraction.isPending
              ? "Membaca foto…"
              : scan.isPending
                ? "Memeriksa komposisi…"
                : mode === "photo"
                  ? "Baca foto label"
                  : (review || catalogueDraft) && mode === "label"
                    ? "Analisis label yang sudah diperiksa"
                    : "Periksa label ini"}
          </Button>
          {formError && (
            <p role="alert" className="error-text mt-3">
              {formError}
            </p>
          )}
        </form>
        <CatalogueSearch onChoose={chooseCatalogue} />
        {extraction.isPending && (
          <p className="notice mt-4" role="status">
            Membaca teks pada foto. Tahap berikutnya adalah memeriksa hasil dan
            bagian yang belum terbaca.
          </p>
        )}
        {extraction.error && (
          <p className="error-text mt-4" role="alert">
            {extraction.error.message}
          </p>
        )}
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
      {historyId && history.isPending && (
        <p role="status">Memuat hasil tersimpan…</p>
      )}
      {history.error && (
        <div>
          <p role="alert" className="error-text">
            {history.error.message}
          </p>
          <Button onClick={() => history.refetch()}>Muat ulang riwayat</Button>
        </div>
      )}
      {result && (
        <div
          className="scan-results"
          aria-live="polite"
          aria-busy={scan.isPending}
          hidden={workspace !== "result"}
        >
          <section className="result-header">
            <p className={`status status-${result.aiVerdict.medicalStatus}`}>
              {profileStatusLabels[result.aiVerdict.medicalStatus]}
            </p>
            <div className="result-heading-row">
              <h1 ref={resultHeading} tabIndex={-1}>
                {result.extractedProductData.name}
              </h1>
            </div>
            {!scan.data && history.data && (
              <p className="history-restored">
                Hasil tersimpan ·{" "}
                {new Date(history.data.createdAt).toLocaleDateString("id-ID")} ·
                memakai profil saat itu.{" "}
                <Link href="/history">Kembali ke riwayat</Link>
              </p>
            )}
            {detail === "overview" && summaryHealth && (
              <QuickVerdict
                result={result}
                health={summaryHealth}
                onSwaps={() => setDetail("swaps")}
              />
            )}
            <nav
              className="result-navigation"
              aria-label="Telusuri hasil analisis"
            >
              <a
                href="#hasil-ringkas"
                aria-current={detail === "overview" ? "page" : undefined}
                onClick={() => setDetail("overview")}
              >
                Ringkasan
              </a>
              <a
                href="#komposisi"
                aria-current={detail === "ingredients" ? "page" : undefined}
                onClick={() => setDetail("ingredients")}
              >
                Komposisi
              </a>
              <a
                href="#sumber-gula"
                aria-current={detail === "sugar" ? "page" : undefined}
                onClick={() => setDetail("sugar")}
              >
                Sumber gula
              </a>
              <a
                href="#pilihan-pengganti"
                aria-current={detail === "swaps" ? "page" : undefined}
                onClick={() => setDetail("swaps")}
              >
                Pilihan pengganti
              </a>
            </nav>
            <div className="result-actions">
              <a
                className="button button-secondary"
                href="#label-entry"
                onClick={showEntry}
              >
                Periksa label lain
              </a>
              <a
                className="button button-ghost"
                href="#contoh-analisis"
                onClick={showExamples}
              >
                Contoh lainnya
              </a>
            </div>
            <details className="result-more" hidden={detail !== "overview"}>
              <summary>Gizi lengkap, sumber & penjelasan</summary>
              <details
                className="result-verdict"
                hidden={detail !== "overview"}
              >
                <summary>Penjelasan lebih rinci</summary>
                <p>{result.aiVerdict.explanation}</p>
              </details>
              <details className="result-provenance">
                <summary>Asal label dan batas pembacaan</summary>
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
              </details>
              <details
                className="nutrition-detail"
                hidden={detail !== "overview"}
              >
                <summary>Angka gizi & harga lainnya</summary>
                <dl className="metric-strip">
                  {(
                    [
                      ["caloriesKcal", "Energi / sajian", "kkal"],
                      ["saturatedFatGrams", "Lemak jenuh / sajian", "g"],
                      ["fiberGrams", "Serat / sajian", "g"],
                    ] as const
                  ).map(([key, label, unit]) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>
                        {decimal(result.extractedProductData.nutrition[key])}{" "}
                        <span className="text-base">{unit}</span>
                      </dd>
                    </div>
                  ))}

                  <div>
                    <dt>Gula / sajian</dt>
                    <dd>
                      {decimal(
                        result.extractedProductData.nutrition.sugarGrams,
                      )}{" "}
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
                      {decimal(
                        result.extractedProductData.nutrition.proteinGrams,
                      )}{" "}
                      <span className="text-base">g</span>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Harga / sajian{" "}
                      {result.extractedProductData.priceIdr !== null &&
                      result.extractedProductData.priceSource === "ESTIMATE"
                        ? "(estimasi)"
                        : ""}
                    </dt>
                    <dd className="!text-2xl">
                      {rupiah(result.extractedProductData.priceIdr)}
                    </dd>
                  </div>
                </dl>
              </details>
              <details className="notice" hidden={detail !== "overview"}>
                <summary>Sumber analisis & keterbatasan</summary>
                <p>{result.notice}</p>
                <details className="mt-2">
                  <summary>Rincian analisis</summary>
                  <p className="muted text-sm mb-0">
                    {result.cacheHit ? "Cache sesuai profil" : "Analisis baru"}{" "}
                    · {decimal(result.executionTimeMs)} ms · NOVA{" "}
                    {result.extractedProductData.novaGroup} (heuristik) · Klaim:{" "}
                    {claimStatusLabels[result.aiVerdict.claimStatus]}
                  </p>
                </details>
              </details>
            </details>
          </section>
          <div className="result-detail" hidden={detail !== "ingredients"}>
            <XRayIngredientCard analysis={result} />
          </div>
          <div className="result-detail" hidden={detail !== "sugar"}>
            <SugarSplittingChart analysis={result} />
          </div>
          <details
            className="panel population-detail"
            hidden={detail !== "overview"}
          >
            <summary>Konteks populasi pembanding</summary>
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
                ? "Tidak dihitung, harga belum diisi atau protein nol"
                : rupiah(result.nutritionScore.costPerGramProteinIdr)}
              . Proksi GL gula:{" "}
              {result.nutritionScore.sugarOnlyGlycemicLoadProxy === null
                ? "Tidak dihitung, GI spesifik belum terverifikasi"
                : decimal(result.nutritionScore.sugarOnlyGlycemicLoadProxy)}
              .
            </p>
          </details>
          <div className="result-detail" hidden={detail !== "swaps"}>
            <ParetoSwapMatrix analysis={result} />
          </div>
        </div>
      )}
      <aside
        className="panel sample-panel"
        id="contoh-analisis"
        tabIndex={-1}
        hidden={workspace !== "examples"}
      >
        {scan.isPending && (
          <p className="notice" role="status">
            Memeriksa contoh dan mencari pembanding…
          </p>
        )}
        {scan.error && (
          <p className="error-text" role="alert">
            {scan.error.message}
          </p>
        )}
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
                disabled={busy}
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
