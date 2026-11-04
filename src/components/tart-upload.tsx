"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload } from "lucide-react";

export function TartUpload() {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function upload(file?: File) {
    if (!file || busy) return;
    setMessage("");
    setFailed(false);
    if (file.size > 4 * 1024 * 1024) {
      setFailed(true);
      setMessage("La imagen debe pesar hasta 4 MB.");
      if (input.current) input.current.value = "";
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/tartas", { method: "POST", body: form });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "No pudimos subir la tarta. Volvé a intentarlo.");
      setMessage("Tarta subida.");
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "No pudimos subir la tarta. Volvé a intentarlo.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="card mt-8 p-5">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only"
        aria-label="Subir Nueva Tarta" disabled={busy} onChange={(event) => void upload(event.target.files?.[0])} />
      <button type="button" className="primary-button w-full gap-2 disabled:opacity-60" disabled={busy}
        onClick={() => input.current?.click()}>
        {busy ? <LoaderCircle size={19} className="animate-spin" /> : <Upload size={19} />}
        {busy ? "Subiendo…" : "Subir Nueva Tarta"}
      </button>
      <p role="status" aria-live="polite" className={message ? `mt-3 text-center text-sm font-bold ${failed ? "text-red-200" : "text-[var(--green)]"}` : "sr-only"}>{message}</p>
    </div>
  );
}
