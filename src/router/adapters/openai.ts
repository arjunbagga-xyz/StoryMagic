import OpenAI from 'openai';
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

// OpenAI adapter. Text + image in one vendor — good primary or fallback.
// Supports OpenAI-compatible endpoints via `baseUrl` (Azure, local servers, etc.).
export class OpenAIAdapter extends ProviderAdapter {
  readonly name = 'openai';
  private classifier = new ErrorClassifier();
  private client: OpenAI;

  constructor(
    apiKey: string,
    private models: Record<string, string>,
    baseUrl?: string,
  ) {
    super();
    this.client = new OpenAI({ apiKey, baseURL: baseUrl, dangerouslyAllowBrowser: false });
  }

  capabilities: ProviderCapabilities = {
    text: true,
    image: true,
    structuredOutput: true,
    maxOutputTokens: 16384,
    modelFor: (task: string) => this.models[task] ?? this.models['default'] ?? this.models['page'],
  };

  private systemNote(schema?: JsonSchema): string | undefined {
    if (!schema) return undefined;
    const fields = schema.fields
      .map((f) => `- ${f.name} (${f.type}${f.items ? ` of ${f.items}` : ''})${f.description ? `: ${f.description}` : ''}${schema.required.includes(f.name) ? ' [required]' : ''}`)
      .join('\n');
    return `You MUST respond with a JSON object whose top-level fields are exactly:\n${fields}\nDo not include any text outside the JSON object.`;
  }

  async generateText(req: TextRequest): Promise<TextResult | RouterError> {
    const model = req.modelOverride || this.capabilities.modelFor(req.task);
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      const sys = this.systemNote(req.schema);
      if (sys) messages.push({ role: 'system', content: sys });
      messages.push({ role: 'user', content: req.prompt });

      const body: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages,
        max_tokens: req.opts?.maxTokens ?? 4096,
      };
      if (req.opts?.temperature !== undefined) (body as any).temperature = req.opts.temperature;
      if (req.opts?.seed !== undefined) (body as any).seed = req.opts.seed;

      // Prefer native structured output when a schema is requested and the model supports it.
      if (req.schema) {
        (body as any).response_format = {
          type: 'json_schema',
          json_schema: {
            name: `storymagic_${req.task.replace(/-/g, '_')}`,
            strict: false,
            schema: this.toJSONSchema(req.schema),
          },
        };
      }

      const r = await this.client.chat.completions.create(body);
      const msg = r.choices?.[0]?.message;
      // Prefer content; reasoning models (e.g. some free tiers) emit the answer in `reasoning`
      // and leave `content` null, so fall back to reasoning rather than failing the request.
      // `reasoning` exists at runtime on some reasoning models (free tiers) but
      // is absent from the SDK's ChatCompletionMessage type — cast to read it.
      const text = msg?.content ?? (msg as any)?.reasoning ?? '';
      if (!text) {
        return this.classifier.classify(new Error('Empty response from OpenAI'), this.name, model);
      }
      return {
        ok: true,
        text,
        provider: this.name,
        model,
        usage: r.usage ? { promptTokens: r.usage.prompt_tokens, completionTokens: r.usage.completion_tokens } : undefined,
      };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }

  async generateImage(req: ImageRequest): Promise<ImageResult | RouterError> {
    const model = this.capabilities.modelFor('image');
    try {
      const r = await this.client.images.generate({
        model,
        prompt: req.prompt,
        n: req.opts?.count ?? 1,
        size: aspectToSize(req.opts?.aspectRatio),
        response_format: 'b64_json',
      } as any);
      const b64 = (r.data?.[0] as any)?.b64_json;
      if (!b64) {
        return this.classifier.classify(new Error('No image returned from OpenAI'), this.name, model);
      }
      const mime = req.opts?.mimeType ?? 'image/png';
      return { ok: true, imageUrl: `data:${mime};base64,${b64}`, provider: this.name, model };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }

  private toJSONSchema(schema: JsonSchema): Record<string, any> {
    const props: Record<string, any> = {};
    const required: string[] = [];
    for (const f of schema.fields) {
      let t: any;
      switch (f.type) {
        case 'string': t = { type: 'string' }; break;
        case 'number': t = { type: 'number' }; break;
        case 'boolean': t = { type: 'boolean' }; break;
        case 'array': t = { type: 'array', items: { type: f.items ?? 'string' } }; break;
        case 'object': t = { type: 'object', properties: {} }; break;
        default: t = { type: 'string' };
      }
      if (f.description) t.description = f.description;
      props[f.name] = t;
      if (schema.required.includes(f.name)) required.push(f.name);
    }
    return { type: 'object', properties: props, required };
  }
}

function aspectToSize(aspect?: '4:3' | '1:1' | '16:9'): string {
  switch (aspect) {
    case '1:1': return '1024x1024';
    case '16:9': return '1792x1024';
    case '4:3':
    default: return '1024x768';
  }
}
