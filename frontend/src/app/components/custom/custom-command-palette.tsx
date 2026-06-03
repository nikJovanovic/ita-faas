"use client";

import { Moon, Plus, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LanguageIcon } from "@/app/components/custom/custom-file-icon";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { Snippet } from "@/lib/api";

export function CommandPalette({
  snippets,
  onNew,
  onOpen,
}: {
  snippets: Snippet[];
  onNew: () => void;
  onOpen: (snippet: Snippet) => void;
}) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search snippets or run a command"
    >
      <CommandInput placeholder="Type a command or search snippets…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem value="new snippet create" onSelect={() => run(onNew)}>
            <Plus className="size-4" />
            New snippet
          </CommandItem>
          <CommandItem
            value="toggle theme dark light"
            onSelect={() =>
              run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
            }
          >
            {resolvedTheme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
            Toggle theme
          </CommandItem>
        </CommandGroup>
        {snippets.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Snippets">
              {snippets.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.title} ${s.language} ${s.tags.join(" ")}`}
                  onSelect={() => run(() => onOpen(s))}
                >
                  <LanguageIcon language={s.language} />
                  <span className="truncate">{s.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
