/** Split text on backticks into plain and code parts, for inline code in widget prose. */
export function codeParts(s: string): { code: boolean; text: string }[] {
  return s.split('`').map((text, i) => ({ code: i % 2 === 1, text }));
}
