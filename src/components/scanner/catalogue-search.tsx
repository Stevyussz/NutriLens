"use client";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestApi } from "@/core/browser-api";
import {
  catalogueOutputSchema,
  type CatalogueProduct,
} from "@/core/db/catalogue";
import { Button } from "../ui/button";
export function CatalogueSearch({
  onChoose,
}: {
  onChoose: (product: CatalogueProduct) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1);
  const catalogue = useQuery({
    queryKey: ["catalogue", query, page],
    enabled: open,
    queryFn: () =>
      requestApi(
        `/api/catalogue?q=${encodeURIComponent(query)}&page=${page}`,
        catalogueOutputSchema,
      ),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
    setPage(1);
  }
  return (
    <details
      className="catalogue-search"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Cari produk atau barcode dari katalog</summary>
      <p className="muted text-sm">
        Data komunitas untuk pasar Indonesia. Pilih label, cocokkan dengan
        kemasan, lalu lengkapi bagian kosong. Harga dimasukkan sendiri.
      </p>
      <form onSubmit={submit} className="catalogue-search-form">
        <label className="field">
          Nama produk, merek, atau barcode
          <input
            type="search"
            maxLength={100}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <Button type="submit">Cari produk</Button>
      </form>
      {catalogue.isPending ? (
        <p role="status">Memuat katalog…</p>
      ) : catalogue.error ? (
        <div>
          <p role="alert" className="error-text">
            {catalogue.error.message}
          </p>
          <Button variant="secondary" onClick={() => catalogue.refetch()}>
            Muat ulang katalog
          </Button>
        </div>
      ) : (
        catalogue.data && (
          <>
            <p className="muted text-sm">
              {catalogue.data.total.toLocaleString("id-ID")} produk cocok.
            </p>
            {!catalogue.data.entries.length && (
              <p>
                Tidak ada produk yang cocok. Anda tetap dapat memasukkan label
                sendiri.
              </p>
            )}
            <div className="catalogue-results">
              {catalogue.data.entries.map((row) => (
                <article key={row.providerCode}>
                  <h3>{row.name}</h3>
                  <p className="muted text-sm">
                    {row.brand || "Merek belum tersedia"} · {row.providerCode}
                  </p>
                  <p className="text-sm">
                    {row.referenceEligible
                      ? "Komposisi dan enam nilai gizi tersedia."
                      : `Masih ada ${row.missingFields.length} bagian yang perlu dilengkapi.`}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onChoose(row);
                      setOpen(false);
                    }}
                  >
                    Gunakan data label
                  </Button>
                  <a
                    className="text-link text-sm"
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Lihat sumber produk
                  </a>
                </article>
              ))}
            </div>
            {catalogue.data.pages > 1 && (
              <div className="pagination">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Produk sebelumnya
                </Button>
                <span>
                  {page} / {catalogue.data.pages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= catalogue.data.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Produk berikutnya
                </Button>
              </div>
            )}
          </>
        )
      )}
    </details>
  );
}
