// Client-side Paddle.js loader and utilities.
import { resolvePaddlePrice } from "@/lib/payments.functions";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;
let paddleLoading: Promise<void> | null = null;

export function initializePaddle(): Promise<void> {
  if (paddleInitialized) return Promise.resolve();
  if (paddleLoading) return paddleLoading;
  if (!clientToken) {
    return Promise.reject(new Error("VITE_PAYMENTS_CLIENT_TOKEN não configurado"));
  }
  paddleLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://cdn.paddle.com/paddle/v2/paddle.js"]',
    );
    const init = () => {
      try {
        const paddleEnv = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
        window.Paddle.Environment.set(paddleEnv);
        window.Paddle.Initialize({ token: clientToken });
        paddleInitialized = true;
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    if (existing && window.Paddle) {
      init();
      return;
    }
    const script = existing ?? document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = init;
    script.onerror = () => reject(new Error("Falha ao carregar Paddle.js"));
    if (!existing) document.head.appendChild(script);
  });
  return paddleLoading;
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  return resolvePaddlePrice({ data: { priceId, environment: getPaddleEnvironment() } });
}
