import { currencyConfig } from "@/lib/cartify-products";

const priceFormatter = new Intl.NumberFormat(currencyConfig.locale, {
  maximumFractionDigits: 0,
});

export function formatPrice(value: number, prefix = currencyConfig.prefix) {
  return `${prefix} ${priceFormatter.format(value)}`;
}
