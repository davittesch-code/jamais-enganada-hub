import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const STORAGE_KEY = "cookie-consent-v1";

type Choice = "accepted" | "rejected";

export function hasCookieConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function CookieBanner() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v !== "accepted" && v !== "rejected") setVisivel(true);
    } catch {
      setVisivel(true);
    }
  }, []);

  const decidir = (choice: Choice) => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
      localStorage.setItem(`${STORAGE_KEY}-at`, new Date().toISOString());
      window.dispatchEvent(
        new CustomEvent("cookie-consent-changed", { detail: { choice } }),
      );
    } catch {
      // ignore storage errors
    }
    setVisivel(false);
  };

  if (!visivel) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:px-6 sm:pb-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="text-sm text-gray-700 leading-relaxed flex-1">
            Usamos cookies essenciais para o funcionamento da plataforma (como
            manter você logada). Com a sua autorização, podemos usar cookies
            não-essenciais para entender o uso do site e melhorar sua
            experiência. Saiba mais na nossa{" "}
            <Link
              to="/privacidade"
              className="underline font-medium"
              style={{ color: "#6B0F4B" }}
            >
              Política de Privacidade
            </Link>
            .
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => decidir("rejected")}
              className="px-4 min-h-[44px] rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[0.98]"
            >
              Recusar
            </button>
            <button
              type="button"
              onClick={() => decidir("accepted")}
              className="px-4 min-h-[44px] rounded-lg text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#A8006E" }}
            >
              Aceitar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
