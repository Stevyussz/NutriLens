"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScanLine, BookOpen, UserRound, LogOut, History } from "lucide-react";
import { Button } from "./ui/button";
import { requestApi, successSchema } from "@/core/browser-api";
export function Navigation({ isGuest = true }: { isGuest?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const client = useQueryClient();
  const logout = useMutation({
    mutationFn: () =>
      requestApi("/api/auth/logout", successSchema, { method: "POST" }),
    onSuccess: () => {
      client.clear();
      router.replace("/");
      router.refresh();
    },
  });
  return (
    <aside className="app-navigation">
      <header className="app-header">
        <Link href="/" className="wordmark">
          Bongkar<span>Label</span>
          <span className="wordmark-dot" />
        </Link>
        <span className="hidden md:inline muted text-sm">
          Baca komposisi. Putuskan sendiri.
        </span>
        <div className="account-actions">
          <Link
            className="button button-ghost"
            href={
              isGuest
                ? `/login?next=${encodeURIComponent(path)}`
                : "/security-profile"
            }
          >
            {isGuest ? "Masuk" : "Akun"}
          </Link>
          <Button
            variant="ghost"
            aria-label="Akhiri sesi"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut size={18} aria-hidden />
            <span className="logout-label">Akhiri sesi</span>
          </Button>
        </div>
      </header>
      <nav className="app-tabs" aria-label="Navigasi aplikasi">
        {[
          { href: "/scanner", label: "Scan label", Icon: ScanLine },
          { href: "/dictionary", label: "Kamus bahan", Icon: BookOpen },
          { href: "/history", label: "Riwayat", Icon: History },
          {
            href: "/security-profile",
            label: "Profil saya",
            Icon: UserRound,
          },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            className={path === href ? "active" : ""}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      {logout.error && (
        <p role="alert" className="error-text shell">
          {logout.error.message}
        </p>
      )}
    </aside>
  );
}
