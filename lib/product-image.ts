export function productImage(value: string): string {
  if (/^(https?:\/\/|\/|data:image\/)/.test(value)) return value;
  return `/images/${value}.jpg`;
}
