"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { highlightCode } from "@/lib/highlighter";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  language,
  className,
  showCopy = true,
}: {
  code: string;
  language: string;
  className?: string;
  showCopy?: boolean;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    highlightCode(code || "", language)
      .then((out) => {
        if (active) setHtml(out);
      })
      .catch(() => {
        if (active) setHtml(null);
      });
    return () => {
      active = false;
    };
  }, [code, language]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div className="group relative">
      {showCopy && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Copy code"
          onClick={copy}
          className="absolute top-1.5 right-1.5 z-10 size-7 bg-background/60 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          {copied ? (
            <Check className="size-3.5 text-primary" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      )}
      {html ? (
        <div
          className={cn("shiki-host overflow-auto rounded text-xs", className)}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is trusted, generated from the user's own code
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className={cn(
            "overflow-auto whitespace-pre rounded bg-muted/60 p-2 text-xs text-muted-foreground",
            className,
          )}
        >
          {code || "—"}
        </pre>
      )}
    </div>
  );
}
