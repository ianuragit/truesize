/**
 * Serves the built client. No database, no API, no auth — the quiz is entirely
 * client-side React state.
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, 'dist');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html is missing. Run `npm run build` first.');
  process.exit(1);
}

const port = process.env.PORT || 3000;
// 0.0.0.0, not localhost: a container-local bind fails Railway's health check.
const host = '0.0.0.0';

const app = express();

app.disable('x-powered-by');
app.use(
  express.static(dist, {
    // Vite fingerprints everything under /assets, so it can be cached hard.
    setHeaders(res, path) {
      if (path.includes(`${join('assets')}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

// Single page app: anything that is not a real file falls back to index.html.
app.get('*', (_req, res) => {
  res.sendFile(join(dist, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`Guess the giant listening on http://${host}:${port}`);
});
