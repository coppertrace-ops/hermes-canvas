import { z } from "zod";

/**
 * Shared zod primitives for Hermes Canvas environment validation.
 *
 * Ownership: ATLAS. This package NEVER contains secret values — only the
 * shapes and validation rules. Real values live in deployment env / .env
 * (git-ignored). See `.env.example` for the template.
 */

/** An https origin with no trailing slash, e.g. https://hermes-canvas.vercel.app */
export const originSchema = z
  .string()
  .url()
  .refine((v) => v.startsWith("https://") || v.startsWith("http://localhost"), {
    message: "origin must be https:// (or http://localhost for local dev)",
  })
  .refine((v) => !v.endsWith("/"), { message: "origin must not have a trailing slash" });

/** Convex client deployment URL, e.g. https://acoustic-hedgehog-123.convex.cloud */
export const convexUrlSchema = z
  .string()
  .url()
  .refine((v) => v.includes(".convex.cloud") || v.startsWith("http://127.0.0.1"), {
    message: "expected a *.convex.cloud URL (or a local convex dev URL)",
  });

export const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

/** A 256-bit token, hex or base64url, ≥ 43 chars. Used only for shape checks. */
export const serviceTokenSchema = z
  .string()
  .min(43, "service token must be at least 256 bits of entropy (>= 43 chars)");

export const emailSchema = z.string().email();

export type Origin = z.infer<typeof originSchema>;
