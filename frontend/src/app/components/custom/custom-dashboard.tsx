"use client";

import type { User } from "@supabase/supabase-js";
import { FileCode, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/app/components/custom/custom-app-sidebar";
import { SnippetCard } from "@/app/components/custom/custom-snippet-card";
import { SnippetSheet } from "@/app/components/custom/custom-snippet-sheet";
import { ThemeToggle } from "@/app/components/custom/custom-theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Snippet, type Stats, type TagCount } from "@/lib/api";

export function Dashboard({ user }: { user: User }) {
  const [snippets, setSnippets] = useState<Snippet[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tags, setTags] = useState<TagCount[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<Snippet | "new" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refreshMeta = useCallback(() => {
    api
      .getStats()
      .then((r) => setStats(r.stats))
      .catch(() => setStats({ snippets: 0, attachments: 0, topTags: [] }));
    api
      .listTags()
      .then((r) => setTags(r.tags))
      .catch(() => setTags([]));
  }, []);

  useEffect(() => {
    refreshMeta();
  }, [refreshMeta]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey is an intentional refetch trigger after mutations
  useEffect(() => {
    let active = true;
    setSnippets(null);
    const q = query.trim();
    const request = q
      ? api.searchSnippets(q)
      : api.listSnippets({ tag: activeTag ?? undefined });
    const timer = setTimeout(
      () => {
        request
          .then((r) => {
            if (active) setSnippets(r.snippets);
          })
          .catch((e) => {
            if (!active) return;
            setSnippets([]);
            toast.error(e instanceof Error ? e.message : "Failed to load");
          });
      },
      q ? 250 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, activeTag, reloadKey]);

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        stats={stats}
        tags={tags}
        activeTag={activeTag}
        onSelectTag={setActiveTag}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="relative ml-1 max-w-md flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search snippets…"
              className="pl-8"
            />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              New
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col p-4">
          {activeTag && (
            <p className="mb-3 text-sm text-muted-foreground">
              Filtered by{" "}
              <span className="font-medium text-foreground">#{activeTag}</span>{" "}
              ·{" "}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => setActiveTag(null)}
              >
                clear
              </button>
            </p>
          )}

          {snippets === null ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : snippets.length === 0 ? (
            <Empty className="flex-1">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileCode />
                </EmptyMedia>
                <EmptyTitle>
                  {query ? "No matches" : "No snippets yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {query
                    ? "Try a different search."
                    : "Create your first snippet to get started."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {snippets.map((s) => (
                <SnippetCard key={s.id} snippet={s} onOpen={setEditing} />
              ))}
            </div>
          )}
        </main>
      </SidebarInset>

      <SnippetSheet
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        snippet={editing === "new" ? null : editing}
        onSaved={() => {
          setReloadKey((k) => k + 1);
          refreshMeta();
        }}
      />
    </SidebarProvider>
  );
}
