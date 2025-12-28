
// Simple utility to parse HSL/Hex and calculate contrast ratio
// WCAG 2.0 level AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text.

export function parseColor(color) {
  if (!color) return null;
  
  // Handle HSL from shadcn tokens (e.g., "222.2 84% 4.9%")
  if (color.split(' ').length === 3 && !color.startsWith('hsl')) {
    const [h, s, l] = color.split(' ').map(v => parseFloat(v));
    return hslToRgb(h, s, l);
  }

  // Handle Hex
  if (color.startsWith('#')) {
    return hexToRgb(color);
  }
  
  return null;
}

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

function getLuminance(r, g, b) {
  const a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928
      ? v / 12.92
      : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(foreground, background) {
  const fg = parseColor(foreground);
  const bg = parseColor(background);

  if (!fg || !bg) return null;

  const lum1 = getLuminance(fg[0], fg[1], fg[2]);
  const lum2 = getLuminance(bg[0], bg[1], bg[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function getWCAGStatus(ratio) {
  if (!ratio) return { label: 'Unknown', color: 'text-gray-500' };
  if (ratio >= 7) return { label: 'AAA', color: 'text-green-600' };
  if (ratio >= 4.5) return { label: 'AA', color: 'text-green-500' };
  if (ratio >= 3) return { label: 'AA Large', color: 'text-yellow-600' };
  return { label: 'Fail', color: 'text-red-500' };
}
