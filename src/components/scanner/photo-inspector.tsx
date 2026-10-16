"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";

export function PhotoInspector({
  url,
  index,
  alt,
  onInspect,
}: {
  url: string;
  index: number;
  alt: string;
  onInspect?: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <Dialog
      onOpenChange={(open) => {
        setZoomed(false);
        if (open) onInspect?.();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="photo-inspect-trigger"
          aria-label={`Periksa foto ${index + 1}`}
        >
          <img src={url} alt={alt} />
          <span>Periksa foto {index + 1}</span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="photo-inspector"
        title={`Foto label ${index + 1}`}
        description="Pastikan angka dan komposisi terlihat jelas. Tutup untuk melanjutkan pemeriksaan."
      >
        <Button
          variant="secondary"
          aria-pressed={zoomed}
          onClick={() => setZoomed((value) => !value)}
        >
          {zoomed ? "Tampilkan seluruh foto" : "Perbesar foto"}
        </Button>
        <div
          className={`photo-inspector-image${zoomed ? " is-zoomed" : ""}`}
          tabIndex={0}
          role="region"
          aria-label="Foto label, geser untuk melihat bagian lain saat diperbesar"
        >
          <img src={url} alt={alt} />
        </div>
        <p className="muted text-sm">
          {zoomed
            ? "Geser foto atau gunakan tombol panah untuk melihat bagian lain."
            : "Jika tulisan kabur atau terpotong, buang foto lalu ambil ulang."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
