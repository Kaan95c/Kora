"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Error boundary racine (App Router) : capture les erreurs de rendu du root
 * layout que `app/error.tsx` ne peut pas attraper, et les remonte à Sentry.
 * Remplace tout le document → styles inline (le layout/CSS peut ne pas être chargé).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf9f5",
          color: "#1b1c1a",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
          Une erreur est survenue
        </h1>
        <p style={{ marginTop: "12px", color: "#444841", maxWidth: "28rem" }}>
          Quelque chose s&apos;est mal passé. Réessaie dans un instant.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "28px",
            height: "48px",
            padding: "0 24px",
            borderRadius: "8px",
            border: "none",
            background: "#52634c",
            color: "#fff",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
