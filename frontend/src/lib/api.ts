import { supabase } from "./supabase";

const FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const APIKEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

export interface Snippet {
  id: string;
  user_id: string;
  title: string;
  body: string;
  language: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  snippet_id: string | null;
  user_id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  processed: boolean;
  created_at: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface Stats {
  snippets: number;
  attachments: number;
  topTags: TagCount[];
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  snippet_count: number;
  created_at: string;
}

async function headers(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    apikey: APIKEY,
    Authorization: `Bearer ${data.session?.access_token ?? ""}`,
  };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${FN}/${path}`, {
    ...init,
    headers: { ...(await headers()), ...(init.headers ?? {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  // profile
  getProfile: () => call<{ profile: Profile | null }>("profile-get"),
  updateProfile: (input: { username?: string; displayName?: string }) =>
    call<{ profile: Profile }>("profile-update", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // snippets
  listSnippets: (opts: { tag?: string; language?: string } = {}) => {
    const q = new URLSearchParams();
    if (opts.tag) q.set("tag", opts.tag);
    if (opts.language) q.set("language", opts.language);
    const qs = q.toString();
    return call<{ snippets: Snippet[] }>(`snippets-list${qs ? `?${qs}` : ""}`);
  },
  getSnippet: (id: string) =>
    call<{ snippet: Snippet }>(`snippets-get?id=${id}`),
  searchSnippets: (query: string) =>
    call<{ query: string; snippets: Snippet[] }>(
      `snippets-search?q=${encodeURIComponent(query)}`,
    ),
  createSnippet: (input: {
    title: string;
    body?: string;
    language?: string;
    tags?: string[];
    isPublic?: boolean;
  }) =>
    call<{ snippet: Snippet }>("snippets-create", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateSnippet: (input: {
    id: string;
    title?: string;
    body?: string;
    language?: string;
    tags?: string[];
    isPublic?: boolean;
  }) =>
    call<{ snippet: Snippet }>("snippets-update", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteSnippet: (id: string) =>
    call<{ deleted: string }>(`snippets-delete?id=${id}`, { method: "DELETE" }),

  // tags & stats
  listTags: () => call<{ tags: TagCount[] }>("tags-list"),
  getStats: () => call<{ stats: Stats }>("stats-get"),

  // attachments
  listAttachments: (snippetId?: string) =>
    call<{ attachments: Attachment[] }>(
      `attachments-list${snippetId ? `?snippetId=${snippetId}` : ""}`,
    ),
  createUploadUrl: (snippetId: string, fileName: string) =>
    call<{
      attachment: Attachment;
      upload: { signedUrl: string; token: string; path: string };
    }>("attachments-create-url", {
      method: "POST",
      body: JSON.stringify({ snippetId, fileName }),
    }),
  deleteAttachment: (id: string) =>
    call<{ deleted: string }>(`attachments-delete?id=${id}`, {
      method: "DELETE",
    }),
  uploadToSignedUrl: async (signedUrl: string, file: File) => {
    const res = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  },
};
