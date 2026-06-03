"use client";

import type { User } from "@supabase/supabase-js";
import { Braces, LogOut } from "lucide-react";
import { TagBadge } from "@/app/components/custom/custom-tag-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Stats, TagCount } from "@/lib/api";
import { supabase } from "@/lib/supabase";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-2 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export function AppSidebar({
  user,
  stats,
  tags,
  activeTag,
  onSelectTag,
}: {
  user: User;
  stats: Stats | null;
  tags: TagCount[] | null;
  activeTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}) {
  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Braces className="size-4" />
          </div>
          <span className="font-heading text-base font-semibold">
            CodeStash
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="grid grid-cols-3 gap-2 px-2">
              {stats ? (
                <>
                  <Stat label="Snippets" value={stats.snippets} />
                  <Stat label="Tags" value={stats.topTags.length} />
                  <Stat label="Files" value={stats.attachments} />
                </>
              ) : (
                [0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tags</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            {tags === null ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-6" />
                ))}
              </div>
            ) : tags.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">No tags yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    onClick={() =>
                      onSelectTag?.(activeTag === t.tag ? null : t.tag)
                    }
                  >
                    <TagBadge
                      tag={t.tag}
                      count={t.count}
                      active={activeTag === t.tag}
                      className="cursor-pointer"
                    />
                  </button>
                ))}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{user.email}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="truncate px-2 py-1.5 text-sm font-medium">
              {user.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => supabase.auth.signOut()}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
