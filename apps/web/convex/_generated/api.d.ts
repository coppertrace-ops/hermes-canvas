/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentWrites from "../agentWrites.js";
import type * as canvas from "../canvas.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as human from "../human.js";
import type * as lastSeen from "../lastSeen.js";
import type * as lib_agentAuth from "../lib/agentAuth.js";
import type * as lib_outcome from "../lib/outcome.js";
import type * as lib_store from "../lib/store.js";
import type * as metrics from "../metrics.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentWrites: typeof agentWrites;
  canvas: typeof canvas;
  files: typeof files;
  http: typeof http;
  human: typeof human;
  lastSeen: typeof lastSeen;
  "lib/agentAuth": typeof lib_agentAuth;
  "lib/outcome": typeof lib_outcome;
  "lib/store": typeof lib_store;
  metrics: typeof metrics;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
