"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { requestApi, successSchema } from "@/core/browser-api";
import { Button } from "./ui/button";
import { authDestination } from "@/core/security/auth-input";
export function StartAnalysis({
  compact = false,
  label = "Scan label",
  destination = "/scanner",
}: {
  compact?: boolean;
  label?: string;
  destination?: string;
}) {
  const router = useRouter();
  const login = useMutation({
    mutationFn: () =>
      requestApi("/api/auth/guest", successSchema, { method: "POST" }),
    onSuccess: () => {
      router.push(authDestination(destination));
      router.refresh();
    },
  });
  return (
    <div>
      <Button
        onClick={() => login.mutate()}
        disabled={login.isPending}
        variant={compact ? "secondary" : "default"}
      >
        {login.isPending ? "Membuka…" : label}
      </Button>
      {login.error && (
        <p role="alert" className="error-text mt-2 max-w-sm">
          {login.error.message}
        </p>
      )}
    </div>
  );
}
