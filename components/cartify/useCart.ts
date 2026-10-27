"use client";

import { useSyncExternalStore } from "react";

const KEY = "cartify-cart";
const EMPTY: Record<string, number> = {};
let cachedText: string | null = null;
let cachedCart = EMPTY;

function snapshot() {
  try {
    const text = localStorage.getItem(KEY);
    if (text !== cachedText) {
      cachedText = text;
      try {
        const parsed: unknown = text ? JSON.parse(text) : {};
        cachedCart = parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? Object.fromEntries(Object.entries(parsed).filter(([, value]) =>
            typeof value === "number" && Number.isSafeInteger(value) && value > 0))
          : EMPTY;
      } catch {
        cachedCart = EMPTY;
      }
    }
  } catch {
    // Keep the in-memory cart when browser storage is unavailable.
  }
  return cachedCart;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("cartify-cart-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("cartify-cart-change", callback);
  };
}

export function useCart() {
  const cart = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  function changeQuantity(id: string, delta: number) {
    if (!id || !Number.isSafeInteger(delta)) return;
    const next = { ...snapshot() };
    const quantity = (next[id] ?? 0) + delta;
    if (!Number.isSafeInteger(quantity)) return;
    if (quantity > 0) next[id] = quantity;
    else delete next[id];
    cachedCart = next;
    const text = JSON.stringify(next);
    try {
      localStorage.setItem(KEY, text);
      cachedText = text;
    } catch { /* Keep the last observed storage text so a failed write cannot undo the in-memory cart. */ }
    window.dispatchEvent(new Event("cartify-cart-change"));
  }
  return { cart, changeQuantity };
}
