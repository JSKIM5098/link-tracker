const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/o/1/l confusables

export function randomSlug(length = 7): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

const SLUG_RE = /^[a-zA-Z0-9_-]{2,64}$/;

export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

export function normalizeSlug(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-");
}
