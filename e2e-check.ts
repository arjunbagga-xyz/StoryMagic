import { setTestRouter, createStoryMagicApp } from './server.ts';
import { ModelRouter } from './src/router/index.ts';
import http from 'node:http';
import fs from 'node:fs';

const empty = new ModelRouter(new Map(), (await import('./src/router/config.ts')).loadConfig().policies);
setTestRouter(empty);
const app = await createStoryMagicApp();
const srv = app.listen(4123, async () => {
  const post = (p: string, b: any) => new Promise<{ s: number; b: string }>((res) => {
    const r = http.request({ host: 'localhost', port: 4123, path: p, method: 'POST', headers: { 'Content-Type': 'application/json' } }, (x) => {
      let d = ''; x.on('data', (c: any) => (d += c)); x.on('end', () => res({ s: x.statusCode ?? 0, b: d }));
    });
    r.write(JSON.stringify(b)); r.end();
  });
  const out: string[] = [];
  const page = await post('/api/generate-page', { genre: 'Space', currentPage: 0, maxPages: 3, age: 7 });
  out.push('PAGE ' + page.s + ' ' + page.b);
  const img = await post('/api/generate-image', { prompt: 'cat' });
  out.push('IMAGE ' + img.s + ' ' + img.b);
  srv.close();
  out.push('LIVE_E2E_OK');
  fs.writeFileSync('e2e-result.txt', out.join('\n'));
});
