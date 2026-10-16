import { DictionaryExplorer } from "@/components/dictionary-explorer";
import { DataCoverage } from "@/components/data-coverage";
export default function Dictionary() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Nama lain, bahan yang sama</p>
        <h1>Kamus di balik komposisi.</h1>
        <p className="muted">
          Kenali fungsi bahan dan nama samarannya. Kode INS atau E-number adalah
          identitas bahan, bukan bukti bahwa bahan tersebut berbahaya.
        </p>
      </header>
      <DataCoverage />
      <DictionaryExplorer />
    </>
  );
}
