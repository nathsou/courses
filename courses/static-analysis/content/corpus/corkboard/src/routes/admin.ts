import express from 'express';
import { exec } from 'child_process';
import * as logger from 'logger';

export const adminRouter = express.Router();

adminRouter.post('/admin/backup', (req, res) => {
  const label = req.body.label;
  exec(`tar czf /backups/${label}.tgz /var/corkboard`, (error) => {
    if (error) {
      logger.error('Backup failed: ' + error.message);
      res.status(500).send('Backup failed');
      return;
    }
    res.json({ ok: true });
  });
});
