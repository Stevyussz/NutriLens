import { ProfileEditor } from "@/components/profile-editor";
export default function SecurityProfile() {
  return (
    <>
      <header className="page-header">
        <h1>Yang cocok untuk Anda.</h1>
        <p className="muted">
          Atur apa yang perlu diperhatikan saat membaca label, lalu lihat
          perangkat yang masih memiliki akses.
        </p>
      </header>
      <ProfileEditor />
    </>
  );
}
