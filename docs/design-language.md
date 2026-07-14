# Hermes Canvas — design language (GLASS)

The visual contract for the product. Apple-calibre restraint: system type, neutral
surfaces with a single accent, hairline borders, an 8-pt rhythm, short ease-out
motion, honest empty/loading/error states, visible focus, and dark + light as
first-class peers. No gradients, no glow.

This document is the map between the token system and the rules that consume it,
and it names the **className ↔ CSS coverage contract** that keeps the product's
hero surfaces from silently rendering at browser defaults.

## Where the styles live

Everything ships through one import — `@hermes/ui/styles.css` — which the app
pulls in once (`apps/web/app/globals.css`). Load order matters:

| Sheet | Owns |
| --- | --- |
| `packages/ui/src/styles/tokens.css` | the CSS variables (the single source of truth) |
| `packages/ui/src/styles/base.css` | element resets and document defaults |
| `packages/ui/src/styles/components.css` | primitive classes (`hc-btn`, `hc-input`, `hc-tab`, `hc-panel`, …) |
| `packages/ui/src/styles/canvas.css` | composed content surfaces referenced by `@hermes/render`, `apps/web/components/canvas`, and `apps/web/components/history` (`hc-md`, `hc-split`, `hc-artifact-state`, `hc-mermaid`, `hc-tabbar`, `hc-canvas`, and the history diff/timeline/dialog surfaces) |
| `apps/web/app/globals.css` | app-frame chrome only (`hc-brand`, `hc-header`, `hc-viewswitch`, `hc-databanner`, workspace layout) |

`@hermes/render` deliberately ships **no** stylesheet of its own; its class
contract is authored in `canvas.css` so there is exactly one place to import.

## Tokens

Read tokens; never write a literal colour or size in a rule. The full set is in
`tokens.css`; the load-bearing families:

- **Type** — `--hc-font-sans` (system stack), `--hc-font-mono`. Size scale
  `--hc-font-size-{xs 11, sm 13, base 15, md 17, lg 20, xl 24, 2xl 31, 3xl 40}`.
  Weights `--hc-weight-{regular 400, medium 500, semibold 600, bold 700}`. Line
  heights `--hc-line-{tight, snug, normal, relaxed}`; tracking
  `--hc-tracking-{tight, normal, wide}`.
  There is **no** `--hc-font-weight-*` token — that name is a phantom; use
  `--hc-weight-*`.
- **Space** — 8-pt grid: `--hc-space-{1 4px … 16 64px}` (2 and 4 are the
  quarter/half steps).
- **Radius** — `--hc-radius-{xs 4, sm 6, md 8, lg 12, xl 16, full}`.
- **Motion** — `--hc-duration-{1 120ms, 2 160ms, 3 220ms}` (house style is
  150–200ms; use `--hc-duration-2`). Easings `--hc-ease-{standard, out, in-out}`.
  There is **no** `--hc-duration-fast`.
- **Colour** — one neutral surface ladder (`--hc-bg`, `--hc-surface`,
  `--hc-surface-2`, `--hc-surface-sunken`, `--hc-surface-hover/active`), text
  ladder (`--hc-text`, `-secondary`, `-tertiary`, `-inverted`), hairlines
  (`--hc-border`, `--hc-border-strong`), a single accent (`--hc-accent*`), and
  status families (`success | warning | danger | info`) each with a base (text on
  subtle bg), a `-solid` (dot/fill), and a `-subtle` (tint).
- **Focus** — `--hc-focus-ring-{width, offset, color}`; the ring is the accent.

Because tokens.css is always imported, **rules do not carry literal fallbacks**
(`var(--hc-radius-lg)`, never `var(--hc-radius-lg, 10px)` — the literal drifts and
lies).

## Type scale

Body/content defaults to `--hc-font-size-base` (15px), set once on `body` in
base.css and inherited by every content surface — Markdown prose renders at 15px.
Chrome and metadata (headers, the view switch, badges, banners, tab labels) may
step down to `sm` (13px) or `xs` (11px). Prose headings map to the scale by
element: `h1 → xl`, `h2 → lg`, `h3 → md`, `h4–h6 → base`.

## Spacing & layout

All gaps, padding, and margins come off the 8-pt space tokens. Vertical rhythm in
flowing content uses an owl selector (`> * + *`) rather than per-element bottom
margins, so blocks compose without double-margins.

## Prose spec (`hc-md`)

The safe-Markdown renderer's output. Column capped at `68ch` for readability;
15px/relaxed line-height. Code is mono on `--hc-surface-sunken` (inline chip +
fenced block with `overflow-x: auto`). Lists indent on the grid with tertiary
markers. Blockquotes take a `--hc-border-strong` rule and secondary text. The
**blocked-external-image** state (`hc-md__img-blocked`) is intentionally
conspicuous — a `--hc-danger`-bordered, `--hc-danger-subtle` chip carrying the
target URL in mono — because it is security-audit evidence, not decoration. A
scheme-rejected link (`hc-md__link-blocked`) renders as dotted, not-allowed, inert
text so it can never be mistaken for a live link.

## State patterns

- **Empty / loading / error are honest, never blank.** `hc-artifact-state*`
  centres in the pane with a min-height; the error variant is an `role="alert"`.
  Mermaid failures render a `--hc-danger` card **plus the raw source**, never a
  blank pane or an injected error graphic.
- **Focus is always visible.** Every interactive element has a `:focus-visible`
  ring (base.css supplies the floor; components override with their own). The
  split handle and rail items keep explicit rings.
- **Meaning never rides on colour alone** — states pair colour with a label,
  shape, or text (e.g. the changed badge carries a number + `aria-label`).
- **Motion is short and ease-out** (`--hc-duration-2`), and every animation is
  disabled under `prefers-reduced-motion`.

### The resize handle (`hc-split__separator`)

Regression watch: this element must have a real hit area. It is an ~11px gutter
painted as a single 1px hairline that tints to the accent on hover, drag
(`.hc-split[data-dragging]`), and `:focus-visible`. It is keyboard-operable
(arrow/Home/End via `useResizablePane`) and must keep its focus ring. A 0px
separator reads as "the pane isn't resizable" — do not let it collapse.

### Tab bar (`hc-tabbar`)

Per-tab controls (reorder / rename / archive) are icon buttons that stay hidden
until the tab is hovered, focused-within, or active — so the bar reads calm while
every control remains one keyboard focus away. Rename uses the `Input` primitive.

## The className ↔ CSS coverage contract

**Every structural `hc-*` class a component references MUST resolve to a rule in a
shipped sheet.** A referenced-but-undefined class means that surface renders at
browser defaults — the failure mode this design system exists to prevent.

This is enforced, not aspirational: `packages/render/src/styles-coverage.test.ts`
re-derives the referenced set and the defined set (from the sheets above) on every
test run, and fails if any referenced class lacks a rule. When you add a class in
a component, add its rule in the same change.

The scanner is careful about two things, both regression-tested:

- **It reads `className` regions only** — the quoted value or the balanced `{…}`
  expression (cx(...), ternary, template literal). A `storageKey="hc-…"`, a
  `data-*`, or an aria label is therefore never misread as a class reference
  (e.g. `storageKey="hc-chat-canvas-split"` is not a class and must not be
  flagged).
- **Dynamic classnames degrade to their static base.** `hc-badge--${variant}`,
  `hc-btn--${size}`, `hc-text--${tone}` etc. are built by interpolation and are
  real, used classes; the scanner extracts the base (`hc-badge`) and never
  demands — or flags — the interpolated suffix. Never delete a `--modifier` rule
  just because no static literal references it.

Reference dirs: `packages/render/src`, `packages/ui/src/components`,
`apps/web/components/{canvas,history,integration}`, and the auth screens.

## Dark / light

Both are first-class. tokens.css defines light on `:root`, a shared dark block for
system-dark (`@media (prefers-color-scheme: dark)`) and explicit dark
(`[data-theme="dark"]`), and an explicit-light override. Rules reference tokens
only, so a component is automatically correct in both themes — **never** branch on
theme in a component rule or hard-code a hex.
