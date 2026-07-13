/**
 * Convex Auth JWT provider config (OWNER: ATLAS, plan §6).
 *
 * Declares this deployment as its own auth token issuer. `CONVEX_SITE_URL` is set
 * automatically in every Convex deployment (…convex.site); `@convex-dev/auth`
 * signs session JWTs with the provisioned `JWT_PRIVATE_KEY`/`JWKS` and verifies
 * them against this issuer. No third-party identity provider — closed owner only.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
