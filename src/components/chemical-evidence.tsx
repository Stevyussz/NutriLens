import type { Chemical } from "@/core/db/collections";
export function ChemicalEvidence({ chemical }: { chemical: Chemical }) {
  const details = chemical.providerDetails;
  return (
    <details className="chemical-evidence">
      <summary>Datasheet dan sumber bahan</summary>
      {details?.functions.length ? (
        <p>Fungsi yang dicatat penyedia: {details.functions.join(", ")}.</p>
      ) : (
        <p className="muted">
          Fungsi teknologis rinci belum tersedia dari sumber yang diimpor.
        </p>
      )}
      {details?.description && (
        <>
          <p className="muted text-sm">Deskripsi penyedia, bahasa asli:</p>
          <p>{details.description}</p>
        </>
      )}
      {details?.wikidata && (
        <a
          className="text-link"
          href={`https://www.wikidata.org/wiki/${details.wikidata}`}
          target="_blank"
          rel="noreferrer"
        >
          Identitas Wikidata {details.wikidata}
        </a>
      )}
      {details?.usdaFdcCode && (
        <a
          className="text-link"
          href={`https://fdc.nal.usda.gov/food-details/${details.usdaFdcCode}/nutrients`}
          target="_blank"
          rel="noreferrer"
        >
          Data komposisi USDA FDC {details.usdaFdcCode}
        </a>
      )}
      {details?.ciqualCode && <p>Identitas CIQUAL: {details.ciqualCode}.</p>}
      {details?.efsa && (
        <div>
          <a
            className="text-link"
            href={details.efsa.url}
            target="_blank"
            rel="noreferrer"
          >
            Evaluasi EFSA: {details.efsa.title}
          </a>
          <p className="muted text-sm">
            Tanggal yang dicatat penyedia:{" "}
            {details.efsa.date ?? "tidak tersedia"}. Evaluasi ini bukan
            penetapan izin penggunaan di Indonesia.
          </p>
        </div>
      )}
      <div className="chemical-reference-links">
        <a
          className="text-link"
          href="https://cekbtp.pom.go.id/"
          target="_blank"
          rel="noreferrer"
        >
          Periksa ketentuan BTP BPOM
        </a>
        <a
          className="text-link"
          href="https://codex.fao.org/codex-texts/codex-online-databases/gsfa/food-additives-list"
          target="_blank"
          rel="noreferrer"
        >
          Daftar aditif Codex GSFA
        </a>
      </div>
      <p className="muted text-sm">
        Tautan regulasi adalah akses ke sumber resmi, bukan salinan database
        izin, batas penggunaan atau SDS pemasok.
      </p>
    </details>
  );
}
