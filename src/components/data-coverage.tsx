import { getDb } from "@/core/db/client";
import prices from "../../data/prices.snapshot.json";
import dictionaryManifest from "../../data/dictionary.manifest.json";

export async function DataCoverage() {
  const db = await getDb();
  const dictionary = db.collection("chemical_dictionary");
  const reference = { "source.kind": { $in: ["OPEN_FOOD_FACTS", "LABEL"] } };
  const [total, coded, unknownFunction, withGI, products, matchedPrices] =
    await Promise.all([
      dictionary.countDocuments(),
      dictionary.countDocuments({ insOrECode: { $ne: "" } }),
      dictionary.countDocuments({ functionalCategory: "UNKNOWN" }),
      dictionary.countDocuments({ glycemicIndex: { $type: "number" } }),
      db.collection("products").countDocuments(reference),
      db
        .collection("products")
        .countDocuments({
          ...reference,
          barcode: { $in: prices.map((p) => p.barcode) },
        }),
    ]);
  const number = (value: number) => value.toLocaleString("id-ID");
  return (
    <details className="data-coverage">
      <summary>
        <span>Sumber dan cakupan data</span>
        <span className="muted">
          {number(total)} bahan · {number(products)} label referensi
        </span>
      </summary>
      <div className="coverage-body">
        <div>
          <h2>Kamus bahan</h2>
          <p>
            {number(coded)} entri memiliki kode INS/E-number. Fungsi belum
            dipetakan untuk {number(unknownFunction)} entri; {number(withGI)}{" "}
            entri memiliki nilai GI bersumber. Cakupan nama bahan lebih luas
            daripada kelengkapan penjelasannya.
          </p>
          <a
            className="text-link"
            href="https://static.openfoodfacts.org/data/taxonomies/ingredients.json"
            target="_blank"
            rel="noreferrer"
          >
            Taksonomi Open Food Facts
          </a>
        </div>
        <div>
          <h2>Produk dan harga</h2>
          <p>
            {number(products)} label komunitas menjadi referensi pembanding.
            Katalog mencakup produk untuk pasar Indonesia, termasuk produk
            impor. Cakupan produk lokal masih terbatas.
          </p>
          <p>
            {number(prices.length)} observasi harga berbukti tersedia;{" "}
            {number(matchedPrices)} produk referensi cocok berdasarkan barcode.
            Harga per sajian yang belum diverifikasi tetap ditandai estimasi.
          </p>
          <a
            className="text-link"
            href="https://prices.openfoodfacts.org/"
            target="_blank"
            rel="noreferrer"
          >
            Open Prices
          </a>
        </div>
        <p className="muted text-sm coverage-note">
          Snapshot kamus diambil{" "}
          {new Intl.DateTimeFormat("id-ID", {
            dateStyle: "long",
            timeZone: "Asia/Jakarta",
          }).format(new Date(dictionaryManifest.retrievedAt))}
          . Komposisi dan informasi gizi berasal dari kontribusi komunitas;
          periksa label kemasan untuk varian yang Anda gunakan. Contoh
          ilustratif tidak masuk populasi referensi.
        </p>
      </div>
    </details>
  );
}
