// Centralized prompt sanitizer (carried over from server.ts:39-45, now shared by all adapters).
export class PromptSanitizer {
  clean(input: unknown): string {
    if (typeof input !== 'string') return '';
    return input
      .replace(/(ignore|override|bypass|forget)\b.*\b(instructions|rules|blacklist|whitelist|settings)/gi, '')
      .replace(/[<>'"]/g, '')
      .trim();
  }

  cleanArray(items: unknown[]): string[] {
    return (Array.isArray(items) ? items : []).map((x) => this.clean(x)).filter(Boolean);
  }
}
