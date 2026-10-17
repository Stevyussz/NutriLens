import { HistoryExplorer } from "@/components/history-explorer";
export default function History() {
  return (
    <>
      <header className="page-header">
        <h1>Riwayat label.</h1>
        <p className="muted">
          Putuskan sekarang, pelajari detailnya kapan saja.
        </p>
      </header>
      <HistoryExplorer />
    </>
  );
}
