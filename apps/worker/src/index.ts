import express from 'express';

const app = express();
const port = Number(process.env.WORKER_PORT ?? 4000);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`worker listening on http://localhost:${port}`);
});
