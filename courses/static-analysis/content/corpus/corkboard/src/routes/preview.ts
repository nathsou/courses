import express from 'express';
import * as logger from 'logger';
import { extractTitle } from '../util/text';

export const previewRouter = express.Router();

const ALLOWED_HOSTS = ['corkboard.example', 'images.corkboard.example'];

previewRouter.post('/preview', async (req, res) => {
  const url: string = req.body.url;
  logger.info('Preview requested for ' + url);
  const response = await fetch(url);
  const html = await response.text();
  res.json({ title: extractTitle(html) });
});

previewRouter.post('/preview/trusted', async (req, res) => {
  const url = new URL(String(req.body.url));
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    res.status(400).send('Host not allowed');
    return;
  }
  const response = await fetch(url.toString());
  res.json({ title: extractTitle(await response.text()) });
});
