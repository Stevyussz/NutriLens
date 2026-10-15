"use client";
import type { Analysis } from "@/core/analysis-schema";
import { Dialog, DialogTrigger, DialogContent } from "../ui/dialog";
import { decimal } from "@/core/utils";
import { ingredientFunctionLabels } from "@/core/presentation";
import { IngredientAliases } from "../ingredient-aliases";
export function XRayIngredientCard({ analysis }: { analysis: Analysis }) {
  return (
    <section className="panel result-section" id="komposisi" tabIndex={-1}>
      <h2>Komposisi, dibuka satu per satu</h2>
      <p className="muted text-sm">
        Pilih bahan untuk melihat alias, fungsi dan konteksnya. Urutan mengikuti
        label.
      </p>
      <div className="ingredient-list">
        {analysis.extractedProductData.orderedIngredients.map(
          (ingredient, idx) => {
            const chemical = analysis.chemicals.find(
              (c) => c.canonicalName === ingredient.canonicalChemicalName,
            );
            const sugar = ingredient.functionalCategory === "HIDDEN_SUGAR";
            return (
              <Dialog key={`${idx}-${ingredient.rawName}`}>
                <DialogTrigger asChild>
                  <button
                    className={`ingredient ${chemical?.riskLevel === "HIGH" ? "danger" : sugar || chemical?.triggersConditions.length ? "warn" : ""}`}
                  >
                    {idx + 1}. {ingredient.rawName}
                  </button>
                </DialogTrigger>
                <DialogContent
                  title={ingredient.rawName}
                  description={
                    chemical
                      ? `Nama kamus: ${chemical.canonicalName}${chemical.insOrECode ? `, ${chemical.insOrECode}` : ""}`
                      : "Bahan belum cocok dengan kamus, periksa penamaan pada kemasan."
                  }
                >
                  <p>
                    {chemical?.plainExplanation ??
                      "Belum ada entri yang cocok. Tidak ada kesimpulan keamanan yang ditarik dari nama ini saja."}
                  </p>
                  <dl className="grid gap-3 my-5">
                    <div>
                      <dt className="muted text-sm">Fungsi</dt>
                      <dd>
                        {
                          ingredientFunctionLabels[
                            ingredient.functionalCategory
                          ]
                        }
                      </dd>
                    </div>
                    <div>
                      <dt className="muted text-sm">Indeks glikemik</dt>
                      <dd>
                        {chemical?.glycemicIndex == null
                          ? "Belum ada nilai spesifik terverifikasi"
                          : decimal(chemical.glycemicIndex)}
                      </dd>
                    </div>
                    <div>
                      <dt className="muted text-sm">Konteks profil</dt>
                      <dd>
                        {chemical?.triggersConditions.length
                          ? chemical.triggersConditions.join(", ")
                          : "Tidak ada pemicu khusus yang tercatat; ini bukan jaminan keamanan."}
                      </dd>
                    </div>
                  </dl>
                  {chemical && (
                    <>
                      <IngredientAliases
                        aliases={chemical.aliases}
                        canonicalName={chemical.canonicalName}
                      />
                      <a
                        href={chemical.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link"
                      >
                        Baca sumber penjelasan
                      </a>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            );
          },
        )}
      </div>
      <p className="muted text-sm mb-0">
        Penanda kuning: sumber gula atau bahan yang perlu dicermati dalam
        profil. Kode aditif tidak otomatis berarti berbahaya.
      </p>
    </section>
  );
}
