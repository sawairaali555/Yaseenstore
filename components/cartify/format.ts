import { currencyConfig } from "@/lib/cartify-products";

export function formatPrice(value: number, prefix = currencyConfig.prefix) {
  return `${prefix} ${new Intl.NumberFormat(currencyConfig.locale, {
    maximumFractionDigits: 0,
  }).format(value)}`;
}
