import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

export interface RenderedHook<T> {
  /** Value returned by the most recent render. */
  readonly current: T;
  /** Flushes pending effects/promises, then returns the latest value. */
  waitForUpdate: () => Promise<T>;
  /** Runs an interaction that updates state, inside `act`. */
  act: (interaction: () => Promise<unknown> | void) => Promise<void>;
  unmount: () => Promise<void>;
}

/**
 * Minimal `renderHook` on top of react-test-renderer, so hooks with side
 * effects (feed paging, audio playback) can be tested without pulling in
 * another testing library. Only what the tests here need — no rerender
 * with new props, no built-in waitFor predicates.
 */
export async function renderHook<T>(hook: () => T): Promise<RenderedHook<T>> {
  const result = { current: undefined as unknown as T };

  function HookProbe() {
    result.current = hook();
    return null;
  }

  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<HookProbe />);
  });

  return {
    get current() {
      return result.current;
    },
    async waitForUpdate() {
      await ReactTestRenderer.act(async () => {
        await Promise.resolve();
      });
      return result.current;
    },
    async act(interaction) {
      await ReactTestRenderer.act(async () => {
        await interaction();
      });
    },
    async unmount() {
      await ReactTestRenderer.act(async () => {
        renderer?.unmount();
      });
    },
  };
}
