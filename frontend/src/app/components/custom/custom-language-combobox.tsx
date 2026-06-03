"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { LanguageIcon } from "@/app/components/custom/custom-file-icon";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Curated list; ids match Material Icon Theme language ids (see icon-map.json).
const LANGUAGES: { id: string; label: string }[] = [
  { id: "plaintext", label: "Plain text" },
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "tsx", label: "TSX (React)" },
  { id: "jsx", label: "JSX (React)" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "php", label: "PHP" },
  { id: "ruby", label: "Ruby" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "sql", label: "SQL" },
  { id: "shellscript", label: "Shell" },
  { id: "markdown", label: "Markdown" },
];

export function LanguageCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" className="w-full justify-between" />}
      >
        <span className="flex items-center gap-2 truncate">
          <LanguageIcon language={value} />
          {current?.label ?? value}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search language…" />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup>
              {LANGUAGES.map((l) => (
                <CommandItem
                  key={l.id}
                  value={`${l.label} ${l.id}`}
                  onSelect={() => {
                    onChange(l.id);
                    setOpen(false);
                  }}
                >
                  <LanguageIcon language={l.id} />
                  <span className="flex-1">{l.label}</span>
                  {value === l.id && <Check className="size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
