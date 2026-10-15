import { ScannerConsole } from "@/components/scanner/scanner-console";
export default function Scanner() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow mb-0">Untuk pilihan makan sehari-hari</p>
        <h1>Kenali isinya sebelum memilih.</h1>
        <p className="muted">
          Komposisi, kontribusi gula dan pilihan pengganti, ditinjau bersama
          batas konsumsi serta anggaran Anda.
        </p>
      </header>
      <ScannerConsole />
    </>
  );
}
