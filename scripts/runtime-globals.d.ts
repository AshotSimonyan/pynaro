/**
 * Every global React Native actually installs — and nothing else.
 *
 * `tsconfig.runtime.json` compiles the app against this file with `lib` set to
 * `ESNext` alone. The ordinary tsconfig includes `DOM`, which declares hundreds
 * of browser globals whether or not the runtime provides them; that is how a
 * `structuredClone` call reached the mock adapter, passed every Node-based test
 * and would have crashed on device. Anything not listed here is a name the app
 * cannot rely on existing.
 *
 * The list is transcribed from React Native's own setup, not from memory:
 *
 *   Libraries/Core/setUpGlobals.js       process, self, window
 *   Libraries/Core/setUpTimers.js        the timer family
 *   Libraries/Core/setUpXHR.js           fetch and the request/response types
 *   Libraries/Core/setUpPerformance.js   performance
 *   Libraries/Core/setUpNavigator.js     navigator
 *   Libraries/Core/setUpAlert.js         alert
 *   Libraries/Core/setUpErrorHandling.js ErrorUtils
 *   src/private/setup/setUpDOM.js        the DOM node types
 *
 * When React Native adds a global, add it here with the file it came from. When
 * a polyfill is added to the app, add it here too — the point is that this file
 * is the app's contract with its runtime, kept honest by hand.
 */

// Hermes built-ins that ESNext's lib does not declare.
declare var console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
};
declare var globalThis: Record<string, unknown>;
declare var global: Record<string, unknown>;

/** Metro defines this. False in a production bundle. */
declare var __DEV__: boolean;

// setUpGlobals.js
declare var process: { env: Record<string, string | undefined> };
declare var self: unknown;
declare var window: unknown;

// setUpTimers.js
type TimerHandle = number;
declare function setTimeout(handler: () => void, timeout?: number): TimerHandle;
declare function clearTimeout(handle: TimerHandle): void;
declare function setInterval(handler: () => void, timeout?: number): TimerHandle;
declare function clearInterval(handle: TimerHandle): void;
declare function setImmediate(handler: () => void): TimerHandle;
declare function clearImmediate(handle: TimerHandle): void;
declare function requestAnimationFrame(handler: (time: number) => void): TimerHandle;
declare function cancelAnimationFrame(handle: TimerHandle): void;
declare function requestIdleCallback(handler: () => void): TimerHandle;
declare function cancelIdleCallback(handle: TimerHandle): void;
declare function queueMicrotask(handler: () => void): void;

// setUpXHR.js
declare var fetch: (input: unknown, init?: unknown) => Promise<unknown>;
declare var Headers: unknown;
declare var Request: unknown;
declare var Response: unknown;
declare var XMLHttpRequest: unknown;
declare var FormData: unknown;
declare var Blob: unknown;
declare var File: unknown;
declare var FileReader: unknown;
declare var WebSocket: unknown;
declare var URL: unknown;
declare var URLSearchParams: unknown;
declare var AbortController: unknown;
declare var AbortSignal: unknown;

// setUpPerformance.js / setUpNavigator.js / setUpAlert.js / setUpErrorHandling.js
declare var performance: { now(): number };
declare var navigator: unknown;
declare var alert: (message?: unknown) => void;
declare var ErrorUtils: unknown;

// setUpDOM.js
declare var CharacterData: unknown;
declare var CustomEvent: unknown;
declare var DOMRect: unknown;
declare var DOMRectList: unknown;
declare var DOMRectReadOnly: unknown;
declare var Document: unknown;
declare var Element: unknown;
declare var Event: unknown;
declare var EventTarget: unknown;
declare var HTMLCollection: unknown;
declare var HTMLElement: unknown;
declare var Node: unknown;
declare var NodeList: unknown;
declare var Text: unknown;
