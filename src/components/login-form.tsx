"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { requestApi, successSchema } from "@/core/browser-api";
import { Button } from "./ui/button";

export function LoginForm({
  mode = "login",
  destination = "/scanner",
}: {
  mode?: "login" | "register";
  destination?: string;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [formError, setFormError] = useState("");
  const registering = mode === "register";
  const auth = useMutation({
    mutationFn: (input: { email: string; password: string; name?: string }) =>
      requestApi(`/api/auth/${mode}`, successSchema, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      client.clear();
      router.replace(
        registering && destination !== "/security-profile"
          ? `/welcome?next=${encodeURIComponent(destination)}`
          : destination,
      );
      router.refresh();
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (registering && password !== String(form.get("confirmation"))) {
      setFormError("Kata sandi dan konfirmasi belum sama.");
      event.currentTarget
        .querySelector<HTMLInputElement>('[name="confirmation"]')
        ?.focus();
      return;
    }
    auth.mutate({
      email: String(form.get("email")).trim(),
      password,
      ...(registering ? { name: String(form.get("name")).trim() } : {}),
    });
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-4"
      onChange={() => {
        setFormError("");
        if (auth.error) auth.reset();
      }}
    >
      {registering && (
        <label className="field">
          Nama
          <input name="name" required maxLength={80} autoComplete="name" />
        </label>
      )}
      <label className="field">
        Email
        <input
          name="email"
          type="email"
          inputMode="email"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={250}
        />
      </label>
      <label className="field" htmlFor="auth-password">
        Kata sandi
      </label>
      <div className="password-field">
        <input
          id="auth-password"
          name="password"
          type={visible ? "text" : "password"}
          required
          minLength={registering ? 12 : 8}
          maxLength={128}
          autoComplete={registering ? "new-password" : "current-password"}
          aria-describedby={registering ? "password-help" : undefined}
        />
        <button
          type="button"
          aria-label={
            visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
          }
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? (
            <EyeOff size={20} aria-hidden />
          ) : (
            <Eye size={20} aria-hidden />
          )}
        </button>
      </div>
      {registering && (
        <>
          <p id="password-help" className="muted text-sm mb-0">
            Minimal 12 karakter. Anda dapat memakai frasa yang mudah diingat.
          </p>
          <label className="field">
            Ulangi kata sandi
            <input
              name="confirmation"
              type={visible ? "text" : "password"}
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
        </>
      )}
      {(formError || auth.error) && (
        <p role="alert" className="error-text mb-0">
          {formError || auth.error?.message}
        </p>
      )}
      <Button type="submit" disabled={auth.isPending}>
        {auth.isPending
          ? "Memproses…"
          : registering
            ? "Buat akun"
            : "Masuk ke akun"}
      </Button>
    </form>
  );
}
