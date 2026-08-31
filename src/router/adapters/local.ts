import { Ollama } from 'ollama';
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

// Local adapter backed by Ollama (HTTP). No API key, can run fully offline. Great last-resort
// fallback for text. (Base Ollama `generate` does not return images; an image-capable vision
// pipeline can be wired separately and would set capabilities.image = true.)
export class LocalAdapter extends ProviderAdapter {
  readonly name = 'local';
  private classifier = new ErrorClassifier();
  private client: Ollama;

  constructor(
    baseUrl: string,
    private models: Record<string, string>,
  ) {
    super();
    this.client = new Ollama({ host: baseUrl });
  }

  capabilities: ProviderCapabilities = {
    text: true,
    image: false, // base Ollama `generate` does not return images; wire a vision pipeline separately if needed
    structuredOutput: true,
    maxOutputTokens: 4096,
    modelFor: (task: string) => this.models[task] ?? this.models['default'] ?? this.models['page'],
  };

  private systemNote(schema?: JsonSchema): string | undefined {
    if (!schema) return undefined;
    const fields = schema.fields
      .map((f) => `- ${f.name} (${f.type}${f.items ? ` of ${f.items}` : ''})${f.description ? `: ${f.description}` : ''}${schema.required.includes(f.name) ? ' [required]' : ''}`)
      .join('\n');
    return `You MUST respond with a JSON object whose top-level fields are exactly:\n${fields}\nNo text outside the JSON object.`;
  }

  async generateText(req: TextRequest): Promise<TextResult | RouterError> {
    const model = req.modelOverride || this.capabilities.modelFor(req.task);
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      const sys = this.systemNote(req.schema);
      if (sys) messages.push({ role: 'system', content: sys });
      messages.push({ role: 'user', content: req.prompt });

      const r = await this.client.chat({
        model,
        messages,
        format: req.schema ? this.toOllamaFormat(req.schema) : undefined,
        options: {
          num_predict: req.opts?.maxTokens ?? 2048,
          temperature: req.opts?.temperature,
          seed: req.opts?.seed,
        },
      });
      const text = r.message?.content ?? '';
      if (!text) {
        return this.classifier.classify(new Error('Empty response from local model'), this.name, model);
      }
      return { ok: true, text, provider: this.name, model };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }

  async generateImage(req: ImageRequest): Promise<ImageResult | RouterError> {
    // Base Ollama `generate` does not return images. The router skips this adapter for image
    // tasks (see capabilities.image === false). This method is only reached if wired to a vision
    // model pipeline; otherwise we report unsupported rather than fabricating data.
    return { ok: false, errorType: 'SCHEMA_UNSUPPORTED', message: 'Local adapter does not generate images via base Ollama', provider: this.name, retryable: false };
  }

  // Ollama's `format` accepts a JSON schema draft. We emit a permissive object schema.
  private toOllamaFormat(schema: JsonSchema): Record<string, any> {
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
