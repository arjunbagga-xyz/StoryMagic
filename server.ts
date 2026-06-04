import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/generate-page', async (req, res) => {
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
      } = req.body;

      let prompt = `You are a creative, witty children's book author.
We are writing a story page by page.
The genre is ${genre}.
The book will be exactly ${maxPages} pages long in total. This is page ${currentPage + 1}.`;

      if (lessons && lessons.length > 0) {
        prompt += `\nIncorporate these lessons naturally into the story if possible: ${lessons.join(', ')}.`;
      }
      if (ideologiesWhitelist && ideologiesWhitelist.length > 0) {
        prompt += `\nEnsure you focus on these general themes: ${ideologiesWhitelist.join(', ')}.`;
      }
      if (ideologiesBlacklist && ideologiesBlacklist.length > 0) {
        prompt += `\nABSOLUTELY DO NOT include these blacklisted themes or topics: ${ideologiesBlacklist.join(', ')}.`;
      }

      prompt += `\n\nPrevious pages so far:\n`;
      if (previousPages && previousPages.length > 0) {
        previousPages.forEach((p: any, idx: number) => {
          prompt += `- Page ${idx + 1}: ${p.text}\n`;
        });
      } else {
        prompt += `(None yet. This is the very first page of the book.)\n`;
      }

      if (kidFeedback) {
        prompt += `\nThe child gave this feedback for what should happen next on this page: "${kidFeedback}"\n`;
      }

      prompt += `\nWrite the text for page ${currentPage + 1}. Make it engaging, witty, and perfectly sized for a single children's book page with a big illustration (around 2-5 sentences). Adjust the pacing so the overarching plot naturally reaches a definitive conclusion exactly on page ${maxPages}. If this is page ${maxPages}, give it a satisfying ending. Provide a highly descriptive image prompt for the illustration of this exact page using terms like "cute, whimsical, vibrant children's book illustration styles".`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                storyText: { type: Type.STRING, description: "The text for the current page." },
                imagePrompt: { type: Type.STRING, description: "A detailed prompt for the illustration of this page." },
                isEnd: { type: Type.BOOLEAN, description: "True if this is the final page and the story has concluded." },
                lessonsCovered: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Any lessons that were naturally covered in this page from the provided list." }
              },
              required: ["storyText", "imagePrompt", "isEnd"]
            }
          }
        });
      } catch (err: any) {
        console.warn("gemini-3.5-flash failed or hit demand limit. Trying gemini-3.1-flash-lite as safe fallback...", err);
        // Fall back to the highly stable gemini-3.1-flash-lite
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                storyText: { type: Type.STRING, description: "The text for the current page." },
                imagePrompt: { type: Type.STRING, description: "A detailed prompt for the illustration of this page." },
                isEnd: { type: Type.BOOLEAN, description: "True if this is the final page and the story has concluded." },
                lessonsCovered: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Any lessons that were naturally covered in this page from the provided list." }
              },
              required: ["storyText", "imagePrompt", "isEnd"]
            }
          }
        });
      }

      const data = JSON.parse(response.text || '{}');
      res.json(data);
    } catch (e: any) {
      console.error("Error generating page:", e);
      res.status(500).json({ error: e.message || 'Failed to generate page text' });
    }
  });

  app.post('/api/generate-image', async (req, res) => {
    const { prompt } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "4:3"
          }
        }
      });

      let base64Image = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (!base64Image) {
        throw new Error('No inlineData image found in Gemini response');
      }

      res.json({ imageUrl: `data:image/jpeg;base64,${base64Image}` });
    } catch (e: any) {
      console.error("Error generating image, serving custom themed SVG fallback:", e);
      // Create a gorgeous inline SVG page that mimics a storybook sketch
      const escapedPrompt = (prompt || "Fairy tale scene").replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
      );
      const svgFallback = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
        <rect width="100%" height="100%" fill="%23f9f8f2"/>
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="%23d9e2d5" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="%23ebd9c1" stop-opacity="0.6"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(%23g)"/>
        <circle cx="400" cy="220" r="120" fill="white" opacity="0.9"/>
        <text x="400" y="240" font-size="80" text-anchor="middle">✨</text>
        <text x="400" y="380" font-size="24" font-weight="bold" fill="%235a5646" font-family="serif" text-anchor="middle">Storybook Sketch</text>
        <text x="400" y="420" font-size="14" fill="%238c887a" font-family="sans-serif" text-anchor="middle" opacity="0.8">"${escapedPrompt.slice(0, 60)}..."</text>
        <rect x="250" y="470" width="300" height="40" rx="20" fill="%237a8d7d" opacity="0.9"/>
        <text x="400" y="495" font-size="12" font-weight="bold" fill="white" font-family="sans-serif" text-anchor="middle">Set AI Studio Paid Key for Live Images</text>
      </svg>`.replace(/#/g, '%23');

      res.json({ 
        imageUrl: svgFallback, 
        quotaExceeded: true, 
        errorDetail: e.message 
      });
    }
  });

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
