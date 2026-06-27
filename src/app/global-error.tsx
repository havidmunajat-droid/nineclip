"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          background: "#09090b",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              width: 64,
              height: 64,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "rgba(239,68,68,0.1)",
              color: "#f87171",
              marginBottom: 24,
            }}
          >
            <AlertTriangle width={32} height={32} />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>
            Terjadi kesalahan
          </h1>
          <p style={{ color: "#a1a1aa", fontSize: "0.875rem", marginBottom: 24 }}>
            Sesuatu yang tidak terduga terjadi. Coba muat ulang halaman.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "#52525b", marginBottom: 16 }}>
              {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0.5rem 1.25rem",
              background: "#a3e635",
              color: "#1a2e05",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            <RefreshCw width={14} height={14} />
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
