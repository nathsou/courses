import express from 'express';
import { postsRouter } from './routes/posts';
import { attachmentsRouter } from './routes/attachments';
import { previewRouter } from './routes/preview';
import { authRouter } from './routes/auth';
import * as logger from 'logger';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use(express.static('public'));
app.use(authRouter);
app.use(postsRouter);
app.use(attachmentsRouter);
app.use(previewRouter);

app.listen(PORT, () => logger.info(`Corkboard listening on ${PORT}`));
