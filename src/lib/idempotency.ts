/**
 * `Idempotency-Key`, which §3 of docs/architecture.md requires on the three
 * writes that cost money if they happen twice: job creation, estimate approval
 * and payment. The backend dedupes on it, so a double tap or a replayed
 * request produces one job and one charge.
 *
 * Not a UUID. React Native installs no crypto global — see
 * `scripts/runtime-globals.d.ts` for what it does install — and the value only
 * has to be unique among the keys one device sends, within the window a server
 * remembers them. Time, a process counter and `Math.random` clear that bar.
 * When the app gains a crypto source, this is the only place to change.
 */
import { useCallback, useState } from "react";

let counter = 0;

export function newIdempotencyKey(): string {
  counter += 1;
  return [
    Date.now().toString(36),
    counter.toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

export type IdempotencyKey = {
  key: string;
  /** Call after a write succeeds. */
  rotate: () => void;
};

/**
 * One key per logical write: stable across re-renders and across a failed
 * attempt, replaced once a write succeeds.
 *
 * Both halves matter. The key has to survive a retry, which is the entire
 * point — the customer taps Pay, the request times out, they tap again, and
 * the second request has to be recognisable as the same one. It must not
 * survive a success, or the next genuinely new write would be deduped against
 * the last and silently return the previous job.
 *
 * `scope` resets the key when the hook is reused for a different subject, such
 * as a screen that stays mounted while the job id under it changes.
 */
export function useIdempotencyKey(scope: string): IdempotencyKey {
  const [current, setCurrent] = useState(() => ({ scope, key: newIdempotencyKey() }));

  // Deriving state from a changed argument during render, rather than in an
  // effect: an effect would leave one render able to send the previous
  // subject's key.
  if (current.scope !== scope) {
    setCurrent({ scope, key: newIdempotencyKey() });
  }

  const rotate = useCallback(() => {
    setCurrent({ scope, key: newIdempotencyKey() });
  }, [scope]);

  return { key: current.key, rotate };
}
