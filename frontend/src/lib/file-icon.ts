import iconMap from "./icon-map.json";

const {
  languageIds,
  fileExtensions,
  fileNames,
  file: DEFAULT,
} = iconMap as {
  languageIds: Record<string, string>;
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
  file: string;
};

const url = (name: string) => `/icons/${name}.svg`;

/** Material icon URL for a snippet language id (falls back to the file icon). */
export function iconForLanguage(language?: string | null): string {
  if (!language) return url(DEFAULT);
  // Some combobox ids (tsx, jsx) are extensions, not Material language ids.
  return url(languageIds[language] ?? fileExtensions[language] ?? DEFAULT);
}

/** Material icon URL for a filename — exact name, then longest extension, then fallback. */
export function iconForFileName(filename: string): string {
  const lower = filename.toLowerCase();
  if (fileNames[lower]) return url(fileNames[lower]);
  const segments = lower.split(".");
  for (let i = 1; i < segments.length; i++) {
    const ext = segments.slice(i).join(".");
    if (fileExtensions[ext]) return url(fileExtensions[ext]);
  }
  return url(DEFAULT);
}
