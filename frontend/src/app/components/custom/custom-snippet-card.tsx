"use client";

import { CodeBlock } from "@/app/components/custom/custom-code-block";
import { LanguageIcon } from "@/app/components/custom/custom-file-icon";
import { TagBadge } from "@/app/components/custom/custom-tag-badge";
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
      className="cursor-pointer gap-3 transition-all duration-200 animate-in fade-in-0 zoom-in-95 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
    >
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2">
          <LanguageIcon language={snippet.language} className="size-5" />
          <h3 className="truncate font-medium">{snippet.title}</h3>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <CodeBlock
          code={snippet.body}
          language={snippet.language}
          className="max-h-32"
        />
        {snippet.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {snippet.tags.map((t) => (
              <TagBadge key={t} tag={t} />
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
