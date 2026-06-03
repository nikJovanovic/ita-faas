import { Badge } from "@/components/ui/badge";
import { tagColor } from "@/lib/tag-color";
import { cn } from "@/lib/utils";

// A tag chip tinted with a deterministic --chart-* color. `active` makes it
// read as selected (stronger fill + ring) for the sidebar filter.
export function TagBadge({
  tag,
  count,
  active = false,
  className,
}: {
  tag: string;
  count?: number;
  active?: boolean;
  className?: string;
}) {
  const color = tagColor(tag);

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-normal", className)}
      style={{
        color,
        backgroundColor: `color-mix(in oklch, ${color} ${active ? 28 : 14}%, transparent)`,
        borderColor: `color-mix(in oklch, ${color} ${active ? 60 : 30}%, transparent)`,
      }}
    >
      {tag}
      {count != null && <span className="ml-1 opacity-70">{count}</span>}
    </Badge>
  );
}
