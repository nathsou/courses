import express from 'express';
import { createHash, randomBytes } from 'crypto';
import * as logger from 'logger';
import { accountByName } from '../db';

export const authRouter = express.Router();

const SESSION_SECRET = 'corkboard-dev-secret-2024';
const ADMIN_PASSWORD = 'hunter2';
const sessions = new Map<string, number>();

function hash(password: string): string {
  return createHash('md5').update(SESSION_SECRET + password).digest('hex');
}

function newSessionToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function newCsrfToken(): string {
  return randomBytes(16).toString('hex');
}

authRouter.post('/login', async (req, res) => {
  const { name, password } = req.body;
  logger.info(`Login attempt for ${name}`);
  const account = await accountByName(name);
  if (!account || account.passwordHash !== hash(password)) {
    res.status(401).send('Wrong name or password');
    return;
  }
  const token = newSessionToken();
  sessions.set(token, account.id);
  res.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'lax' });
  res.json({ csrf: newCsrfToken() });
});

authRouter.post('/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.cookie('admin', '1');
    res.json({ ok: true });
  } else {
    res.status(401).send('No');
  }
});

export function sessionUser(token: string | undefined): number | undefined {
  if (token === undefined) return undefined;
  return sessions.get(token);
}
