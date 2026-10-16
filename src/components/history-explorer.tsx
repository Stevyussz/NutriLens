"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { historyListSchema } from "@/core/history-schema";
import { requestApi, successSchema } from "@/core/browser-api";
import { profileStatusLabels } from "@/core/presentation";
import { decimal } from "@/core/utils";
import { Button } from "./ui/button";
export function HistoryExplorer() {
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const client = useQueryClient();
  const history = useQuery({
    queryKey: ["history", page],
    queryFn: () => requestApi(`/api/history?page=${page}`, historyListSchema),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      requestApi(`/api/history/${id}`, successSchema, { method: "DELETE" }),
    onSuccess: () => {
      setDeleting(null);
      client.invalidateQueries({ queryKey: ["history"] });
    },
  });
  return (
    <section className="history-content">
      {history.isPending ? (
        <p role="status">Memuat riwayat Anda…</p>
      ) : history.error ? (
        <div>
          <p role="alert" className="error-text">
            {history.error.message}
          </p>
          <Button onClick={() => history.refetch()}>Coba lagi</Button>
        </div>
      ) : !history.data?.items.length ? (
        <div className="history-empty">
          <h2>Belum ada hasil tersimpan</h2>
          <p>
            Hasil analisis yang selesai akan tersimpan di sini. Foto kemasan
            tidak disimpan.
          </p>
          <Link className="button button-primary" href="/scanner">
            Scan label pertama
          </Link>
        </div>
      ) : (
        <>
          <p className="muted text-sm">
            {history.data.total} hasil tersimpan · hingga 100 hasil terbaru.
            Mengulang label dan profil yang sama memperbarui hasil sebelumnya.
          </p>
          <div className="history-list">
            {history.data.items.map((item) => (
              <article key={item.id} className="history-row">
                <div>
                  <p className="history-date">
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Jakarta",
                    }).format(new Date(item.createdAt))}{" "}
                    WIB{item.illustrative ? " · Contoh ilustratif" : ""}
                  </p>
                  <h2>
                    <Link href={`/scanner?history=${item.id}`}>
                      {item.name}
                    </Link>
                  </h2>
                  <p className={`status status-${item.status}`}>
                    {profileStatusLabels[item.status]}
                  </p>
                  <p className="muted text-sm">
                    Per sajian: gula {decimal(item.sugarGrams)} g · natrium{" "}
                    {decimal(item.sodiumMg)} mg
                  </p>
                </div>
                <div className="history-actions">
                  <Link
                    className="button button-secondary"
                    href={`/scanner?history=${item.id}`}
                  >
                    Baca hasil
                  </Link>
                  {deleting === item.id ? (
                    <>
                      <span>Hapus hasil ini?</span>
                      <Button
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(item.id)}
                      >
                        Ya, hapus
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleting(null)}>
                        Batal
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => setDeleting(item.id)}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {remove.error && (
            <p role="alert" className="error-text">
              {remove.error.message}
            </p>
          )}
          <div className="pagination">
            <Button
              variant="secondary"
              disabled={history.data.page <= 1}
              onClick={() => setPage(history.data.page - 1)}
            >
              Sebelumnya
            </Button>
            <span>
              {history.data.page} / {history.data.pages}
            </span>
            <Button
              variant="secondary"
              disabled={history.data.page >= history.data.pages}
              onClick={() => setPage(history.data.page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </>
      )}
      <p className="muted text-sm mt-6">
        Riwayat mengikuti akun atau sesi sementara Anda. Buat akun untuk
        mengaksesnya kembali setelah sesi berakhir. Hasil lama memakai profil
        dan sumber saat analisis dilakukan.
      </p>
    </section>
  );
}
