"use client";
import {
  MAX_SCAN_PHOTOS,
  MAX_SCAN_PHOTO_BYTES,
} from "@/core/scan-photo-limits";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ScanLine, SwitchCamera, X, ImagePlus } from "lucide-react";
import { Button } from "../ui/button";
import { PhotoInspector } from "./photo-inspector";
type Props = {
  active: boolean;
  files: File[];
  onCapture: (file: File) => void;
  onRemove: (index: number) => void;
  onGallery: () => void;
};
export function LiveCamera({
  active,
  files,
  onCapture,
  onRemove,
  onGallery,
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const ticket = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [state, setState] = useState<"idle" | "requesting" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [capturing, setCapturing] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const shutter = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (state === "ready") shutter.current?.focus({ preventScroll: true });
  }, [state]);
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  const stop = useCallback(() => {
    ticket.current++;
    stream.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setState("idle");
  }, []);
  useEffect(() => {
    if (!active) stop();
    return stop;
  }, [active, stop]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [stop]);
  async function start(direction = facing) {
    stop();
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setState("error");
      setError(
        "Kamera memerlukan HTTPS atau localhost. Anda tetap bisa memilih foto dari galeri.",
      );
      return;
    }
    const current = ++ticket.current;
    setState("requesting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: direction },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
      });
      if (current !== ticket.current || !activeRef.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      setFacing(direction);
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
      if (current !== ticket.current) return;
      setState("ready");
      media.getVideoTracks().forEach((track) => {
        track.onended = () => {
          stop();
          setError("Kamera terhenti. Nyalakan kembali untuk melanjutkan.");
        };
      });
    } catch (reason) {
      if (current !== ticket.current) return;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      if (video.current) video.current.srcObject = null;
      setState("error");
      const name = reason instanceof DOMException ? reason.name : "";
      setError(
        name === "NotAllowedError"
          ? "Kamera belum diizinkan. Izinkan di pengaturan browser, lalu coba lagi; atau gunakan galeri."
          : name === "NotFoundError"
            ? "Kamera tidak ditemukan pada perangkat ini. Gunakan foto dari galeri."
            : "Kamera belum bisa dibuka. Tutup aplikasi lain yang memakai kamera, lalu coba lagi.",
      );
    }
  }
  async function capture() {
    const element = video.current;
    if (
      !element ||
      !element.videoWidth ||
      state !== "ready" ||
      files.length >= MAX_SCAN_PHOTOS ||
      capturing
    )
      return;
    setCapturing(true);
    setError("");
    const current = ticket.current;
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        3000 / Math.max(element.videoWidth, element.videoHeight),
      );
      canvas.width = Math.round(element.videoWidth * scale);
      canvas.height = Math.round(element.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw Error("Canvas unavailable");
      context.drawImage(element, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(Error("Capture failed"))),
          "image/jpeg",
          0.94,
        ),
      );
      if (!activeRef.current || current !== ticket.current) return;
      if (blob.size > MAX_SCAN_PHOTO_BYTES) throw Error("Image too large");
      onCapture(
        new File([blob], `label-kamera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        }),
      );
    } catch {
      setError(
        "Foto belum berhasil diambil. Coba sekali lagi atau gunakan galeri.",
      );
    } finally {
      setCapturing(false);
    }
  }
  return (
    <div className="live-camera">
      <div className={`camera-viewport camera-state-${state}`}>
        <video
          ref={video}
          muted
          playsInline
          autoPlay
          aria-label="Pratinjau kamera langsung"
          hidden={state !== "ready"}
          className={facing === "user" ? "camera-mirrored" : ""}
        />
        {state === "ready" ? (
          <>
            <div className="camera-live">
              <span />
              Kamera aktif · foto {Math.min(
                files.length + 1,
                MAX_SCAN_PHOTOS,
              )}{" "}
              dari {MAX_SCAN_PHOTOS}
            </div>
            <div className="camera-guide" aria-hidden />
            <div className="camera-toolbar">
              <Button
                variant="ghost"
                aria-label="Ganti kamera"
                onClick={() =>
                  start(facing === "environment" ? "user" : "environment")
                }
              >
                <SwitchCamera size={20} />
              </Button>
              <Button
                variant="ghost"
                aria-label="Matikan kamera"
                onClick={stop}
              >
                <X size={20} />
              </Button>
            </div>
            <p className="camera-guidance">
              Isi bingkai dengan teks label. Hindari pantulan.
            </p>
          </>
        ) : (
          <div className="camera-idle">
            <ScanLine size={42} strokeWidth={1.2} aria-hidden />
            <h3>Foto langsung dari kamera.</h3>
            <p>
              Foto bagian depan, komposisi, dan tabel gizi. Tambahkan sudut lain
              jika ada teks yang terpotong.
            </p>
            <Button
              onClick={() => (state === "requesting" ? stop() : start())}
              disabled={!active}
            >
              {state === "requesting" ? "Batalkan" : "Nyalakan kamera"}
            </Button>
          </div>
        )}
      </div>
      {state === "ready" && (
        <div className="camera-capture-row">
          <p>
            {files.length >= MAX_SCAN_PHOTOS
              ? `${MAX_SCAN_PHOTOS} foto siap dibaca. Buang satu jika ingin menggantinya.`
              : files.length
                ? "Sudah lengkap? Baca sekarang, atau tambahkan sisi lainnya."
                : "Pastikan tulisan label terlihat jelas."}
          </p>
          <button
            type="button"
            ref={shutter}
            className="camera-shutter"
            aria-label="Ambil foto label"
            disabled={files.length >= MAX_SCAN_PHOTOS || capturing || !active}
            onClick={capture}
          >
            <Camera size={25} aria-hidden />
          </button>
          <span>
            {files.length}/{MAX_SCAN_PHOTOS} foto
          </span>
        </div>
      )}
      {error && (
        <p role="alert" className="camera-error">
          {error}
        </p>
      )}
      {files.length > 0 && (
        <div
          className="camera-selection-summary"
          role="status"
          aria-label="Pilihan foto"
        >
          <strong>
            {files.length} dari {MAX_SCAN_PHOTOS} foto dipilih
          </strong>
          <p>
            {files.length >= MAX_SCAN_PHOTOS
              ? "Batas tercapai. Buang foto yang ingin diganti."
              : "Bisa dibaca sekarang. Tambahkan sisi lain jika perlu."}
          </p>
        </div>
      )}
      {previews.length > 0 && (
        <div className="camera-selections" aria-label="Foto yang akan dibaca">
          {previews.map((url, index) => (
            <div key={url}>
              <PhotoInspector
                url={url}
                index={index}
                alt={`Foto pilihan ${index + 1}`}
                onInspect={stop}
              />
              <button
                type="button"
                className="camera-remove"
                aria-label={`Buang foto ${index + 1}`}
                disabled={!active}
                onClick={() => onRemove(index)}
              >
                <X size={15} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="camera-privacy">
        Pratinjau tetap di perangkat. Foto dikirim setelah Anda memilih Baca
        foto label.
      </p>
      <Button
        variant="ghost"
        className="camera-gallery"
        onClick={onGallery}
        disabled={!active || files.length >= MAX_SCAN_PHOTOS}
      >
        <ImagePlus size={17} aria-hidden />
        {files.length ? "Tambahkan foto dari galeri" : "Pilih foto dari galeri"}
      </Button>
    </div>
  );
}
