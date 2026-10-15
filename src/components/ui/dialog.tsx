"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className="dialog-content">
        <DialogPrimitive.Title className="text-2xl font-semibold pr-12">
          {title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="muted mt-3">
          {description ?? "Rincian bahan dan konteks penggunaannya."}
        </DialogPrimitive.Description>
        <div className="mt-6">{children}</div>
        <DialogPrimitive.Close
          className="dialog-close"
          aria-label="Tutup rincian"
        >
          <X size={20} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
