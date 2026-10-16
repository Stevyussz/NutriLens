"use client";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Analysis } from "@/core/analysis-schema";
import { decimal } from "@/core/utils";
export function SugarSplittingChart({ analysis }: { analysis: Analysis }) {
  const metrics = analysis.splittingAnalysis;
  const data = [
    { name: "Bahan pertama", posisi: metrics.firstIngredientWeight },
    { name: "Seluruh sumber gula", posisi: metrics.totalEstimatedSugarWeight },
  ];
  return (
    <section className="panel result-section" id="sumber-gula" tabIndex={-1}>
      <h2>Saat sumber gula disatukan</h2>
      <p className="muted text-sm">
        {metrics.isSugarSplittingDetected
          ? "Pola sugar-splitting terdeteksi oleh model posisi."
          : "Model tidak menemukan gabungan gula yang melampaui bahan pertama."}
      </p>
      <div
        className="chart-area"
        role="img"
        aria-label={`Estimasi bobot bahan pertama ${decimal(metrics.firstIngredientWeight)} persen; gabungan sumber gula ${decimal(metrics.totalEstimatedSugarWeight)} persen.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 12, right: 20, bottom: 8, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid stroke="#c7bcad" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#54554f", fontSize: 12 }}
              unit="%"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fill: "#484850", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "#e9e4dc" }}
              contentStyle={{
                background: "#fff9f0",
                borderColor: "#8d887f",
                color: "#303432",
              }}
              formatter={(value) => [
                `${decimal(Number(value))}%`,
                "Estimasi model",
              ]}
            />
            <Bar
              isAnimationActive={false}
              dataKey="posisi"
              fill="#a16207"
              maxBarSize={36}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="muted text-sm">{metrics.limitation}</p>
      <details>
        <summary>Lihat urutan setelah penggabungan</summary>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">
              Urutan model setelah gula digabung
            </caption>
            <thead>
              <tr>
                <th>Urutan</th>
                <th>Bahan</th>
                <th>Bobot model</th>
              </tr>
            </thead>
            <tbody>
              {metrics.consolidatedRank.map((i) => (
                <tr key={i.rank}>
                  <td>{i.rank}</td>
                  <td>{i.name}</td>
                  <td>{decimal(i.weight)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
