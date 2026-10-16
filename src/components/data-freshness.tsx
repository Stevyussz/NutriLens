import { getDb } from "@/core/db/client";
import { getDataStatus } from "@/core/db/data-status";
export async function DataFreshness({
  compact = false,
}: {
  compact?: boolean;
}) {
  const status = await getDataStatus(await getDb());
  const date = (value: string | Date) =>
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(value));
  return (
    <details
      className="data-coverage"
      open={
        !compact &&
        (!status.production ||
          status.stale ||
          status.refreshStatus === "FAILED")
      }
    >
      <summary>
        {compact &&
        (!status.production ||
          status.stale ||
          status.refreshStatus === "FAILED")
          ? "Status sumber: perlu diperiksa"
          : "Status pembaruan data"}
      </summary>
      <div className="coverage-body freshness-body">
        <p>
          {status.refreshStatus === "FAILED"
            ? "Percobaan pembaruan terbaru belum berhasil. Periksa tanggal sumber di bawah; data belum dapat disebut terbaru."
            : status.refreshStatus === "RUNNING"
              ? "Pembaruan sedang diperiksa. Data baru dipakai setelah validasi."
              : "Pembaruan sumber dijadwalkan setiap 24 jam selama layanan pembaruan berjalan."}
        </p>
        {!status.production && (
          <p>
            Referensi katalog belum disinkronkan dengan server produksi
            penyedia. Snapshot saat ini berasal dari salinan pengujian penyedia
            (staging).
          </p>
        )}
        {status.stale && (
          <p>
            Setidaknya satu sumber sudah lebih dari 72 jam. Periksa kembali
            label dan harga dari kemasan atau pembelian Anda.
          </p>
        )}
        <dl>
          <dt>Katalog diambil</dt>
          <dd>{date(status.sources.catalogue.retrievedAt)}</dd>
          <dt>Kamus diambil</dt>
          <dd>{date(status.sources.dictionary.retrievedAt)}</dd>
          <dt>Observasi harga diambil</dt>
          <dd>{date(status.sources.prices.retrievedAt)}</dd>
        </dl>
        {status.lastAttemptAt && (
          <p className="muted text-sm">
            Percobaan terakhir: {date(status.lastAttemptAt)}.
            {status.nextAttemptAt && (
              <> Percobaan berikutnya: {date(status.nextAttemptAt)}.</>
            )}
          </p>
        )}
        <p className="muted text-sm">
          AI menjelaskan data yang tersedia di aplikasi dan mengikuti profil
          Anda. Jawaban bukan penelusuran web langsung. Data komunitas, aturan
          kesehatan, harga dan hasil OCR tetap perlu diperiksa; model AI tidak
          otomatis menjadi sumber fakta terbaru.
        </p>
      </div>
    </details>
  );
}
