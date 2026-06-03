"use client";

import { Paperclip, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileIcon } from "@/app/components/custom/custom-file-icon";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { type Attachment, api } from "@/lib/api";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

export function SnippetAttachments({ snippetId }: { snippetId: string }) {
  const [items, setItems] = useState<Attachment[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api
      .listAttachments(snippetId)
      .then((r) => setItems(r.attachments))
      .catch(() => setItems([]));
  }, [snippetId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { upload } = await api.createUploadUrl(snippetId, file.name);
      await api.uploadToSignedUrl(upload.signedUrl, file);
      toast.success(`Uploaded ${file.name}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function remove(att: Attachment) {
    const prev = items;
    setItems((cur) => cur?.filter((a) => a.id !== att.id) ?? null);
    try {
      await api.deleteAttachment(att.id);
    } catch (err) {
      setItems(prev ?? null);
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Paperclip className="size-4" />
          Attachments
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Spinner /> : <Upload className="size-4" />}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={onFile}
        />
      </div>

      {items === null ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          No files attached.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <FileIcon
                name={att.file_name ?? att.storage_path}
                className="size-5 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {att.file_name ?? att.storage_path}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(att.size_bytes)}
                  {att.processed ? " · processed" : " · pending"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(att)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
