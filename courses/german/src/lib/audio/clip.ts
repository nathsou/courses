/**
 * The key a spoken clip is stored under: {braces} removed, whitespace collapsed. Shared by the
 * player and the clip collector (tools/audio), so both agree on what has a recording.
 */
export const clipKey = (text: string) => text.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
