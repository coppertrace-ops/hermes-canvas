/**
 * The exact web-app origin allowed to (a) embed the sandbox frame
 * (`frame-ancestors` in the content CSP) and (b) postMessage into the shell
 * (verified `event.origin ===` this, spec §2.2). Single source shared by the
 * shell runtime, the header generator, and the drift guard so all three agree.
 *
 * Build-time injected via `NEXT_PUBLIC_APP_ORIGIN`; the default is the production
 * web host placeholder. Update the env (and re-run `pnpm --filter @hermes/content
 * gen-headers`, then commit `vercel.json`) before a prod deploy whose app origin
 * differs (F3).
 */
export const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "https://hermes-canvas.vercel.app";
