import { iconForFileName, iconForLanguage } from "@/lib/file-icon";
import { cn } from "@/lib/utils";

// Renders a Material Icon Theme glyph as a static SVG from /public/icons.
// Decorative (aria-hidden); plain <img> is intentional for tiny static SVGs.

export function LanguageIcon({
  language,
  className,
}: {
  language?: string | null;
  className?: string;
}) {
  return (
    // biome-ignore lint/performance/noImgElement: tiny static SVG, no optimization needed
    <img
      src={iconForLanguage(language)}
      alt=""
      aria-hidden
      className={cn("size-4 shrink-0", className)}
    />
  );
}

export function FileIcon({ name, className }: { name: string; className?: string }) {
  return (
    // biome-ignore lint/performance/noImgElement: tiny static SVG, no optimization needed
    <img
      src={iconForFileName(name)}
      alt=""
      aria-hidden
      className={cn("size-4 shrink-0", className)}
    />
  );
}
