"use client";

import { useEffect, useMemo, useState } from "react";
import { highlightCode } from "@/lib/highlighter";
import { cn } from "@/lib/utils";

// Both layers MUST share these so the caret aligns with the highlighted text.
// Pin font-size AND line-height together (text-xs alone forces line-height 1rem,
// which would drift from the highlight layer line by line).
const SHARED =
  "m-0 whitespace-pre p-2 font-mono text-[0.75rem] leading-[1.625] [tab-size:2]";

// One opaque surface for the container and the (sticky) gutter, so there's no
// color jump between text rows, empty rows, or the gutter.
const SURFACE = "color-mix(in oklch, var(--muted) 40%, var(--background))";

export function CodeEditor({
  id,
  value,
  language,
  onChange,
  placeholder,
  className,
}: {
  id?: string;
  value: string;
  language: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const lineCount = useMemo(() => value.split("\n").length, [value]);

  useEffect(() => {
    let active = true;
    highlightCode(value, language)
      .then((out) => {
        if (active) setHtml(out);
      })
      .catch(() => {
        if (active) setHtml(null);
      });
    return () => {
      active = false;
    };
  }, [value, language]);

  return (
    <div
      className={cn("relative flex overflow-auto rounded-md border", className)}
      style={{ backgroundColor: SURFACE }}
    >
      {/* gutter — one logical line number per row */}
      <div
        aria-hidden
        className="sticky left-0 z-10 shrink-0 select-none border-r py-2 pr-2 pl-3 text-right font-mono text-[0.75rem] leading-relaxed text-muted-foreground/50"
        style={{ backgroundColor: SURFACE }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: line numbers are positional by nature
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* code — highlight layer with a transparent textarea on top */}
      <div className="relative flex-1">
        {html ? (
          <div
            className="shiki-editor"
            aria-hidden
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is trusted, generated from the user's own code
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className={cn("pointer-events-none text-foreground", SHARED)}>
            {value}
          </pre>
        )}
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          wrap="off"
          className={cn(
            "absolute inset-0 resize-none bg-transparent text-transparent caret-foreground outline-none placeholder:text-muted-foreground",
            SHARED,
          )}
        />
      </div>
    </div>
  );
}
