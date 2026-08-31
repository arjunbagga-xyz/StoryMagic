import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { loadConfig } from './src/router/config';
import { buildRouter, type ModelRouter } from './src/router/index';
import { type JsonSchema, type RouterError, type TextResult, type ImageResult, isErr } from './src/router/types';

// ---- Build the provider-agnostic router from config (env -> file -> default precedence) ----
// The server boots WITHOUT requiring any API key. Adapters are registered only for providers
// that have a usable key (or the keyless local/Ollama adapter). Failures are surfaced per-request.
const config = loadConfig();
let { router, registered } = buildRouter(config);
console.log(`[router] registered providers: ${registered.length ? registered.join(', ') : '(none — set SM_PROVIDER_* keys)'}`);
for (const task of ['page', 'define-word', 'translate', 'image'] as const) {
  const chain = config.policies[task]?.chain.map((s) => s.provider) ?? [];
  const missing = chain.filter((p) => !registered.includes(p));
  if (missing.length) {
    console.warn(`[router] task "${task}" chain references unavailable providers: ${missing.join(', ')} — will fail if reached`);
  }
}

// Test seam: lets the integration test inject a router backed by fake adapters without network.
export function setTestRouter(r: ModelRouter) {
  router = r;
}

// ---- Neutral schemas (shared by the router; adapters map them to vendor structured output) ----
const PAGE_SCHEMA: JsonSchema = {
  fields: [
    { name: 'storyText', type: 'string', description: 'The text for the current page in the primary language.' },
    { name: 'translationText', type: 'string', description: 'The translated text in the support language, if dual-language is active. Otherwise empty.' },
    { name: 'imagePrompt', type: 'string', description: 'A detailed prompt for the illustration of this page.' },
    { name: 'isEnd', type: 'boolean', description: 'True if this is the final page and the story has concluded.' },
    { name: 'lessonsCovered', type: 'array', items: 'string', description: 'Any lessons that were naturally covered in this page from the provided list.' },
  ],
  required: ['storyText', 'imagePrompt', 'isEnd'],
};

const DEFINE_SCHEMA: JsonSchema = {
  fields: [
    { name: 'definition', type: 'string', description: 'A simple child-friendly definition.' },
    { name: 'synonyms', type: 'array', items: 'string', description: 'Synonyms in the primary language.' },
    { name: 'translation', type: 'string', description: 'The translation into the support language.' },
  ],
  required: ['definition', 'synonyms', 'translation'],
};

// Frontend contract-compatible error mapping (fixes BLOCK A & D): never a fake SVG, typed error.
function imageErrorResponse(e: RouterError) {
  return { imageUrl: '', unavailable: true, errorType: e.errorType, detail: e.message };
}

// Build the Express app with the live router. Exported so tests can mount it on supertest
// without binding a port. The Vite dev middleware is skipped when SM_NO_VITE is set.
export async function createStoryMagicApp(): Promise<express.Express> {
  return buildApp(process.env.SM_NO_VITE === 'true');
}

async function buildApp(skipVite: boolean) {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/generate-page', pageHandler());
  app.post('/api/define-word', defineWordHandler());
  app.post('/api/translate-text', translateHandler());
  app.post('/api/generate-image', imageHandler());
  app.post('/api/subscribe', subscribeHandler());

  if (!skipVite) {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  return app;
}

function pageHandler() {
  return async (req: express.Request, res: express.Response) => {
    try {
      const {
        genre,
        lessons,
        ideologiesBlacklist,
        ideologiesWhitelist,
        currentPage,
        maxPages,
        previousPages,
        kidFeedback,
        age,
        primaryLang,
        supportLang,
      } = req.body;

      const sanitize = (input: any): string => {
        if (typeof input !== 'string') return '';
        return input
          .replace(/(ignore|override|bypass|forget)\b.*\b(instructions|rules|blacklist|whitelist|settings)/gi, '')
          .replace(/[<>'"]/g, '')
          .trim();
      };

      const cleanGenre = sanitize(genre || 'Space Adventure');
      const cleanFeedback = sanitize(kidFeedback || '');
      const cleanWhitelist = (ideologiesWhitelist || []).map(sanitize).filter(Boolean);
      const cleanBlacklist = (ideologiesBlacklist || []).map(sanitize).filter(Boolean);
      const cleanLessons = (lessons || []).map(sanitize).filter(Boolean);
      const cleanPrimary = sanitize(primaryLang || 'English');
      const cleanSupport = sanitize(supportLang || '');

      let ageGroupInstructions = '';
      let imageStyleInstruction = "cute, whimsical, vibrant children's book illustration styles";

      if (age !== undefined) {
        const childAge = Number(age);
        if (childAge <= 4) {
          ageGroupInstructions = '\nThe target reader is a toddler (ages 2-4). Write exactly 1-2 very simple sentences using basic vocabulary. Focus heavily on sensory details like colors, sounds, and simple actions. Keep it light, whimsical, and extremely easy to understand.';
          imageStyleInstruction = "cute, simple, whimsical, vibrant children's book illustration styles with bold outlines and flat colors";
        } else if (childAge <= 7) {
          ageGroupInstructions = '\nThe target reader is an early reader (ages 5-7). Write exactly 2-4 sentences. Introduce basic dialogue and straightforward character actions. Keep sentences relatively short but grammatically complete.';
          imageStyleInstruction = 'charming, whimsical, vibrant children\'s book illustration styles with rich colors and soft textures';
        } else if (childAge <= 11) {
          ageGroupInstructions = '\nThe target reader is an intermediate reader (ages 8-11). Write exactly 4-6 sentences. Incorporate richer descriptive vocabulary, clear character motivations, and clear plot progression.';
          imageStyleInstruction = 'detailed, whimsical, colorful storybook illustration style with depth and expression';
        } else if (childAge <= 15) {
          ageGroupInstructions = '\nThe target reader is a teenager (ages 12-15). Write exactly 6-10 sentences. Use complex vocabulary, nuanced dialog, clear subplots, and emotional depth suitable for a teenager.';
          imageStyleInstruction = 'expressive, detailed digital art, anime or graphic novel illustration style, modern aesthetics';
        } else {
          ageGroupInstructions = '\nThe target reader is an adult or young adult (ages 16+). Write exactly 8-12 sentences. Use sophisticated vocabulary, mature storytelling pacing, deep thematic elements, and advanced character development.';
          imageStyleInstruction = 'artistic, detailed digital painting, fine art style, moody or dramatic lighting, book cover quality';
        }
      }

      let prompt = `You are a creative, witty book author.
We are writing a story page by page.
The story text MUST be written in the primary language: ${cleanPrimary}.
The genre is ${cleanGenre}.
The book will be exactly ${maxPages} pages long in total. This is page ${currentPage + 1}.`;

      if (cleanLessons.length > 0) {
        prompt += `\nIncorporate these lessons naturally into the story if possible: ${cleanLessons.join(', ')}.`;
      }
      if (cleanWhitelist.length > 0) {
        prompt += `\nEnsure you focus on these general themes: ${cleanWhitelist.join(', ')}.`;
      }
      if (cleanBlacklist.length > 0) {
        prompt += `\nABSOLUTELY DO NOT include these blacklisted themes or topics under any circumstances: ${cleanBlacklist.join(', ')}.`;
      }

      prompt += `\n\nPrevious pages so far:\n`;
      if (previousPages && previousPages.length > 0) {
        previousPages.forEach((p: any, idx: number) => {
          prompt += `- Page ${idx + 1}: ${sanitize(p.text)}\n`;
        });
      } else {
        prompt += `(None yet. This is the very first page of the book.)\n`;
      }

      if (cleanFeedback) {
        prompt += `\nThe reader gave this feedback for what should happen next on this page: "${cleanFeedback}"\n`;
      }

      prompt += ageGroupInstructions;

      if (cleanSupport) {
        prompt += `\n\nDUAL LANGUAGE MODE ACTIVE:
You MUST translate the primary language story text for this page into the support language: ${cleanSupport}.
Provide this translation in the "translationText" response field. Keep the translation sentence-by-sentence aligned with the primary text.`;
      }

      prompt += `\n\nWrite the text for page ${currentPage + 1}. Make it engaging, witty, and perfectly sized for a single page with a big illustration. Adjust the pacing so the overarching plot naturally reaches a definitive conclusion exactly on page ${maxPages}. If this is page ${maxPages}, give it a satisfying ending. Provide a highly descriptive image prompt for the illustration of this exact page using terms like "${imageStyleInstruction}".`;

      const result = await router.generate({ task: 'page', prompt, schema: PAGE_SCHEMA, params: { age, primaryLang, supportLang } });
      if (isErr(result)) {
        return res.status(502).json({ error: result.message, errorType: result.errorType });
      }
      const data = safeJsonParse((result as TextResult).text);
      if (!data) {
        return res.status(502).json({ error: 'Failed to parse model JSON response', errorType: 'BAD_RESPONSE' });
      }
      res.json(data);
    } catch (e: any) {
      console.error('Error generating page:', e);
      res.status(500).json({ error: e?.message || 'Failed to generate page text' });
    }
  };
}

function defineWordHandler() {
  return async (req: express.Request, res: express.Response) => {
    try {
      const { word, age, primaryLang, supportLang } = req.body;

      const cleanWord = (word || '').trim().slice(0, 150);
      const cleanPrimary = (primaryLang || 'English').trim();
      const cleanSupport = (supportLang || 'English').trim();
      const childAge = Number(age || 6);

      const prompt = `You are an educational child-friendly dictionary, thesaurus, and translator.
We are looking up this selected text: "${cleanWord}"
Context:
- The text is written in this primary language: ${cleanPrimary}
- The reader's age is: ${childAge} years old.
- The target translation language is: ${cleanSupport}

Provide a response in the following JSON schema:
1. "definition": A simple, child-friendly definition of the word/phrase, scaled to a ${childAge}-year-old's vocabulary. Write this definition strictly in the primary language of the text (${cleanPrimary}). NEVER write the definition in English unless the primary language (${cleanPrimary}) is English.
2. "synonyms": Array of 3-5 simple child-friendly synonyms/alternatives in the primary language (${cleanPrimary}). (Leave empty if it is a full sentence).
3. "translation": The translation of the text into the support language (${cleanSupport}).

Keep it extremely simple, clear, and educational.`;

      const result = await router.generate({ task: 'define-word', prompt, schema: DEFINE_SCHEMA, params: { age, primaryLang, supportLang } });
      if (isErr(result)) {
        return res.status(502).json({ error: result.message, errorType: result.errorType });
      }
      const data = safeJsonParse((result as TextResult).text);
      if (!data) {
        return res.status(502).json({ error: 'Failed to parse model JSON response', errorType: 'BAD_RESPONSE' });
      }
      res.json(data);
    } catch (e: any) {
      console.error('Error defining word:', e);
      res.status(500).json({ error: e?.message || 'Failed to define word' });
    }
  };
}

function translateHandler() {
  return async (req: express.Request, res: express.Response) => {
    try {
      const { text, from, to } = req.body;
      const cleanText = (text || '').slice(0, 2000);
      const prompt = `You are a simple translator. Translate the following text from ${from} to ${to}. Provide ONLY the translated text, with no extra commentary, explanations, or quotes: "${cleanText}"`;
      const result = await router.generate({ task: 'translate', prompt, params: { from, to } });
      if (isErr(result)) {
        return res.status(502).json({ error: result.message, errorType: result.errorType });
      }
      res.json({ translation: (result as TextResult).text?.trim() || '' });
    } catch (e: any) {
      console.error('Error translating text:', e);
      res.status(500).json({ error: e?.message || 'Failed to translate' });
    }
  };
}

function imageHandler() {
  return async (req: express.Request, res: express.Response) => {
    const { prompt } = req.body;
    const result = await router.generate({ task: 'image', prompt });
    if (!isErr(result)) {
      return res.json({ imageUrl: (result as ImageResult).imageUrl });
    }
    // Graceful degradation, NOT a paid-key gate (fixes BLOCK A):
    console.warn('[image] generation failed:', result.errorType, result.message);
    res.json(imageErrorResponse(result));
  };
}

function subscribeHandler() {
  const BUTTONDOWN_KEY = process.env.BUTTONDOWN_API_KEY;
  return async (req: express.Request, res: express.Response) => {
    const email = String(req.body?.email || '').trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!BUTTONDOWN_KEY) {
      // Not configured yet — degrade gracefully so the UI can inform the user.
      return res.status(200).json({ configured: false, message: 'Newsletter not configured' });
    }
    try {
      const r = await fetch('https://api.buttondown.email/v1/subscribers', {
        method: 'POST',
        headers: {
          Authorization: `Token ${BUTTONDOWN_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, tags: ['storymagic-launch'] }),
      });
      if (r.ok || r.status === 201) {
        return res.json({ ok: true });
      }
      const err = await r.text();
      console.error('[subscribe] Buttondown error', r.status, err);
      return res.status(502).json({ error: 'Subscription failed' });
    } catch (e: any) {
      console.error('[subscribe]', e);
      return res.status(500).json({ error: 'Subscription failed' });
    }
  };
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text || '{}');
  } catch {
    // Some providers wrap JSON in code fences; strip them.
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try { return JSON.parse(m[1]); } catch { /* fall through */ }
    }
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1) {
      try { return JSON.parse(text.slice(first, last + 1)); } catch { /* fall through */ }
    }
    return null;
  }
}

// Auto-start only when run directly (not when imported by tests).
const invokedDirectly =
  process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.cjs'));
if (invokedDirectly && process.env.SM_NO_START !== 'true') {
  (async () => {
    const app = await createStoryMagicApp();
    app.listen(3000, '0.0.0.0', () => {
      console.log('Server running on http://localhost:3000');
    });
  })();
}
