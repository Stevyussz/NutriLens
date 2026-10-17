"use client";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Analysis } from "@/core/analysis-schema";
import { decimal, rupiah } from "@/core/utils";
import { scoreNutrition } from "@/core/algorithms/nutrition-scorer";
export function ParetoSwapMatrix({ analysis }: { analysis: Analysis }) {
  const product = analysis.extractedProductData;
  const selected = analysis.paretoSwaps.filter((s) =>
    analysis.aiVerdict.selectedCandidateIds.includes(s.id),
  );
  const chartData = analysis.paretoSwaps.map((s) => ({
    name: s.name,
    price: s.priceIdr,
    score: scoreNutrition(s, []).valueScore,
  }));
  return (
    <section
      className="mt-8 result-section"
      id="pilihan-pengganti"
      tabIndex={-1}
    >
      <h2>Pilihan relevan, harga terendah lebih dulu</h2>
      <p className="muted">
        Kategori sama, gula minimal 25% lebih rendah, protein setara atau lebih
        tinggi, ukuran sajian sama. Hanya kandidat dengan sumber harga toko yang
        masuk perbandingan.
      </p>
      <div className="panel">
        <div
          className="chart-area"
          role="img"
          aria-label="Perbandingan harga per sajian dengan skor gizi heuristik. Nilai numerik tersedia di tabel di bawah."
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, bottom: 32, left: 0, right: 12 }}
              accessibilityLayer
            >
              <CartesianGrid stroke="#ddced8" />
              <XAxis
                type="number"
                dataKey="price"
                name="Harga"
                tick={{ fill: "#705c6b", fontSize: 12 }}
                tickFormatter={(v) => `${Number(v) / 1000}rb`}
                label={{
                  value: "Harga / sajian (Rp, estimasi bila ditandai)",
                  position: "bottom",
                  fill: "#705c6b",
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="score"
                name="Skor"
                domain={[0, 100]}
                width={40}
                tick={{ fill: "#705c6b", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "#fffefd",
                  color: "#352331",
                  borderColor: "#bca5b4",
                }}
              />
              <Legend verticalAlign="top" />
              {product.priceIdr !== null && (
                <Scatter
                  isAnimationActive={false}
                  name="Label asal"
                  data={[
                    {
                      price: product.priceIdr,
                      score: analysis.nutritionScore.valueScore,
                    },
                  ]}
                  fill="#9f1239"
                  shape="diamond"
                />
              )}
              <Scatter
                isAnimationActive={false}
                name="Kandidat DB"
                data={chartData}
                fill="#07664e"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="muted text-sm">
          Skor gizi 0–100 merupakan heuristik aplikasi, bukan skor klinis. Harga
          tercatat berasal dari sumber toko, bukan jaminan harga atau stok saat
          ini. Urutan ini hanya mencakup kandidat dalam database.
        </p>
        <details>
          <summary>Data kandidat dan Pareto frontier</summary>
          {chartData.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Harga / sajian</th>
                    <th>Gula</th>
                    <th>Protein</th>
                    <th>Pareto</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.paretoSwaps.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>
                        {rupiah(s.priceIdr)}
                        {s.priceSource === "ESTIMATE" ? " (estimasi)" : ""}
                      </td>
                      <td>{decimal(s.nutrition.sugarGrams)} g</td>
                      <td>{decimal(s.nutrition.proteinGrams)} g</td>
                      <td>{s.dominated ? "Didominasi" : "Frontier"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              Belum ada kandidat dengan bukti harga yang memenuhi kecocokan ini.
            </p>
          )}
        </details>
      </div>
      {selected.length > 0 ? (
        <div className="swap-grid">
          {selected.map((s) => (
            <article key={s.id} className="swap-card">
              {s.moneySavedIdr !== null && s.moneySavedIdr > 0 && (
                <p className="saving mb-2">
                  Selisih harga tercatat {rupiah(s.moneySavedIdr)}
                </p>
              )}
              <h3>{s.name}</h3>
              <p className="muted text-sm">
                {rupiah(s.priceIdr)} / sajian
                {s.priceSource === "ESTIMATE" ? ", estimasi" : ""}
              </p>
              <p>
                Gula {decimal(s.nutrition.sugarGrams)} g · Protein{" "}
                {decimal(s.nutrition.proteinGrams)} g
              </p>
              <p className="muted text-sm">
                {product.nutrition.sugarGrams > 0
                  ? `Gula turun ${decimal((1 - s.nutrition.sugarGrams / product.nutrition.sugarGrams) * 100)}%. `
                  : ""}
                {product.nutrition.proteinGrams > 0
                  ? `Protein naik ${decimal((s.nutrition.proteinGrams / product.nutrition.proteinGrams - 1) * 100)}%.`
                  : "Persentase protein tidak dihitung karena nilai asal nol."}
              </p>
              <p className="muted text-sm">
                Ukuran sajian: {decimal(s.servingSizeGrams)} g/ml.{" "}
                {s.source.note}
              </p>
              {s.priceSourceUrl && (
                <a
                  className="text-link text-sm"
                  href={s.priceSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Periksa harga toko
                </a>
              )}
              {s.source.url && (
                <a
                  className="text-link text-sm"
                  href={s.source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Periksa sumber label
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="notice mt-4">
          Belum ada pilihan yang lolos seluruh batas dan pemeriksaan profil.
          Harga toko mungkin belum tersedia. Scan produk lain untuk
          membandingkan gizinya.
        </div>
      )}
      {analysis.aiVerdict.fallbackSuggestions.length > 0 && (
        <div className="mt-6">
          <h3>Saran Gemini di luar database</h3>
          <p className="muted text-sm">
            Belum diverifikasi: cek ketersediaan, harga, ukuran sajian, alergi
            dan label gizi di toko. Saran ini belum lolos pembandingan database.
          </p>
          <div className="swap-grid">
            {analysis.aiVerdict.fallbackSuggestions.map((s, i) => (
              <article className="swap-card" key={`${i}-${s.name}`}>
                <h3>{s.name}</h3>
                <p>Estimasi {rupiah(s.estimatedPriceIdr)}</p>
                <p className="muted text-sm">
                  Perkiraan gula {decimal(s.estimatedSugarGrams)} g, protein{" "}
                  {decimal(s.estimatedProteinGrams)} g. {s.note}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
