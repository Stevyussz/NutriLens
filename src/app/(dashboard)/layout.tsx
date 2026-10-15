import { redirect } from "next/navigation";
import { requireUser } from "@/core/security/session";
import { HttpError } from "@/core/security/http";
import { Navigation } from "@/components/navigation";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/");
    throw error;
  }
  return (
    <>
      <Navigation isGuest={user.role === "GUEST"} />
      <main id="main" className="shell dashboard-main">
        {children}
        <footer className="footer-note">
          Analisis untuk memahami label, bukan diagnosis. Pastikan ukuran
          sajian, harga, dan komposisi pada kemasan sebelum membeli.
        </footer>
      </main>
    </>
  );
}
