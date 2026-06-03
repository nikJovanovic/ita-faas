// Distinct hues for tag chips. The theme's --chart-* tokens are all an orange
// ramp, so we use our own spread of hues for visible variety.
const TAG_HUES = [25, 145, 255, 300, 190, 95, 340, 55];

/** Deterministic oklch color for a tag string. */
export function tagColor(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  }
  const hue = TAG_HUES[h % TAG_HUES.length];
  return `oklch(0.7 0.15 ${hue})`;
}
