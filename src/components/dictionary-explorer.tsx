"use client";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestApi } from "@/core/browser-api";
import { dictionaryOutputSchema } from "@/core/api-schemas";
import { Button } from "./ui/button";
import { IngredientAliases } from "./ingredient-aliases";
import { ingredientFunctionLabels } from "@/core/presentation";
import { ChemicalEvidence } from "./chemical-evidence";
export function DictionaryExplorer() {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);
  const dictionary = useQuery({
    queryKey: ["dictionary", query, page],
    queryFn: () =>
      requestApi(
        `/api/dictionary?q=${encodeURIComponent(query)}&page=${page}`,
        dictionaryOutputSchema,
      ),
  });
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
    setPage(1);
  }
  return (
    <>
      <form onSubmit={search} className="flex flex-wrap gap-3">
        <label className="field flex-1 min-w-0">
          Cari nama, alias atau kode
          <input
            type="search"
            name="q"
            maxLength={100}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <Button type="submit" className="self-end">
          Cari bahan
        </Button>
      </form>
      <div
        className="dictionary-suggestions"
        aria-label="Contoh pencarian bahan"
      >
        <span className="muted text-sm">Coba cari:</span>
        {["Gula", "Garam", "E621"].map((term) => (
          <Button
            key={term}
            variant="ghost"
            onClick={() => {
              setDraft(term);
              setQuery(term);
              setPage(1);
            }}
          >
            {term}
          </Button>
        ))}
        {query && (
          <Button
            variant="ghost"
            onClick={() => {
              setDraft("");
              setQuery("");
              setPage(1);
            }}
          >
            Hapus pencarian
          </Button>
        )}
      </div>
      {dictionary.isPending ? (
        <p role="status" className="py-12 muted">
          Memuat kamus bahan…
        </p>
      ) : dictionary.error ? (
        <div className="notice mt-6">
          <p role="alert" className="error-text">
            {dictionary.error.message}
          </p>
          <Button variant="secondary" onClick={() => dictionary.refetch()}>
            Muat ulang kamus
          </Button>
        </div>
      ) : !dictionary.data?.entries.length ? (
        <div className="empty-state mt-6">
          <h2>Tidak ada bahan yang cocok</h2>
          <p className="muted">Periksa ejaan atau coba kode INS/E-number.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setQuery("");
              setDraft("");
              setPage(1);
            }}
          >
            Tampilkan seluruh kamus
          </Button>
        </div>
      ) : (
        <>
          <p className="muted text-sm mt-6">
            {dictionary.data.total} entri cocok
            {query ? ` untuk “${query}”` : ""}. Nilai GI yang belum memiliki
            sumber spesifik tidak ditampilkan sebagai angka.
          </p>
          <div className="dictionary-list">
            {dictionary.data.entries.map((c) => (
              <details className="dictionary-entry" key={c.canonicalName}>
                <summary>
                  <h2 className="capitalize">{c.canonicalName}</h2>
                  <p className="muted text-sm mb-2">
                    {ingredientFunctionLabels[c.functionalCategory]}
                    {c.insOrECode ? ` · ${c.insOrECode}` : ""}
                  </p>
                </summary>
                <p>{c.plainExplanation}</p>
                <IngredientAliases
                  aliases={c.aliases}
                  canonicalName={c.canonicalName}
                />
                <ChemicalEvidence chemical={c} />
                {c.triggersConditions.length > 0 && (
                  <p className="status status-WASPADA">
                    Perhatikan dalam profil: {c.triggersConditions.join(", ")}
                  </p>
                )}
                <div className="mt-4">
                  <a
                    className="text-link text-sm"
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Baca referensi
                  </a>
                </div>
              </details>
            ))}
          </div>
          <div className="pagination">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <span className="muted text-sm">
              {page} / {dictionary.data.pages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= dictionary.data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </>
      )}
    </>
  );
}
