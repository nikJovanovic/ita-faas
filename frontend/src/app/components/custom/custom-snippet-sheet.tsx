"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CodeEditor } from "@/app/components/custom/custom-code-editor";
import { LanguageCombobox } from "@/app/components/custom/custom-language-combobox";
import { SnippetAttachments } from "@/app/components/custom/custom-snippet-attachments";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { api, type Snippet } from "@/lib/api";

function parseTags(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
}

export function SnippetSheet({
  open,
  onOpenChange,
  snippet,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet: Snippet | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [tagsText, setTagsText] = useState("");
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync form whenever the sheet opens (for create or a specific snippet).
  useEffect(() => {
    if (!open) return;
    setTitle(snippet?.title ?? "");
    setLanguage(snippet?.language ?? "plaintext");
    setTagsText(snippet?.tags.join(", ") ?? "");
    setBody(snippet?.body ?? "");
    setIsPublic(snippet?.is_public ?? false);
  }, [open, snippet]);

  const isEdit = Boolean(snippet);

  async function save() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body,
        language,
        tags: parseTags(tagsText),
        isPublic,
      };
      if (snippet) {
        await api.updateSnippet({ id: snippet.id, ...payload });
        toast.success("Snippet updated");
      } else {
        await api.createSnippet(payload);
        toast.success("Snippet created");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!snippet) return;
    try {
      await api.deleteSnippet(snippet.id);
      toast.success("Snippet deleted");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit snippet" : "New snippet"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the fields and save."
              : "Add a snippet to your vault."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Debounce hook"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Language</Label>
            <LanguageCombobox value={language} onChange={setLanguage} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="comma or space separated"
            />
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="body">Code</Label>
            <CodeEditor
              id="body"
              value={body}
              language={language}
              onChange={setBody}
              placeholder="paste your snippet…"
              className="min-h-48 flex-1"
            />
          </div>

          <Label className="flex items-center justify-between">
            <span>Public</span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </Label>

          {snippet && <SnippetAttachments snippetId={snippet.id} />}
        </div>

        <SheetFooter className="flex-row justify-between">
          {isEdit ? (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
                <Trash2 className="size-4" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this snippet?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes “{snippet?.title}” and its
                    attachments. This can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={remove}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={saving}>
            {saving && <Spinner />}
            {isEdit ? "Save changes" : "Create snippet"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
