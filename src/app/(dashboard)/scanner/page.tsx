import { DataFreshness } from "@/components/data-freshness";
import { ScannerConsole } from "@/components/scanner/scanner-console";
import { ProfileContext } from "@/components/scanner/profile-context";
export default function Scanner() {
  return (
    <>
      <header className="page-header scanner-page-header">
        <p className="eyebrow mb-0">Untuk pilihan makan sehari-hari</p>
        <h1>Baca label Anda.</h1>
        <p className="muted">
          Komposisi dan gizi, dibaca sesuai kebutuhan Anda.
        </p>
      </header>
      <ProfileContext />
      <DataFreshness compact />
      <ScannerConsole />
    </>
  );
}
