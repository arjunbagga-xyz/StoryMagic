var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  createStoryMagicApp: () => createStoryMagicApp,
  setTestRouter: () => setTestRouter
});
module.exports = __toCommonJS(server_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = require("vite");

// src/router/config.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var DEFAULT_MODELS = {
  page: "gemini-2.0-flash",
  "define-word": "gemini-2.0-flash",
  translate: "gemini-2.0-flash",
  image: "imagen-3.0-generate-002"
};
function defaultConfig() {
  return {
    providers: {
      // Gemini defaults use real GA model ids (not AI-Studio-only aliases like gemini-3.5-flash).
      gemini: {
        models: { ...DEFAULT_MODELS }
      },
      openai: {
        models: {
          page: "gpt-4o-mini",
          "define-word": "gpt-4o-mini",
          translate: "gpt-4o-mini",
          image: "gpt-image-1"
        }
      },
      anthropic: {
        models: {
          page: "claude-3-5-haiku-latest",
          "define-word": "claude-3-5-haiku-latest",
          translate: "claude-3-5-haiku-latest"
        }
      },
      local: {
        // No baseUrl by default: the local/Ollama adapter only registers when the user sets
        // SM_PROVIDER_LOCAL_BASE_URL (or a config file entry). This keeps "boot with zero keys"
        // truly zero-provider unless Ollama is explicitly wired up.
        models: {
          page: "llama3.1:8b",
          "define-word": "llama3.1:8b",
          translate: "llama3.1:8b"
        }
      },
      // OpenAI-compatible proxies. Both ride the OpenAIAdapter with a custom baseUrl.
      // Nous (Nous Research inference API) and OpenRouter share the OpenAI chat+images shape.
      nous: {
        // Default model mirrors the Hermes instance's active model; override per-task via
        // SM_PROVIDER_NOUS_MODELS_PAGE etc. if your Nous account exposes a different slug.
        models: {
          page: "tencent/hy3:free",
          "define-word": "tencent/hy3:free",
          translate: "tencent/hy3:free",
          image: "tencent/hy3:free"
          // Nous is text-only; router skips it for image chains
        }
      },
      openrouter: {
        models: {
          page: "openai/gpt-4o-mini",
          "define-word": "openai/gpt-4o-mini",
          translate: "openai/gpt-4o-mini",
          image: "openai/dall-e-3"
        }
      }
    },
    // Default chains: lead with Nous (OpenAI-compatible, keyed from the Hermes instance),
    // fall back across vendors, end on local Ollama. Gemini is demoted to last-resort only
    // because StoryMagic is no longer Gemini-locked.
    policies: {
      page: {
        task: "page",
        chain: [
          { provider: "nous", retries: 2, backoffMs: 600 },
          { provider: "openrouter", retries: 2, backoffMs: 600 },
          { provider: "openai", retries: 2, backoffMs: 600 },
          { provider: "local", retries: 1 }
        ],
        sanitize: true
      },
      "define-word": {
        task: "define-word",
        chain: [
          { provider: "nous", retries: 2, backoffMs: 600 },
          { provider: "openrouter", retries: 2, backoffMs: 600 },
          { provider: "openai", retries: 2, backoffMs: 600 }
        ],
        sanitize: true
      },
      translate: {
        task: "translate",
        chain: [
          { provider: "nous", retries: 2, backoffMs: 600 },
          { provider: "openrouter", retries: 2, backoffMs: 600 },
          { provider: "anthropic", retries: 2, backoffMs: 600 }
        ]
      },
      image: {
        task: "image",
        chain: [
          { provider: "openrouter", retries: 2, backoffMs: 600 },
          { provider: "openai", retries: 2, backoffMs: 600 },
          { provider: "gemini", retries: 2, backoffMs: 600 }
        ]
      }
    }
  };
}
var PROVIDER_KEYS = ["gemini", "openai", "anthropic", "local", "nous", "openrouter"];
var TASKS = ["page", "define-word", "translate", "image"];
function readEnvOverrides() {
  const providers = {};
  for (const prov of PROVIDER_KEYS) {
    const cfg = {};
    const apiKey = process.env[`SM_PROVIDER_${prov.toUpperCase()}_API_KEY`];
    if (apiKey) cfg.apiKey = apiKey;
    const baseUrl = process.env[`SM_PROVIDER_${prov.toUpperCase()}_BASE_URL`];
    if (baseUrl) cfg.baseUrl = baseUrl;
    const models = {};
    let hasModels = false;
    for (const task of TASKS) {
      const m = process.env[`SM_PROVIDER_${prov.toUpperCase()}_MODELS_${task.replace(/-/g, "_").toUpperCase()}`];
      if (m) {
        models[task] = m;
        hasModels = true;
      }
    }
    if (hasModels) cfg.models = models;
    if (Object.keys(cfg).length > 0) providers[prov] = cfg;
  }
  return Object.keys(providers).length ? { providers } : {};
}
function readConfigFile(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.SM_CONFIG_PATH,
    "storymagic.config.json"
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      const abs = import_path.default.isAbsolute(p) ? p : import_path.default.resolve(process.cwd(), p);
      if (import_fs.default.existsSync(abs)) {
        const raw = import_fs.default.readFileSync(abs, "utf8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`[router] failed to read config file ${p}:`, e.message);
    }
  }
  return {};
}
function deepMerge(base, ...overrides) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const ov of overrides) {
    if (!ov) continue;
    for (const k of Object.keys(ov)) {
      const v = ov[k];
      if (v === void 0) continue;
      if (v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" && !Array.isArray(out[k])) {
        out[k] = deepMerge(out[k], v);
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}
function loadConfig() {
  const file = readConfigFile(process.env.SM_CONFIG_PATH);
  const env = readEnvOverrides();
  const merged = deepMerge(defaultConfig(), file, env);
  if (process.env.SM_SANITIZE === "false") merged.sanitize = false;
  return merged;
}

// src/router/breaker.ts
var CircuitBreaker = class {
  constructor(threshold = 5, cooldownMs = 3e4) {
    this.states = /* @__PURE__ */ new Map();
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }
  isOpen(provider) {
    const s = this.states.get(provider);
    if (!s || s.openUntil === 0) return false;
    if (Date.now() >= s.openUntil) {
      s.failures = 0;
      s.openUntil = 0;
      return false;
    }
    return true;
  }
  recordSuccess(provider) {
    this.states.delete(provider);
  }
  recordFailure(provider) {
    const s = this.states.get(provider) ?? { failures: 0, openUntil: 0 };
    s.failures += 1;
    if (s.failures >= this.threshold) {
      s.openUntil = Date.now() + this.cooldownMs;
      console.warn(`[circuit-breaker] provider "${provider}" opened for ${this.cooldownMs}ms after ${s.failures} failures`);
    }
    this.states.set(provider, s);
  }
};

// src/router/types.ts
function isErr(r) {
  return r.ok === false;
}
var ProviderAdapter = class {
};
function err(errorType, message, opts = {}) {
  return {
    ok: false,
    errorType,
    message,
    retryable: opts.retryable ?? false,
    provider: opts.provider,
    model: opts.model,
    raw: opts.raw
  };
}

// src/router/classifier.ts
var ErrorClassifier = class {
  breakerOpen(provider) {
    return err("PROVIDER_UNREACHABLE", `Circuit breaker open for provider "${provider}"`, {
      provider,
      retryable: false
    });
  }
  noProvider(task) {
    return err("NO_PROVIDER_AVAILABLE", `No provider in the chain could serve task "${task}"`, {
      retryable: false
    });
  }
  noKey(provider) {
    return err("AUTH_INVALID", `Provider "${provider}" has no API key configured`, {
      provider,
      retryable: false
    });
  }
  classifyGeminiError(e, provider, model) {
    return this.classify(e, provider, model);
  }
  /** Vendor-neutral classifier used by all adapters. */
  classify(e, provider, model) {
    return mapProviderError(e, provider, model, {
      modelNotFoundErrorSubstrings: ["not found", "models/", "does not exist", "404"],
      noKeySubstrings: ["api key", "apikey", "permission", "unauthenticated", "401", "403", "incorrect api key", "invalid api key"]
    });
  }
};
function mapProviderError(e, provider, model, hints) {
  const ee = e;
  const status = ee?.status ?? ee?.statusCode ?? ee?.error?.status;
  const code = ee?.error?.code ?? ee?.code;
  const msg = ee?.message || ee?.error?.message || (typeof ee === "string" ? ee : "") || "Unknown provider error";
  const detail = `${msg}`.toLowerCase();
  if (ee?.name === "FetchError" || ee?.code === "ECONNRESET" || ee?.code === "ETIMEDOUT" || ee?.code === "ENOTFOUND" || detail.includes("fetch failed") || detail.includes("network") || detail.includes("timeout") || detail.includes("timed out") || detail.includes("econnreset")) {
    return err("PROVIDER_UNREACHABLE", msg, { provider, model, retryable: true, raw: e });
  }
  if (status === 401 || status === 403 || code === 401 || code === 403 || hasAny(detail, hints.noKeySubstrings)) {
    return err("AUTH_INVALID", msg, { provider, model, retryable: false, raw: e });
  }
  if (status === 429 || code === 429) {
    if (detail.includes("quota") || detail.includes("limit") || detail.includes("exceeded") || detail.includes("billing")) {
      return err("QUOTA_EXCEEDED", msg, { provider, model, retryable: false, raw: e });
    }
    return err("RATE_LIMITED", msg, { provider, model, retryable: true, raw: e });
  }
  if (status === 404 || hasAny(detail, hints.modelNotFoundErrorSubstrings)) {
    return err("MODEL_NOT_FOUND", msg, { provider, model, retryable: false, raw: e });
  }
  if (detail.includes("content") && (detail.includes("block") || detail.includes("filter") || detail.includes("safety")) || detail.includes("prompt was blocked") || detail.includes("response blocked")) {
    return err("CONTENT_BLOCKED", msg, { provider, model, retryable: false, raw: e });
  }
  return err("BAD_RESPONSE", msg, { provider, model, retryable: false, raw: e });
}
function hasAny(s, subs) {
  return subs.some((sub) => s.includes(sub.toLowerCase()));
}

// src/router/sanitizer.ts
var PromptSanitizer = class {
  clean(input) {
    if (typeof input !== "string") return "";
    return input.replace(/(ignore|override|bypass|forget)\b.*\b(instructions|rules|blacklist|whitelist|settings)/gi, "").replace(/[<>'"]/g, "").trim();
  }
  cleanArray(items) {
    return (Array.isArray(items) ? items : []).map((x) => this.clean(x)).filter(Boolean);
  }
};

// src/router/index.ts
var import_genai2 = require("@google/genai");

// src/router/adapters/gemini.ts
var import_genai = require("@google/genai");
var GeminiAdapter = class extends ProviderAdapter {
  constructor(ai, models, maxTokens = 8192) {
    super();
    this.ai = ai;
    this.models = models;
    this.maxTokens = maxTokens;
    this.name = "gemini";
    this.classifier = new ErrorClassifier();
    this.capabilities = {
      text: true,
      image: true,
      structuredOutput: true,
      maxOutputTokens: 8192,
      modelFor: (task) => this.models[task] ?? this.models["default"] ?? this.models["page"]
    };
  }
  toGeminiSchema(schema) {
    const props = {};
    for (const f of schema.fields) {
      let t;
      switch (f.type) {
        case "string":
          t = import_genai.Type.STRING;
          break;
        case "number":
          t = import_genai.Type.NUMBER;
          break;
        case "boolean":
          t = import_genai.Type.BOOLEAN;
          break;
        case "array":
          t = import_genai.Type.ARRAY;
          break;
        case "object":
          t = import_genai.Type.OBJECT;
          break;
        default:
          t = import_genai.Type.STRING;
      }
      const prop = { type: t, description: f.description ?? "" };
      if (f.type === "array" && f.items) {
        const it = f.items === "number" ? import_genai.Type.NUMBER : f.items === "boolean" ? import_genai.Type.BOOLEAN : import_genai.Type.STRING;
        prop.items = { type: it };
      }
      props[f.name] = prop;
    }
    return {
      type: import_genai.Type.OBJECT,
      properties: props,
      required: schema.required
    };
  }
  async generateText(req) {
    const model = req.modelOverride || this.capabilities.modelFor(req.task);
    try {
      const config2 = {
        maxOutputTokens: req.opts?.maxTokens ?? this.maxTokens
      };
      if (req.schema) {
        config2.responseMimeType = "application/json";
        config2.responseSchema = this.toGeminiSchema(req.schema);
      }
      if (req.opts?.temperature !== void 0) config2.temperature = req.opts.temperature;
      if (req.opts?.seed !== void 0) config2.seed = req.opts.seed;
      const r = await this.ai.models.generateContent({
        model,
        contents: req.prompt,
        config: config2
      });
      const text = r.text ?? "";
      if (!text) {
        return this.classifier.classify(new Error("Empty response from Gemini"), this.name, model);
      }
      return { ok: true, text, provider: this.name, model, usage: toUsage(r) };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }
  async generateImage(req) {
    const model = this.capabilities.modelFor("image");
    try {
      const r = await this.ai.models.generateImages({
        model,
        prompt: req.prompt,
        config: {
          numberOfImages: req.opts?.count ?? 1,
          outputMimeType: req.opts?.mimeType ?? "image/jpeg",
          aspectRatio: req.opts?.aspectRatio ?? "4:3"
        }
      });
      const bytes = r.generatedImages?.[0]?.image?.imageBytes;
      if (!bytes) {
        return this.classifier.classify(new Error("No image returned from Gemini"), this.name, model);
      }
      const mime = req.opts?.mimeType ?? "image/jpeg";
      return { ok: true, imageUrl: `data:${mime};base64,${bytes}`, provider: this.name, model };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }
};
function toUsage(r) {
  try {
    const u = r?.usageMetadata;
    if (!u) return void 0;
    return {
      promptTokens: u.promptTokenCount ?? u.promptTokens ?? void 0,
      completionTokens: u.candidatesTokenCount ?? u.candidatesTokens ?? void 0
    };
  } catch {
    return void 0;
  }
}

// src/router/adapters/openai.ts
var import_openai = __toESM(require("openai"), 1);
var OpenAIAdapter = class extends ProviderAdapter {
  constructor(apiKey, models, baseUrl) {
    super();
    this.models = models;
    this.name = "openai";
    this.classifier = new ErrorClassifier();
    this.capabilities = {
      text: true,
      image: true,
      structuredOutput: true,
      maxOutputTokens: 16384,
      modelFor: (task) => this.models[task] ?? this.models["default"] ?? this.models["page"]
    };
    this.client = new import_openai.default({ apiKey, baseURL: baseUrl, dangerouslyAllowBrowser: false });
  }
  systemNote(schema) {
    if (!schema) return void 0;
    const fields = schema.fields.map((f) => `- ${f.name} (${f.type}${f.items ? ` of ${f.items}` : ""})${f.description ? `: ${f.description}` : ""}${schema.required.includes(f.name) ? " [required]" : ""}`).join("\n");
    return `You MUST respond with a JSON object whose top-level fields are exactly:
${fields}
Do not include any text outside the JSON object.`;
  }
  async generateText(req) {
    const model = req.modelOverride || this.capabilities.modelFor(req.task);
    try {
      const messages = [];
      const sys = this.systemNote(req.schema);
      if (sys) messages.push({ role: "system", content: sys });
      messages.push({ role: "user", content: req.prompt });
      const body = {
        model,
        messages,
        max_tokens: req.opts?.maxTokens ?? 4096
      };
      if (req.opts?.temperature !== void 0) body.temperature = req.opts.temperature;
      if (req.opts?.seed !== void 0) body.seed = req.opts.seed;
      if (req.schema) {
        body.response_format = {
          type: "json_schema",
          json_schema: {
            name: `storymagic_${req.task.replace(/-/g, "_")}`,
            strict: false,
            schema: this.toJSONSchema(req.schema)
          }
        };
      }
      const r = await this.client.chat.completions.create(body);
      const msg = r.choices?.[0]?.message;
      const text = msg?.content ?? msg?.reasoning ?? "";
      if (!text) {
        return this.classifier.classify(new Error("Empty response from OpenAI"), this.name, model);
      }
      return {
        ok: true,
        text,
        provider: this.name,
        model,
        usage: r.usage ? { promptTokens: r.usage.prompt_tokens, completionTokens: r.usage.completion_tokens } : void 0
      };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }
  async generateImage(req) {
    const model = this.capabilities.modelFor("image");
    try {
      const r = await this.client.images.generate({
        model,
        prompt: req.prompt,
        n: req.opts?.count ?? 1,
        size: aspectToSize(req.opts?.aspectRatio),
        response_format: "b64_json"
      });
      const b64 = r.data?.[0]?.b64_json;
      if (!b64) {
        return this.classifier.classify(new Error("No image returned from OpenAI"), this.name, model);
      }
      const mime = req.opts?.mimeType ?? "image/png";
      return { ok: true, imageUrl: `data:${mime};base64,${b64}`, provider: this.name, model };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }
  toJSONSchema(schema) {
    const props = {};
    const required = [];
    for (const f of schema.fields) {
      let t;
      switch (f.type) {
        case "string":
          t = { type: "string" };
          break;
        case "number":
          t = { type: "number" };
          break;
        case "boolean":
          t = { type: "boolean" };
          break;
        case "array":
          t = { type: "array", items: { type: f.items ?? "string" } };
          break;
        case "object":
          t = { type: "object", properties: {} };
          break;
        default:
          t = { type: "string" };
      }
      if (f.description) t.description = f.description;
      props[f.name] = t;
      if (schema.required.includes(f.name)) required.push(f.name);
    }
    return { type: "object", properties: props, required };
  }
};
function aspectToSize(aspect) {
  switch (aspect) {
    case "1:1":
      return "1024x1024";
    case "16:9":
      return "1792x1024";
    case "4:3":
    default:
      return "1024x768";
  }
}

// src/router/adapters/anthropic.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"), 1);
var AnthropicAdapter = class extends ProviderAdapter {
  constructor(apiKey, models, baseUrl) {
    super();
    this.models = models;
    this.name = "anthropic";
    this.classifier = new ErrorClassifier();
    this.capabilities = {
      text: true,
      image: false,
      structuredOutput: true,
      maxOutputTokens: 8192,
      modelFor: (task) => this.models[task] ?? this.models["default"] ?? this.models["page"]
    };
    this.client = new import_sdk.default({ apiKey, baseURL: baseUrl });
  }
  systemNote(schema) {
    const base = "You are a helpful assistant.";
    if (!schema) return base;
    const fields = schema.fields.map((f) => `- ${f.name} (${f.type}${f.items ? ` of ${f.items}` : ""})${f.description ? `: ${f.description}` : ""}${schema.required.includes(f.name) ? " [required]" : ""}`).join("\n");
    return `${base}
You MUST call the "emit_result" tool with a JSON object whose fields are exactly:
${fields}. Do not return prose.`;
  }
  toolFor(schema) {
    const props = {};
    const required = [];
    for (const f of schema.fields) {
      let t;
      switch (f.type) {
        case "string":
          t = { type: "string" };
          break;
        case "number":
          t = { type: "number" };
          break;
        case "boolean":
          t = { type: "boolean" };
          break;
        case "array":
          t = { type: "array", items: { type: f.items ?? "string" } };
          break;
        case "object":
          t = { type: "object", properties: {} };
          break;
        default:
          t = { type: "string" };
      }
      if (f.description) t.description = f.description;
      props[f.name] = t;
      if (schema.required.includes(f.name)) required.push(f.name);
    }
    return {
      name: "emit_result",
      description: "Return the structured result as a JSON object.",
      input_schema: { type: "object", properties: props, required }
    };
  }
  async generateText(req) {
    const model = req.modelOverride || this.capabilities.modelFor(req.task);
    try {
      const messages = [{ role: "user", content: req.prompt }];
      const body = {
        model,
        max_tokens: req.opts?.maxTokens ?? 4096,
        system: this.systemNote(req.schema),
        messages
      };
      if (req.schema) {
        body.tools = [this.toolFor(req.schema)];
        body.tool_choice = { type: "tool", name: "emit_result" };
      }
      if (req.opts?.temperature !== void 0) body.temperature = req.opts.temperature;
      const r = await this.client.messages.create(body);
      let text = "";
      for (const block of r.content) {
        if (block.type === "tool_use" && block.name === "emit_result") {
          text = JSON.stringify(block.input);
        } else if (block.type === "text") {
          text = text || block.text;
        }
      }
      if (!text) {
        return this.classifier.classify(new Error("Empty response from Anthropic"), this.name, model);
      }
      return {
        ok: true,
        text,
        provider: this.name,
        model,
        usage: r.usage ? { promptTokens: r.usage.input_tokens, completionTokens: r.usage.output_tokens } : void 0
      };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }
};

// src/router/adapters/local.ts
var import_ollama = require("ollama");
var LocalAdapter = class extends ProviderAdapter {
  constructor(baseUrl, models) {
    super();
    this.models = models;
    this.name = "local";
    this.classifier = new ErrorClassifier();
    this.capabilities = {
      text: true,
      image: false,
      // base Ollama `generate` does not return images; wire a vision pipeline separately if needed
      structuredOutput: true,
      maxOutputTokens: 4096,
      modelFor: (task) => this.models[task] ?? this.models["default"] ?? this.models["page"]
    };
    this.client = new import_ollama.Ollama({ host: baseUrl });
  }
  systemNote(schema) {
    if (!schema) return void 0;
    const fields = schema.fields.map((f) => `- ${f.name} (${f.type}${f.items ? ` of ${f.items}` : ""})${f.description ? `: ${f.description}` : ""}${schema.required.includes(f.name) ? " [required]" : ""}`).join("\n");
    return `You MUST respond with a JSON object whose top-level fields are exactly:
${fields}
No text outside the JSON object.`;
  }
  async generateText(req) {
    const model = req.modelOverride || this.capabilities.modelFor(req.task);
    try {
      const messages = [];
      const sys = this.systemNote(req.schema);
      if (sys) messages.push({ role: "system", content: sys });
      messages.push({ role: "user", content: req.prompt });
      const r = await this.client.chat({
        model,
        messages,
        format: req.schema ? this.toOllamaFormat(req.schema) : void 0,
        options: {
          num_predict: req.opts?.maxTokens ?? 2048,
          temperature: req.opts?.temperature,
          seed: req.opts?.seed
        }
      });
      const text = r.message?.content ?? "";
      if (!text) {
        return this.classifier.classify(new Error("Empty response from local model"), this.name, model);
      }
      return { ok: true, text, provider: this.name, model };
    } catch (e) {
      return this.classifier.classify(e, this.name, model);
    }
  }
  async generateImage(req) {
    return { ok: false, errorType: "SCHEMA_UNSUPPORTED", message: "Local adapter does not generate images via base Ollama", provider: this.name, retryable: false };
  }
  // Ollama's `format` accepts a JSON schema draft. We emit a permissive object schema.
  toOllamaFormat(schema) {
    const props = {};
    const required = [];
    for (const f of schema.fields) {
      let t;
      switch (f.type) {
        case "string":
          t = { type: "string" };
          break;
        case "number":
          t = { type: "number" };
          break;
        case "boolean":
          t = { type: "boolean" };
          break;
        case "array":
          t = { type: "array", items: { type: f.items ?? "string" } };
          break;
        case "object":
          t = { type: "object", properties: {} };
          break;
        default:
          t = { type: "string" };
      }
      if (f.description) t.description = f.description;
      props[f.name] = t;
      if (schema.required.includes(f.name)) required.push(f.name);
    }
    return { type: "object", properties: props, required };
  }
};

// src/router/index.ts
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var ModelRouter = class {
  constructor(adapters, policies) {
    this.adapters = adapters;
    this.policies = policies;
    this.sanitizer = new PromptSanitizer();
    this.classifier = new ErrorClassifier();
    this.breaker = new CircuitBreaker();
  }
  async generate(req) {
    const policy = this.policies[req.task];
    if (!policy) {
      return this.classifier.noProvider(req.task);
    }
    const prompt = policy.sanitize !== false ? this.sanitizer.clean(req.prompt) : req.prompt;
    let lastErr = null;
    for (const step of policy.chain) {
      const adapter = this.adapters.get(step.provider);
      if (!adapter) {
        console.warn(`[router] unknown provider "${step.provider}" in chain for task ${req.task}`);
        continue;
      }
      if (req.task === "image" && !adapter.capabilities.image) continue;
      if (this.breaker.isOpen(step.provider)) {
        lastErr = this.classifier.breakerOpen(step.provider);
        continue;
      }
      const stepReq = step.model ? { ...req, modelOverride: step.model } : req;
      const stepWork = req.task === "image" ? (a) => Promise.resolve(a.generateImage(stepReq)) : (a) => a.generateText({ ...stepReq, prompt, schema: policy.schema });
      const res = await this.tryWithRetry(() => stepWork(adapter), step.retries ?? 1, step.backoffMs ?? 500);
      if (!isErr(res)) {
        this.breaker.recordSuccess(step.provider);
        return res;
      }
      lastErr = res;
      this.breaker.recordFailure(step.provider);
      if (!res.retryable) break;
    }
    return lastErr ?? this.classifier.noProvider(req.task);
  }
  async tryWithRetry(fn, n, backoff) {
    let r = await fn();
    for (let i = 0; i < n && isErr(r) && r.retryable; i++) {
      await sleep(backoff * Math.pow(2, i));
      r = await fn();
    }
    return r;
  }
};
function buildRouter(config2) {
  const adapters = /* @__PURE__ */ new Map();
  const registered2 = [];
  const g = config2.providers.gemini;
  if (g?.apiKey) {
    adapters.set("gemini", new GeminiAdapter(new import_genai2.GoogleGenAI({ apiKey: g.apiKey }), g.models ?? {}));
    registered2.push("gemini");
  }
  const o = config2.providers.openai;
  if (o?.apiKey) {
    adapters.set("openai", new OpenAIAdapter(o.apiKey, o.models ?? {}, o.baseUrl));
    registered2.push("openai");
  }
  const n = config2.providers.nous;
  if (n?.apiKey && n?.baseUrl) {
    adapters.set("nous", new OpenAIAdapter(n.apiKey, n.models ?? {}, n.baseUrl));
    registered2.push("nous");
  }
  const or = config2.providers.openrouter;
  if (or?.apiKey && or?.baseUrl) {
    adapters.set("openrouter", new OpenAIAdapter(or.apiKey, or.models ?? {}, or.baseUrl));
    registered2.push("openrouter");
  }
  const a = config2.providers.anthropic;
  if (a?.apiKey) {
    adapters.set("anthropic", new AnthropicAdapter(a.apiKey, a.models ?? {}, a.baseUrl));
    registered2.push("anthropic");
  }
  const l = config2.providers.local;
  if (l?.baseUrl) {
    adapters.set("local", new LocalAdapter(l.baseUrl, l.models ?? {}));
    registered2.push("local");
  }
  const router2 = new ModelRouter(adapters, config2.policies);
  return { router: router2, registered: registered2 };
}

// server.ts
var config = loadConfig();
var { router, registered } = buildRouter(config);
console.log(`[router] registered providers: ${registered.length ? registered.join(", ") : "(none \u2014 set SM_PROVIDER_* keys)"}`);
for (const task of ["page", "define-word", "translate", "image"]) {
  const chain = config.policies[task]?.chain.map((s) => s.provider) ?? [];
  const missing = chain.filter((p) => !registered.includes(p));
  if (missing.length) {
    console.warn(`[router] task "${task}" chain references unavailable providers: ${missing.join(", ")} \u2014 will fail if reached`);
  }
}
function setTestRouter(r) {
  router = r;
}
var PAGE_SCHEMA = {
  fields: [
    { name: "storyText", type: "string", description: "The text for the current page in the primary language." },
    { name: "translationText", type: "string", description: "The translated text in the support language, if dual-language is active. Otherwise empty." },
    { name: "imagePrompt", type: "string", description: "A detailed prompt for the illustration of this page." },
    { name: "isEnd", type: "boolean", description: "True if this is the final page and the story has concluded." },
    { name: "lessonsCovered", type: "array", items: "string", description: "Any lessons that were naturally covered in this page from the provided list." }
  ],
  required: ["storyText", "imagePrompt", "isEnd"]
};
var DEFINE_SCHEMA = {
  fields: [
    { name: "definition", type: "string", description: "A simple child-friendly definition." },
    { name: "synonyms", type: "array", items: "string", description: "Synonyms in the primary language." },
    { name: "translation", type: "string", description: "The translation into the support language." }
  ],
  required: ["definition", "synonyms", "translation"]
};
function imageErrorResponse(e) {
  return { imageUrl: "", unavailable: true, errorType: e.errorType, detail: e.message };
}
async function createStoryMagicApp() {
  return buildApp(process.env.SM_NO_VITE === "true");
}
async function buildApp(skipVite) {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.post("/api/generate-page", pageHandler());
  app.post("/api/define-word", defineWordHandler());
  app.post("/api/translate-text", translateHandler());
  app.post("/api/generate-image", imageHandler());
  app.post("/api/subscribe", subscribeHandler());
  if (!skipVite) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await (0, import_vite.createServer)({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } else {
      const distPath = import_path2.default.join(process.cwd(), "dist");
      app.use(import_express.default.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(import_path2.default.join(distPath, "index.html"));
      });
    }
  }
  return app;
}
function pageHandler() {
  return async (req, res) => {
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
        supportLang
      } = req.body;
      const sanitize = (input) => {
        if (typeof input !== "string") return "";
        return input.replace(/(ignore|override|bypass|forget)\b.*\b(instructions|rules|blacklist|whitelist|settings)/gi, "").replace(/[<>'"]/g, "").trim();
      };
      const cleanGenre = sanitize(genre || "Space Adventure");
      const cleanFeedback = sanitize(kidFeedback || "");
      const cleanWhitelist = (ideologiesWhitelist || []).map(sanitize).filter(Boolean);
      const cleanBlacklist = (ideologiesBlacklist || []).map(sanitize).filter(Boolean);
      const cleanLessons = (lessons || []).map(sanitize).filter(Boolean);
      const cleanPrimary = sanitize(primaryLang || "English");
      const cleanSupport = sanitize(supportLang || "");
      let ageGroupInstructions = "";
      let imageStyleInstruction = "cute, whimsical, vibrant children's book illustration styles";
      if (age !== void 0) {
        const childAge = Number(age);
        if (childAge <= 4) {
          ageGroupInstructions = "\nThe target reader is a toddler (ages 2-4). Write exactly 1-2 very simple sentences using basic vocabulary. Focus heavily on sensory details like colors, sounds, and simple actions. Keep it light, whimsical, and extremely easy to understand.";
          imageStyleInstruction = "cute, simple, whimsical, vibrant children's book illustration styles with bold outlines and flat colors";
        } else if (childAge <= 7) {
          ageGroupInstructions = "\nThe target reader is an early reader (ages 5-7). Write exactly 2-4 sentences. Introduce basic dialogue and straightforward character actions. Keep sentences relatively short but grammatically complete.";
          imageStyleInstruction = "charming, whimsical, vibrant children's book illustration styles with rich colors and soft textures";
        } else if (childAge <= 11) {
          ageGroupInstructions = "\nThe target reader is an intermediate reader (ages 8-11). Write exactly 4-6 sentences. Incorporate richer descriptive vocabulary, clear character motivations, and clear plot progression.";
          imageStyleInstruction = "detailed, whimsical, colorful storybook illustration style with depth and expression";
        } else if (childAge <= 15) {
          ageGroupInstructions = "\nThe target reader is a teenager (ages 12-15). Write exactly 6-10 sentences. Use complex vocabulary, nuanced dialog, clear subplots, and emotional depth suitable for a teenager.";
          imageStyleInstruction = "expressive, detailed digital art, anime or graphic novel illustration style, modern aesthetics";
        } else {
          ageGroupInstructions = "\nThe target reader is an adult or young adult (ages 16+). Write exactly 8-12 sentences. Use sophisticated vocabulary, mature storytelling pacing, deep thematic elements, and advanced character development.";
          imageStyleInstruction = "artistic, detailed digital painting, fine art style, moody or dramatic lighting, book cover quality";
        }
      }
      let prompt = `You are a creative, witty book author.
We are writing a story page by page.
The story text MUST be written in the primary language: ${cleanPrimary}.
The genre is ${cleanGenre}.
The book will be exactly ${maxPages} pages long in total. This is page ${currentPage + 1}.`;
      if (cleanLessons.length > 0) {
        prompt += `
Incorporate these lessons naturally into the story if possible: ${cleanLessons.join(", ")}.`;
      }
      if (cleanWhitelist.length > 0) {
        prompt += `
Ensure you focus on these general themes: ${cleanWhitelist.join(", ")}.`;
      }
      if (cleanBlacklist.length > 0) {
        prompt += `
ABSOLUTELY DO NOT include these blacklisted themes or topics under any circumstances: ${cleanBlacklist.join(", ")}.`;
      }
      prompt += `

Previous pages so far:
`;
      if (previousPages && previousPages.length > 0) {
        previousPages.forEach((p, idx) => {
          prompt += `- Page ${idx + 1}: ${sanitize(p.text)}
`;
        });
      } else {
        prompt += `(None yet. This is the very first page of the book.)
`;
      }
      if (cleanFeedback) {
        prompt += `
The reader gave this feedback for what should happen next on this page: "${cleanFeedback}"
`;
      }
      prompt += ageGroupInstructions;
      if (cleanSupport) {
        prompt += `

DUAL LANGUAGE MODE ACTIVE:
You MUST translate the primary language story text for this page into the support language: ${cleanSupport}.
Provide this translation in the "translationText" response field. Keep the translation sentence-by-sentence aligned with the primary text.`;
      }
      prompt += `

Write the text for page ${currentPage + 1}. Make it engaging, witty, and perfectly sized for a single page with a big illustration. Adjust the pacing so the overarching plot naturally reaches a definitive conclusion exactly on page ${maxPages}. If this is page ${maxPages}, give it a satisfying ending. Provide a highly descriptive image prompt for the illustration of this exact page using terms like "${imageStyleInstruction}".`;
      const result = await router.generate({ task: "page", prompt, schema: PAGE_SCHEMA, params: { age, primaryLang, supportLang } });
      if (isErr(result)) {
        return res.status(502).json({ error: result.message, errorType: result.errorType });
      }
      const data = safeJsonParse(result.text);
      if (!data) {
        return res.status(502).json({ error: "Failed to parse model JSON response", errorType: "BAD_RESPONSE" });
      }
      res.json(data);
    } catch (e) {
      console.error("Error generating page:", e);
      res.status(500).json({ error: e?.message || "Failed to generate page text" });
    }
  };
}
function defineWordHandler() {
  return async (req, res) => {
    try {
      const { word, age, primaryLang, supportLang } = req.body;
      const cleanWord = (word || "").trim().slice(0, 150);
      const cleanPrimary = (primaryLang || "English").trim();
      const cleanSupport = (supportLang || "English").trim();
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
      const result = await router.generate({ task: "define-word", prompt, schema: DEFINE_SCHEMA, params: { age, primaryLang, supportLang } });
      if (isErr(result)) {
        return res.status(502).json({ error: result.message, errorType: result.errorType });
      }
      const data = safeJsonParse(result.text);
      if (!data) {
        return res.status(502).json({ error: "Failed to parse model JSON response", errorType: "BAD_RESPONSE" });
      }
      res.json(data);
    } catch (e) {
      console.error("Error defining word:", e);
      res.status(500).json({ error: e?.message || "Failed to define word" });
    }
  };
}
function translateHandler() {
  return async (req, res) => {
    try {
      const { text, from, to } = req.body;
      const cleanText = (text || "").slice(0, 2e3);
      const prompt = `You are a simple translator. Translate the following text from ${from} to ${to}. Provide ONLY the translated text, with no extra commentary, explanations, or quotes: "${cleanText}"`;
      const result = await router.generate({ task: "translate", prompt, params: { from, to } });
      if (isErr(result)) {
        return res.status(502).json({ error: result.message, errorType: result.errorType });
      }
      res.json({ translation: result.text?.trim() || "" });
    } catch (e) {
      console.error("Error translating text:", e);
      res.status(500).json({ error: e?.message || "Failed to translate" });
    }
  };
}
function imageHandler() {
  return async (req, res) => {
    const { prompt } = req.body;
    const result = await router.generate({ task: "image", prompt });
    if (!isErr(result)) {
      return res.json({ imageUrl: result.imageUrl });
    }
    console.warn("[image] generation failed:", result.errorType, result.message);
    res.json(imageErrorResponse(result));
  };
}
function subscribeHandler() {
  const BUTTONDOWN_KEY = process.env.BUTTONDOWN_API_KEY;
  return async (req, res) => {
    const email = String(req.body?.email || "").trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (!BUTTONDOWN_KEY) {
      return res.status(200).json({ configured: false, message: "Newsletter not configured" });
    }
    try {
      const r = await fetch("https://api.buttondown.email/v1/subscribers", {
        method: "POST",
        headers: {
          Authorization: `Token ${BUTTONDOWN_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, tags: ["storymagic-launch"] })
      });
      if (r.ok || r.status === 201) {
        return res.json({ ok: true });
      }
      const err2 = await r.text();
      console.error("[subscribe] Buttondown error", r.status, err2);
      return res.status(502).json({ error: "Subscription failed" });
    } catch (e) {
      console.error("[subscribe]", e);
      return res.status(500).json({ error: "Subscription failed" });
    }
  };
}
function safeJsonParse(text) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {
      }
    }
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1) {
      try {
        return JSON.parse(text.slice(first, last + 1));
      } catch {
      }
    }
    return null;
  }
}
var invokedDirectly = process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.cjs"));
if (invokedDirectly && process.env.SM_NO_START !== "true") {
  (async () => {
    const app = await createStoryMagicApp();
    app.listen(3e3, "0.0.0.0", () => {
      console.log("Server running on http://localhost:3000");
    });
  })();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStoryMagicApp,
  setTestRouter
});
//# sourceMappingURL=server.cjs.map
