import type { Account, Post } from '../db';

/** The posts of a user, as a plain-text list. */
export function digest(user: Account | undefined, posts: Post[]): string {
  if (!user) {
    return '';
  }
  const lines: string[] = [];
  for (const post of posts) {
    if (user && post.author === user.name) {
      lines.push(`* ${post.title}`);
    }
  }
  return lines.join('\n');
}

/** A greeting; logs a warning for anonymous visitors but carries on. */
export function greeting(user: Account | undefined): string {
  if (!user) {
    console.warn('anonymous visitor');
  }
  if (user) {
    return `Hello, ${user.name}`;
  }
  return 'Hello';
}

/** Posts a user may edit: none for banned users, everything for admins. */
export function editable(user: Account, banned: boolean, posts: Post[]): Post[] {
  if (banned) {
    return [];
  }
  if (user.admin) {
    return posts;
  }
  return posts.filter((p) => !banned && p.author === user.name);
}
