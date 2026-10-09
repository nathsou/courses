import { query } from 'db';

export interface Post {
  id: number;
  author: string;
  title: string;
  body: string;
  board: string;
  pinned: boolean;
  createdAt: number;
}

export interface Account {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  admin: boolean;
}

export async function postsOnBoard(board: string, limit: number, offset: number): Promise<Post[]> {
  return query<Post>('SELECT * FROM posts WHERE board = ? ORDER BY pinned DESC, createdAt DESC LIMIT ? OFFSET ?', [board, limit, offset]);
}

export async function postById(id: number): Promise<Post | undefined> {
  const rows = await query<Post>('SELECT * FROM posts WHERE id = ?', [id]);
  return rows[0];
}

export async function accountByName(name: string): Promise<Account | undefined> {
  const rows = await query<Account>('SELECT * FROM accounts WHERE name = ?', [name]);
  return rows[0];
}
