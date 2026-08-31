import Anthropic from '@anthropic-ai/sdk';
import { ErrorClassifier } from '../classifier';
import {
  ProviderAdapter,
  type JsonSchema,
  type ProviderCapabilities,
  type TextRequest,
  type TextResult,
  type RouterError,
} from '../types';

// Anthropic adapter (text only — no first-party image). Image tasks skip this link in the chain.
// Structured output uses a single JSON tool; we parse the tool-return envelope.
export class AnthropicAdapter extends ProviderAdapter {
  readonly name = 'anthropic';
  private classifier = new ErrorClassifier();
  private client: Anthropic;

  constructor(
    apiKey: string,
    private models: Record<string, string>,
    baseUrl?: string,
  ) {
    super();
    this.client = new Anthropic({ apiKey, baseURL: baseUrl });
  }

  capabilities: ProviderCapabilities = {
    text: true,
    image: false,
    structuredOutput: true,
    maxOutputTokens: 8192,
    modelFor: (task: string) => this.models[task] ?? this.models['default'] ?? this.models['page'],
  };

  private systemNote(schema?: JsonSchema): string {
    const base = 'You are a helpful assistant.';
    if (!schema) return base;
    const fields = schema.fields
      .map((f) => `- ${f.name} (${f.type}${f.items ? ` of ${f.items}` : ''})${f.description ? `: ${f.description}` : ''}${schema.required.includes(f.name) ? ' [required]' : ''}`)
      .join('\n');
    return `${base}\nYou MUST call the "emit_result" tool with a JSON object whose fields are exactly:\n${fields}. Do not return prose.`;
  }

  private toolFor(schema: JsonSchema): Anthropic.Tool {
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
    return {
      name: 'emit_result',
      description: 'Return the structured result as a JSON object.',
      input_schema: { type: 'object', properties: props, required },
    };
  }

  async generateText(req: TextRequest): Promise<TextResult | RouterError> {
    const model = req.modelOverride || this.capabilities.modelFor(req.task);
    try {
      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: req.prompt }];
      const body: Anthropic.MessageCreateParams = {
        model,
        max_tokens: req.opts?.maxTokens ?? 4096,
        system: this.systemNote(req.schema),
        messages,
      };
      if (req.schema) {
        body.tools = [this.toolFor(req.schema)];
        body.tool_choice = { type: 'tool', name: 'emit_result' };
      }
      if (req.opts?.temperature !== undefined) body.temperature = req.opts.temperature;

      const r = await this.client.messages.create(body);
      let text = '';
      for (const block of r.content) {
        if (block.type === 'tool_use' && block.name === 'emit_result') {
          text = JSON.stringify(block.input);
        } else if (block.type === 'text') {
          text = text || block.text;
        }
      }
      if (!text) {
        return this.classifier.classify(new Error('Empty response from Anthropic'), this.name, model);
      }
      return {
        ok: true,
        text,
        provider: this.name,
        model,
        usage: r.usage ? { promptTokens: r.usage.input_tokens, completionTokens: r.usage.output_tokens } : undefined,
      };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }
}
