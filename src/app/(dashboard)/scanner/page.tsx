import { DataFreshness } from "@/components/data-freshness";
import { ScannerConsole } from "@/components/scanner/scanner-console";
import { ProfileContext } from "@/components/scanner/profile-context";
export default async function Scanner({
  searchParams,
}: {
  searchParams: Promise<{ history?: string }>;
}) {
  const historyId = (await searchParams).history;
  return (
    <>
      <header className="page-header scanner-page-header">
        <h1>Mulai dari satu foto.</h1>
        <p className="muted">
          Baca komposisi, periksa angka, lalu sesuaikan dengan kebutuhan Anda.
        </p>
      </header>
      <ProfileContext />
      <ScannerConsole historyId={historyId} />
      <DataFreshness compact />
    </>
  );
}
