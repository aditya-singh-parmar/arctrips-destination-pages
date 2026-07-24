"use client";

import { useActionState } from "react";
import { submitNotify, type NotifyState } from "./actions";

const initialState: NotifyState = { status: "idle" };

/**
 * Amber, always-secondary capture form for a coming-soon product line. Never
 * primary-styled (that rule lives in CtaBlock, which is the only place a
 * `.btn--primary` may render). Inline success/error copy, no reload, no
 * dialogs.
 */
export function NotifyForm({ productLineSlug, citySlug }: { productLineSlug: string; citySlug: string }) {
  const boundAction = submitNotify.bind(null, productLineSlug, citySlug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  if (state.status === "success") {
    return <p className="cta__offer">Thanks, we will email you when this opens.</p>;
  }

  return (
    <div>
      <form action={formAction} className="cta__notify-form">
        <input
          type="email"
          name="email"
          required
          placeholder="you@email.com"
          aria-label="Email address"
          className="cta__notify-input"
        />
        <button type="submit" className="btn btn--amber" disabled={pending}>
          {pending ? "Sending" : "Notify me"}
        </button>
      </form>
      {state.status === "error" && <p className="cta__notify-error">{state.message}</p>}
    </div>
  );
}
