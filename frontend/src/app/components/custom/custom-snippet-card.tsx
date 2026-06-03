"use client";

import { LanguageIcon } from "@/app/components/custom/custom-file-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Snippet } from "@/lib/api";
import { fullTime, relativeTime } from "@/lib/format";

export function SnippetCard({
  snippet,
  onOpen,
}: {
  snippet: Snippet;
  onOpen?: (snippet: Snippet) => void;
}) {
  return (
    <Card
      onClick={() => onOpen?.(snippet)}
      className="cursor-pointer gap-3 transition-colors hover:border-primary/50"
    >
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2">
          <LanguageIcon language={snippet.language} className="size-5" />
          <h3 className="truncate font-medium">{snippet.title}</h3>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <pre className="line-clamp-4 max-h-24 overflow-hidden whitespace-pre-wrap break-words rounded bg-muted/60 p-2 text-xs text-muted-foreground">
          {snippet.body || "—"}
        </pre>
        {snippet.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {snippet.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{snippet.language}</span>
          <Tooltip>
            <TooltipTrigger className="shrink-0">
              {relativeTime(snippet.updated_at)}
            </TooltipTrigger>
            <TooltipContent>{fullTime(snippet.updated_at)}</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
