// Choose readable text for both light and dark brand backgrounds.
export function themeForeground(color = '#203664'): string {
  const hex = color.replace('#', '');
  const expanded = hex.length === 3 ? hex.split('').map(value => value + value).join('') : hex;
  if (!/^[\da-f]{6}$/i.test(expanded)) return '#ffffff';
  const channels = [0, 2, 4].map(offset => {
    const value = parseInt(expanded.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? '#111827' : '#ffffff';
}
