/** localStorage that never throws (blocked in some embeds, e.g. itch.io iframes with strict privacy settings). */
export function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* settings just won't persist */
  }
}
