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
      <h2>Pilihan pengganti dalam anggaran</h2>
      <p className="muted">
        Kategori sama, gula minimal 25% lebih rendah, protein setara atau lebih
        tinggi, harga tidak melebihi label asal dan batas Anda.
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
              <CartesianGrid stroke="#c7bcad" />
              <XAxis
                type="number"
                dataKey="price"
                name="Harga"
                tick={{ fill: "#54554f", fontSize: 12 }}
                tickFormatter={(v) => `${Number(v) / 1000}rb`}
                label={{
                  value: "Harga / sajian (Rp, estimasi bila ditandai)",
                  position: "bottom",
                  fill: "#54554f",
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="score"
                name="Skor"
                domain={[0, 100]}
                width={40}
                tick={{ fill: "#54554f", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "#fff9f0",
                  color: "#303432",
                  borderColor: "#8d887f",
                }}
              />
              <Legend verticalAlign="top" />
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
          katalog yang belum didukung bukti toko adalah asumsi simulasi per
          sajian, bukan harga kemasan.
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
              Belum ada kandidat yang memenuhi seluruh batas.
            </p>
          )}
        </details>
      </div>
      {selected.length > 0 ? (
        <div className="swap-grid">
          {selected.map((s) => (
            <article key={s.id} className="swap-card">
              <p className="saving mb-2">Hemat {rupiah(s.moneySavedIdr)}</p>
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
          Anda dapat meninjau anggaran pada Profil saya, atau memeriksa produk
          lain.
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
