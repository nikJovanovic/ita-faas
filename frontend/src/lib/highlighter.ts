import { createHighlighter, type Highlighter } from "shiki";

// Dual-theme: Shiki emits CSS vars for both; we flip them via `.dark` in CSS.
export const SHIKI_THEMES = { light: "github-light", dark: "github-dark" };

// Map our combobox/language ids to Shiki language ids where they differ.
const LANG_ALIASES: Record<string, string> = {
  plaintext: "text",
  shellscript: "shell",
};

let highlighterPromise: Promise<Highlighter> | null = null;
const loaded = new Set<string>();

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
      langs: [],
    });
  }
  return highlighterPromise;
}

/** Highlight code to dual-theme HTML. Falls back to plain text for unknown langs. */
export async function highlightCode(
  code: string,
  language: string,
): Promise<string> {
  const hl = await getHighlighter();
  const lang = LANG_ALIASES[language] ?? language;

  let resolved = "text";
  if (lang !== "text") {
    if (!loaded.has(lang)) {
      try {
        await hl.loadLanguage(lang as Parameters<typeof hl.loadLanguage>[0]);
        loaded.add(lang);
      } catch {
        // Unknown language — keep the plain-text fallback.
      }
    }
    if (loaded.has(lang)) resolved = lang;
  }

  return hl.codeToHtml(code, {
    lang: resolved,
    themes: SHIKI_THEMES,
    defaultColor: false,
  });
}
