import { GoogleGenAI, Type } from '@google/genai';
import { ErrorClassifier } from '../classifier';
import {
  ProviderAdapter,
  type ImageRequest,
  type ImageResult,
  type JsonSchema,
  type ProviderCapabilities,
  type TextRequest,
  type TextResult,
  type RouterError,
} from '../types';

// Gemini adapter. All Gemini-specific coupling lives here.
// The `models` map remaps AI-Studio-only aliases (gemini-3.5-flash, imagen-4.0-generate-001)
// to real GA ids when running off AI Studio.
export class GeminiAdapter extends ProviderAdapter {
  readonly name = 'gemini';
  private classifier = new ErrorClassifier();

  constructor(
    private ai: GoogleGenAI,
    private models: Record<string, string>,
    private maxTokens = 8192,
  ) {
    super();
  }

  capabilities: ProviderCapabilities = {
    text: true,
    image: true,
    structuredOutput: true,
    maxOutputTokens: 8192,
    modelFor: (task: string) => this.models[task] ?? this.models['default'] ?? this.models['page'],
  };

  private toGeminiSchema(schema: JsonSchema) {
    const props: Record<string, any> = {};
    for (const f of schema.fields) {
      let t: any;
      switch (f.type) {
        case 'string': t = Type.STRING; break;
        case 'number': t = Type.NUMBER; break;
        case 'boolean': t = Type.BOOLEAN; break;
        case 'array': t = Type.ARRAY; break;
        case 'object': t = Type.OBJECT; break;
        default: t = Type.STRING;
      }
      const prop: any = { type: t, description: f.description ?? '' };
      if (f.type === 'array' && f.items) {
        const it = f.items === 'number' ? Type.NUMBER : f.items === 'boolean' ? Type.BOOLEAN : Type.STRING;
        prop.items = { type: it };
      }
      props[f.name] = prop;
    }
    return {
      type: Type.OBJECT,
      properties: props,
      required: schema.required,
    };
  }

  async generateText(req: TextRequest): Promise<TextResult | RouterError> {
    const model = req.modelOverride || this.capabilities.modelFor(req.task);
    try {
      const config: any = {
        maxOutputTokens: req.opts?.maxTokens ?? this.maxTokens,
      };
      if (req.schema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = this.toGeminiSchema(req.schema);
      }
      if (req.opts?.temperature !== undefined) config.temperature = req.opts.temperature;
      if (req.opts?.seed !== undefined) config.seed = req.opts.seed;

      const r = await this.ai.models.generateContent({
        model,
        contents: req.prompt,
        config,
      });
      const text = r.text ?? '';
      if (!text) {
        return this.classifier.classify(new Error('Empty response from Gemini'), this.name, model);
      }
      return { ok: true, text, provider: this.name, model, usage: toUsage(r) };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }

  async generateImage(req: ImageRequest): Promise<ImageResult | RouterError> {
    const model = this.capabilities.modelFor('image');
    try {
      const r = await this.ai.models.generateImages({
        model,
        prompt: req.prompt,
        config: {
          numberOfImages: req.opts?.count ?? 1,
          outputMimeType: req.opts?.mimeType ?? 'image/jpeg',
          aspectRatio: req.opts?.aspectRatio ?? '4:3',
        },
      });
      const bytes = r.generatedImages?.[0]?.image?.imageBytes;
      if (!bytes) {
        return this.classifier.classify(new Error('No image returned from Gemini'), this.name, model);
      }
      const mime = req.opts?.mimeType ?? 'image/jpeg';
      return { ok: true, imageUrl: `data:${mime};base64,${bytes}`, provider: this.name, model };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }
}

function toUsage(r: any): TextResult['usage'] {
  try {
    const u = r?.usageMetadata;
    if (!u) return undefined;
    return {
      promptTokens: u.promptTokenCount ?? u.promptTokens ?? undefined,
      completionTokens: u.candidatesTokenCount ?? u.candidatesTokens ?? undefined,
    };
  } catch {
    return undefined;
  }
}
