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
      const parsed = text ? JSON.parse(text) : {};
      cachedCart = Object.fromEntries(Object.entries(parsed).filter(([, value]) =>
        typeof value === "number" && Number.isInteger(value) && value > 0)) as Record<string, number>;
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
    const next = { ...snapshot() };
    const quantity = (next[id] ?? 0) + delta;
    if (quantity > 0) next[id] = quantity;
    else delete next[id];
    cachedCart = next;
    cachedText = JSON.stringify(next);
    try { localStorage.setItem(KEY, cachedText); } catch { /* Storage is optional. */ }
    window.dispatchEvent(new Event("cartify-cart-change"));
  }
  return { cart, changeQuantity };
}
