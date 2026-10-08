import express from 'express';
import * as path from 'path';
import * as fs from 'fs';

export const attachmentsRouter = express.Router();

const UPLOADS = '/var/corkboard/uploads';

attachmentsRouter.get('/attachments/:name', (req, res) => {
  const file = path.join(UPLOADS, req.params.name);
  if (!fs.existsSync(file)) {
    res.status(404).send('Not found');
    return;
  }
  res.sendFile(file);
});

attachmentsRouter.get('/attachments/safe/:name', (req, res) => {
  const name = path.basename(req.params.name);
  res.sendFile(path.join(UPLOADS, name));
});

attachmentsRouter.delete('/attachments/:name', (req, res) => {
  let removed = false;
  const file = path.join(UPLOADS, path.basename(req.params.name));
  removed = fs.existsSync(file);
  if (removed) {
    fs.unlinkSync(file);
  }
  res.json({ removed: true });
});
