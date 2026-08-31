// Per-provider circuit breaker: after `threshold` consecutive failures, the breaker opens for
// `cooldownMs`, during which the provider is skipped (avoiding wasted calls). After the cooldown,
// a single half-open probe is allowed; success closes it, failure re-opens.

interface BreakerState {
  failures: number;
  openUntil: number; // epoch ms; 0 = closed
}

export class CircuitBreaker {
  private states = new Map<string, BreakerState>();
  private readonly threshold: number;
  private readonly cooldownMs: number;

  constructor(threshold = 5, cooldownMs = 30_000) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  isOpen(provider: string): boolean {
    const s = this.states.get(provider);
    if (!s || s.openUntil === 0) return false;
    if (Date.now() >= s.openUntil) {
      // cooldown elapsed -> allow one half-open probe (reset failure count but keep half-open)
      s.failures = 0;
      s.openUntil = 0;
      return false;
    }
    return true;
  }

  recordSuccess(provider: string): void {
    this.states.delete(provider);
  }

  recordFailure(provider: string): void {
    const s = this.states.get(provider) ?? { failures: 0, openUntil: 0 };
    s.failures += 1;
    if (s.failures >= this.threshold) {
      s.openUntil = Date.now() + this.cooldownMs;
      console.warn(`[circuit-breaker] provider "${provider}" opened for ${this.cooldownMs}ms after ${s.failures} failures`);
    }
    this.states.set(provider, s);
  }
}
