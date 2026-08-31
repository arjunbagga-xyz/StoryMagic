import React, { useState } from 'react';
import { track } from '../analytics';

/**
 * Newsletter capture component. Posts the email to the self-hosted
 * /api/subscribe endpoint, which forwards to Buttondown server-side
 * (key never reaches the browser). If the server is unconfigured or a
 * static build without a backend, it degrades gracefully.
 */
export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  React.useEffect(() => {
    track('newsletter_cta_view');
  }, []);

  const valid = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid(email)) {
      setStatus('error');
      setMsg('Please enter a valid email.');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (res.ok && data?.configured !== false) {
        setStatus('done');
        setMsg("You're on the list — thank you!");
        setEmail('');
      } else if (data?.configured === false) {
        // Server has no Buttondown key wired up yet.
        setStatus('error');
        setMsg('Newsletter signup is not configured yet — check back at launch.');
      } else {
        setStatus('error');
        setMsg(data?.error || 'Could not subscribe. Try again.');
      }
    } catch {
      setStatus('error');
      setMsg('Network error. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-[#e8e4d9] p-8 w-full max-w-md text-center">
      <h3 className="text-2xl font-serif font-bold text-[#3d3a2e] mb-1">Get StoryMagic updates</h3>
      <p className="text-[#8c887a] font-medium mb-4 text-sm">
        Open-source, local-first, privacy-first. No spam, unsubscribe anytime.
      </p>
      {status === 'done' ? (
        <p className="text-[#7a8d7d] font-bold">{msg}</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 justify-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="px-4 py-3 rounded-2xl bg-[#fdfcf0] text-[#4a4636] border border-[#e8e4d9] focus:border-[#7a8d7d] outline-none flex-1 min-w-0"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white font-bold px-6 py-3 rounded-2xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {status === 'sending' ? 'Joining…' : 'Join'}
          </button>
        </form>
      )}
      {status === 'error' && <p className="text-red-500 text-sm font-semibold mt-2">{msg}</p>}
    </div>
  );
}
