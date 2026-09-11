import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { telegramAuth } from './middleware/telegramAuth.js';
import { progressRouter } from './routes/progress.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

// Every route below requires a valid Telegram Mini App initData.
app.use('/api', telegramAuth, progressRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Точка входа — API запущен на порту ${port}`));
