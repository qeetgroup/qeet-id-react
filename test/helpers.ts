import axe from "axe-core";
import { expect, vi } from "vitest";
import type { Session } from "../src/contract";

/** One answer of the mocked session routes. */
export type Answer = { status?: number; body?: unknown; text?: string } | Error | Promise<never>;

/** A request the mocked `fetch` received. */
export interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  init: RequestInit;
}

type Route = "session" | "sign-out" | "switch-organization";

/** The mocked session routes. */
export interface SessionRoutesMock {
  /** Every request, in order. */
  calls: Call[];
  /** The `fetch` stub. */
  fetch: ReturnType<typeof vi.fn>;
  /** Replaces a route's queue of answers. */
  answer(route: Route, ...list: Answer[]): void;
  /** The calls to one route. */
  callsTo(route: string): Call[];
}

/**
 * Stubs `fetch` with the app's session routes. Each route answers from its
 * queue, then keeps repeating its last answer. Returns the calls and a way to
 * queue more answers.
 */
export function mockSessionRoutes(answers: Partial<Record<Route, Answer[]>> = {}): SessionRoutesMock {
  const queues = new Map<string, Answer[]>(Object.entries(answers).map(([route, list]) => [route, [...(list ?? [])]]));
  const calls: Call[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const route = url.replace(/^.*\/(session|sign-out|switch-organization)$/, "$1");
    const headers = Object.fromEntries(
      Object.entries((init.headers as Record<string, string>) ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
    );
    calls.push({
      method: init.method ?? "GET",
      url,
      headers,
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
      init,
    });
    const queue = queues.get(route) ?? [];
    const answer = queue.length > 1 ? queue.shift() : queue[0];
    if (answer === undefined) return new Response("", { status: 404 });
    if (answer instanceof Error) throw answer;
    if (answer instanceof Promise) return answer;
    const text = answer.text ?? (answer.body === undefined ? "" : JSON.stringify(answer.body));
    return new Response(text, { status: answer.status ?? 200, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetch);
  return {
    calls,
    fetch,
    answer(route, ...list) {
      queues.set(route, list);
    },
    callsTo(route) {
      return calls.filter((call) => call.url.endsWith(`/${route}`));
    },
  };
}

/** A `GET session` answer. */
export function sessionAnswer(session: Session | null): Answer {
  return { body: { session } };
}

/** A promise that never settles: a request still on its way. */
export function pending(): Promise<never> {
  return new Promise<never>(() => {});
}

/** Lets queued promise callbacks run. */
export async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

/**
 * Fails the test when axe finds a WCAG 2.2 A or AA violation in `element`.
 * Colour contrast is left out: jsdom doesn't lay out or paint.
 */
export async function expectAccessible(element: Element): Promise<void> {
  const results = await axe.run(element, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(
    results.violations.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.html).join(", ")})`),
  ).toEqual([]);
}

/**
 * Expects `run` to throw while rendering, keeping React's and jsdom's reports
 * of that expected error out of the test output.
 */
export function expectRenderToThrow(run: () => unknown, expected: string | RegExp | Error | (new (...args: never[]) => Error)): void {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const swallow = (event: ErrorEvent): void => event.preventDefault();
  window.addEventListener("error", swallow);
  try {
    expect(run).toThrow(expected as string);
  } finally {
    window.removeEventListener("error", swallow);
  }
}
