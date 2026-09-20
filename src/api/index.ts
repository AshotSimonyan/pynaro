/**
 * The only module above this folder anyone imports. It picks the adapter from
 * `EXPO_PUBLIC_API_MODE` and re-exports the API behind one interface, so
 * swapping the mock for HTTP in step 14 is a change here and nowhere else.
 *
 * Both adapters are imported statically, so both are in the bundle. That is
 * fine while the mock is the only working one; step 14 should make this a
 * build-time branch so the mock and its seed data do not ship to production.
 */
import { config } from "@/lib/config";

import type { Api, DevControls } from "./contract";
import { httpApi, httpDevControls } from "./http";
import { mockApi, mockDevControls } from "./mock";

const useHttp = config.apiMode === "http";

export const api: Api = useHttp ? httpApi : mockApi;

/** Dev-only levers. `available` is false when they do nothing. */
export const devControls: DevControls = useHttp ? httpDevControls : mockDevControls;

export * from "./types";
export * from "./errors";
export * from "./keys";
export type {
  Actor,
  Api,
  CreateJobInput,
  DevControls,
  LatencyRange,
  ListJobsParams,
  Page,
  WriteOptions,
} from "./contract";
