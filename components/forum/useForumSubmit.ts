"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ForumFormState } from "@/app/forum/actions";
import { forumCooldownMessage, secondsUntil } from "@/lib/forum-cooldown";

type ForumAction = (prev: ForumFormState, formData: FormData) => Promise<ForumFormState>;

/**
 * Runs a Forum post action without a form action prop, so React never resets the form and the typed text stays.
 * Pending always ends, even when the action is rejected or the network drops. A cooldown counts down and clears itself.
 */
export function useForumSubmit(action: ForumAction) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ForumFormState>({});
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (secondsUntil(deadline, t) === 0) {
        setDeadline(null);
        setState((s) => (s.retryAfter ? {} : s));
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadline]);

  const secondsLeft = secondsUntil(deadline, now);

  const submit = useCallback((formData: FormData, onDone?: (result: ForumFormState) => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({});
    startTransition(async () => {
      let result: ForumFormState;
      try {
        result = (await action({}, formData)) || {};
      } catch (err: any) {
        // A redirect from the action is a navigation Next is already carrying out, not a failure.
        if (err && typeof err === "object" && typeof err.digest === "string" && err.digest.startsWith("NEXT_REDIRECT")) {
          inFlight.current = false;
          return;
        }
        result = { error: "That did not reach the Guild. Check your connection and try again.", nonce: Date.now() };
      }
      inFlight.current = false;
      if (result.retryAfter) {
        const until = Date.now() + result.retryAfter * 1000;
        setNow(Date.now());
        setDeadline(until);
      }
      setState(result);
      onDone?.(result);
    });
  }, [action]);

  const error = state.retryAfter ? (secondsLeft > 0 ? forumCooldownMessage(secondsLeft) : null) : state.error || null;
  return { submit, pending, state, error, secondsLeft, coolingDown: secondsLeft > 0 };
}
