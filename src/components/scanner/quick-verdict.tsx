import Link from "next/link";
import type { Analysis } from "@/core/analysis-schema";
import type { HealthProfile } from "@/core/db/collections";
import { quickSummary } from "@/core/quick-summary";
import { decimal } from "@/core/utils";
export function QuickVerdict({
  result,
  health,
  onSwaps,
}: {
  result: Analysis;
  health: HealthProfile;
  onSwaps: () => void;
}) {
  const summary = quickSummary(result, health);
  const p = result.extractedProductData;
  const picks = result.paretoSwaps
    .filter((s) => result.aiVerdict.selectedCandidateIds.includes(s.id))
    .slice(0, 2);
  return (
    <section
      className="quick-verdict"
      id="hasil-ringkas"
      aria-labelledby="quick-title"
    >
      <h3 id="quick-title">{summary.title}</h3>
      <p className="quick-action">{summary.action}</p>
      <p className="quick-reason">{summary.reason}</p>
      <dl className="quick-numbers">
        <div>
          <dt>Gula / sajian</dt>
          <dd>
            {decimal(p.nutrition.sugarGrams)} <small>g</small>
          </dd>
          <p>{summary.sugarPercent}% batas harian profil</p>
        </div>
        <div>
          <dt>Natrium / sajian</dt>
          <dd>
            {decimal(p.nutrition.sodiumMg)} <small>mg</small>
          </dd>
          <p>{summary.sodiumPercent}% batas harian profil</p>
        </div>
      </dl>
      <p className="quick-serving">
        Untuk {decimal(p.servingSizeGrams)} g/ml per sajian. Satu kemasan bisa
        berisi beberapa sajian.
      </p>
      <div className="quick-recommendation">
        {picks.length ? (
          <>
            <p>Bandingkan dengan {picks.map((s) => s.name).join(" atau ")}.</p>
            <a href="#pilihan-pengganti" onClick={onSwaps}>
              Lihat label & batas perbandingan →
            </a>
          </>
        ) : (
          <p>
            <Link href="/history">
              Hasil tersimpan. Baca detailnya nanti di riwayat →
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
