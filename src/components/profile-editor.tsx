"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { profileOutputSchema, auditOutputSchema } from "@/core/api-schemas";
import { healthSchema, type HealthProfile } from "@/core/db/collections";
import { requestApi, successSchema } from "@/core/browser-api";
import { decimal } from "@/core/utils";
import { deviceDescription } from "@/core/presentation";
import Link from "next/link";
import { Button } from "./ui/button";
import { Dialog, DialogTrigger, DialogContent } from "./ui/dialog";
export function ProfileEditor({
  onboarding = false,
  destination = "/scanner",
}: {
  onboarding?: boolean;
  destination?: string;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const [section, setSection] = useState<"preferences" | "devices">(
    "preferences",
  );
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => requestApi("/api/profile", profileOutputSchema),
  });
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: () => requestApi("/api/audit", auditOutputSchema),
    enabled: !onboarding,
  });
  const save = useMutation({
    mutationFn: (health: HealthProfile) =>
      requestApi("/api/profile", profileOutputSchema, {
        method: "PATCH",
        body: JSON.stringify(health),
      }),
    onSuccess: (data) => {
      client.setQueryData(["profile"], data);
      setSaved(true);
      if (onboarding) router.replace(destination);
    },
  });
  const revoke = useMutation({
    mutationFn: (sessionId: string) =>
      requestApi("/api/auth/revoke", successSchema, {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      }),
    onSuccess: (data) => {
      if (data.revokedCurrent) {
        client.clear();
        router.replace("/");
        router.refresh();
      } else client.invalidateQueries({ queryKey: ["audit"] });
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSaved(false);
    const data = new FormData(event.currentTarget);
    const health = healthSchema.safeParse({
      conditions: data.getAll("conditions"),
      allergies: String(data.get("allergies"))
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      dailySugarLimitGrams: Number(data.get("sugar")),
      dailySodiumLimitMg: Number(data.get("sodium")),
    });
    if (!health.success) {
      setFormError("Periksa acuan konsumsi dan daftar alergi Anda.");
      return;
    }
    save.mutate(health.data);
  }
  return (
    <>
      {!onboarding && (
        <nav className="workspace-switch" aria-label="Bagian profil">
          <button
            aria-pressed={section === "preferences"}
            onClick={() => setSection("preferences")}
          >
            Preferensi konsumsi
          </button>
          <button
            aria-pressed={section === "devices"}
            onClick={() => setSection("devices")}
          >
            Perangkat & akses
          </button>
        </nav>
      )}
      <div className={onboarding ? "onboarding-profile" : "profile-layout"}>
        <section
          className="panel"
          hidden={!onboarding && section !== "preferences"}
        >
          <h2>Label dibaca sesuai kebutuhan Anda.</h2>
          <p className="muted text-sm">
            Isi alergi yang perlu diperhatikan. Pengaturan lainnya opsional dan
            bisa diubah kapan saja.
          </p>
          {profile.isPending ? (
            <p role="status">Memuat profil…</p>
          ) : profile.error ? (
            <>
              <p className="error-text" role="alert">
                {profile.error.message}
              </p>
              <Button variant="secondary" onClick={() => profile.refetch()}>
                Muat ulang profil
              </Button>
            </>
          ) : (
            profile.data && (
              <>
                <p className="muted text-sm">
                  {profile.data.name} ·{" "}
                  {profile.data.role === "GUEST"
                    ? "Profil pribadi di perangkat ini"
                    : "Akun pribadi"}
                </p>
                {profile.data.role === "GUEST" && (
                  <div className="account-invitation">
                    <p className="muted text-sm">
                      Ingin memakai profil ini di kunjungan berikutnya?
                    </p>
                    <Link
                      className="button button-secondary"
                      href="/register?next=%2Fsecurity-profile"
                    >
                      Simpan profil ke akun
                    </Link>
                  </div>
                )}
                <form
                  onSubmit={submit}
                  key={profile.data.profileVersion}
                  onChange={() => setSaved(false)}
                >
                  <details className="profile-conditions">
                    <summary>Kondisi tertentu (opsional)</summary>
                    <fieldset className="mb-6">
                      <legend className="mb-3">
                        Kondisi yang ingin diperhatikan
                      </legend>
                      {(["GERD", "HIPERTENSI", "DIABETES"] as const).map(
                        (c) => (
                          <label
                            key={c}
                            className="flex items-center gap-3 min-h-11"
                          >
                            <input
                              className="w-5 h-5"
                              type="checkbox"
                              name="conditions"
                              value={c}
                              defaultChecked={profile.data?.healthProfile.conditions.includes(
                                c,
                              )}
                            />
                            {c}
                          </label>
                        ),
                      )}
                    </fieldset>
                  </details>
                  <div className="profile-fields">
                    <label className="field profile-allergies">
                      Alergi, pisahkan dengan koma
                      <input
                        name="allergies"
                        maxLength={2000}
                        defaultValue={profile.data.healthProfile.allergies.join(
                          ", ",
                        )}
                      />
                      <span className="muted">
                        Gunakan semua nama label yang perlu dicocokkan, misalnya
                        susu, milk. Pencocokan teks tidak menjamin semua turunan
                        alergen terdeteksi.
                      </span>
                    </label>
                  </div>
                  <details className="profile-reference">
                    <summary>Acuan gula & natrium (opsional)</summary>
                    <p className="muted text-sm">
                      Dipakai sebagai pembanding angka label, bukan sisa jatah
                      makan hari ini.
                    </p>
                    <div className="profile-fields">
                      <label className="field">
                        Acuan gula harian (g)
                        <input
                          name="sugar"
                          type="number"
                          min={1}
                          max={500}
                          required
                          step="any"
                          defaultValue={
                            profile.data.healthProfile.dailySugarLimitGrams
                          }
                        />
                      </label>
                      <label className="field">
                        Acuan natrium harian (mg)
                        <input
                          name="sodium"
                          type="number"
                          min={1}
                          max={10000}
                          required
                          step="any"
                          defaultValue={
                            profile.data.healthProfile.dailySodiumLimitMg
                          }
                        />
                      </label>
                    </div>
                  </details>
                  <p className="profile-shopping-note muted text-sm">
                    Pilihan pengganti diurutkan dari harga tercatat terendah
                    setelah kecocokan label diperiksa. Tidak ada anggaran wajib.
                    Harga dan stok toko dapat berubah.
                  </p>
                  <div className="profile-actions">
                    <Button
                      className="mt-6"
                      type="submit"
                      disabled={save.isPending}
                    >
                      {save.isPending
                        ? "Menyimpan…"
                        : onboarding
                          ? "Simpan dan lanjutkan"
                          : "Simpan profil"}
                    </Button>
                    {onboarding && (
                      <Link
                        className="button button-ghost mt-6"
                        href={destination}
                        replace
                      >
                        Lewati dulu
                      </Link>
                    )}
                  </div>
                  {saved && (
                    <p role="status" className="status status-AMAN mt-4">
                      Profil tersimpan. Pemindaian berikutnya memakai pengaturan
                      ini.
                    </p>
                  )}
                  {(formError || save.error) && (
                    <p role="alert" className="error-text mt-4">
                      {formError || save.error?.message}
                    </p>
                  )}
                </form>
                <p className="muted text-sm mt-6 mb-0">
                  Batas awal merujuk panduan umum WHO untuk gula bebas dan
                  natrium orang dewasa; gula total pada label berbeda dari gula
                  bebas. Sesuaikan dengan arahan tenaga kesehatan.
                </p>
                <a
                  href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet"
                  target="_blank"
                  rel="noreferrer"
                  className="text-link text-sm"
                >
                  Referensi batas awal
                </a>
              </>
            )
          )}
        </section>
        {!onboarding && (
          <div className="grid gap-6" hidden={section !== "devices"}>
            <section className="panel">
              <h2>Sesi perangkat</h2>
              <p className="muted text-sm">
                Akses perangkat berlaku maksimal 24 jam. Cabut sesi untuk
                mengakhiri akses perangkat tersebut.
              </p>
              {audit.isPending ? (
                <p role="status">Memuat audit sesi…</p>
              ) : audit.error ? (
                <>
                  <p role="alert" className="error-text">
                    {audit.error.message}
                  </p>
                  <Button variant="secondary" onClick={() => audit.refetch()}>
                    Muat ulang audit
                  </Button>
                </>
              ) : audit.data?.sessions.length ? (
                audit.data.sessions.map((s) => (
                  <div className="session-row" key={s.id}>
                    <div>
                      <p className="font-semibold mb-2">
                        {s.current ? "Perangkat ini" : "Perangkat lain"}
                      </p>
                      <p className="muted text-sm break-words mb-2">
                        {deviceDescription(s.userAgent)}
                      </p>
                      <p className="muted text-sm mb-0">
                        Berakhir{" "}
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Jakarta",
                        }).format(new Date(s.expiresAt))}{" "}
                        WIB
                      </p>
                      <details className="device-details">
                        <summary className="text-sm">Detail browser</summary>
                        <p className="muted text-sm">
                          Identifikasi merupakan perkiraan dari informasi
                          browser.
                        </p>
                        <p className="muted text-sm break-words">
                          {s.userAgent}
                        </p>
                      </details>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive">Cabut sesi</Button>
                      </DialogTrigger>
                      <DialogContent
                        title="Cabut sesi perangkat?"
                        description={
                          s.current
                            ? "Anda akan keluar dari perangkat ini."
                            : "Perangkat tersebut harus masuk kembali untuk mengakses aplikasi."
                        }
                      >
                        <Button
                          variant="destructive"
                          disabled={revoke.isPending}
                          onClick={() => revoke.mutate(s.id)}
                        >
                          {revoke.isPending ? "Mencabut…" : "Ya, cabut sesi"}
                        </Button>
                        {revoke.error && (
                          <p className="error-text mt-3" role="alert">
                            {revoke.error.message}
                          </p>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                ))
              ) : (
                <p className="muted">Tidak ada sesi aktif.</p>
              )}
            </section>
            {audit.data && (
              <details className="panel">
                <summary>Informasi teknis aplikasi</summary>
                <h2>Audit database</h2>
                <dl className="grid grid-cols-2 gap-4 my-6">
                  <div>
                    <dt className="muted text-sm">Produk</dt>
                    <dd className="text-2xl">{audit.data.database.products}</dd>
                  </div>
                  <div>
                    <dt className="muted text-sm">Senyawa</dt>
                    <dd className="text-2xl">
                      {audit.data.database.chemicals}
                    </dd>
                  </div>
                  <div>
                    <dt className="muted text-sm">Cache tersimpan</dt>
                    <dd className="text-2xl">
                      {audit.data.database.cachedScans}
                    </dd>
                  </div>
                  <div>
                    <dt className="muted text-sm">Ping MongoDB</dt>
                    <dd className="text-2xl">
                      {decimal(audit.data.database.pingMs)} ms
                    </dd>
                  </div>
                </dl>
                <details>
                  <summary>Periksa indeks aktif</summary>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Koleksi</th>
                          <th>Indeks</th>
                          <th>TTL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audit.data.database.indexes.map((i) => (
                          <tr key={`${i.collection}-${i.name}`}>
                            <td>{i.collection}</td>
                            <td className="break-all">{i.name}</td>
                            <td>
                              {i.ttl === null
                                ? "Tidak berlaku"
                                : `${i.ttl} dtk`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
                <Button
                  className="mt-4"
                  variant="secondary"
                  onClick={() => audit.refetch()}
                  disabled={audit.isFetching}
                >
                  Perbarui audit
                </Button>
              </details>
            )}
          </div>
        )}
      </div>
    </>
  );
}
