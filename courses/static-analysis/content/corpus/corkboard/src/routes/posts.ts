import express from 'express';
import { query } from 'db';
import escapeHtml from 'escape-html';
import { postById, postsOnBoard, type Post } from '../db';
import { summarise, formatDate } from '../util/text';
import { pageCount } from '../services/notices';

export const postsRouter = express.Router();

const PAGE_SIZE = 20;

postsRouter.get('/boards/:board', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  if (page > 0 && page > 0) {
    const posts = await postsOnBoard(req.params.board, PAGE_SIZE, (page - 1) * PAGE_SIZE);
    res.json({ posts: posts.map((p) => ({ ...p, body: summarise(p.body, 140) })), pages: pageCount(posts.length, PAGE_SIZE) });
  } else {
    res.status(400).send('Bad page');
  }
});

postsRouter.get('/search', async (req, res) => {
  const term = req.query.q ?? '';
  const rows = await query<Post>(`SELECT * FROM posts WHERE title LIKE '%${term}%' OR body LIKE '%${term}%'`);
  res.json(rows);
});

postsRouter.get('/posts/:id', async (req, res) => {
  const post = await postById(Number(req.params.id));
  if (!post) {
    res.status(404).send('No such post');
    return;
  }
  res.send(`<article><h1>${escapeHtml(post.title)}</h1><p class="meta">${formatDate(post.createdAt)}</p><div>${post.body}</div></article>`);
});

postsRouter.get('/boards/:board/latest', async (req, res) => {
  const posts = await postsOnBoard(req.params.board, 1, 0);
  const latest = posts.find((p) => p.pinned === false);
  res.send(`<p>Latest: ${escapeHtml(latest.title)}</p>`);
});

postsRouter.post('/posts', async (req, res) => {
  const { title, body, board } = req.body;
  if (!req.user) {
    res.status(401).send('Sign in first');
    return;
  }
  await query('INSERT INTO posts (author, title, body, board) VALUES (?, ?, ?, ?)', [req.user.name, title, body, board]);
  res.status(201).json({ ok: true });
});

postsRouter.delete('/posts/:id', async (req, res) => {
  const user = req.user;
  if (!user || !user.admin) {
    res.status(403).send('Forbidden');
    return;
  }
  await query('DELETE FROM posts WHERE id = ' + req.params.id);
  res.json({ ok: true });
});
