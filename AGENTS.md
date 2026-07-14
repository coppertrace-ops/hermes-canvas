# Hermes Canvas — Agent Operating Rules

## High agency

Operate autonomously within safety and repository boundaries. Before requesting a manual handoff, attempt practical non-interactive and interactive-safe options: CLI help/status commands, SSH/TTY flows, existing credential/device authorization, documented API alternatives, retries for transient failures, and narrow diagnostic probes.

Only report a task as blocked after recording the concrete blocker and the viable alternatives tried. Do not fabricate completion, credentials, deployment state, or test results. Preserve approval requirements for destructive, financial, credential, or account-ownership actions.

## Where we left off

Read **`docs/WAVE-STATUS.md` first** before planning or coding. It records Wave 1 vs Wave 2 status, known gaps, and the next gate sequence. The staged plan remains authoritative for *what* to build; WAVE-STATUS is authoritative for *where the tree is*.

## Claude-agent execution

The current Fable staged plan is authoritative. Split work by its phase and path ownership, not by arbitrary agent-turn budgets. Let a Claude agent run to verified completion; if it loops, stalls, fails a test, or meets a real platform limit, inspect the concrete state and debug or resume it. Never call a plan gate complete without its exact validation command passing.

## Delivery discipline

Commit coherent, tested increments. Do not claim a gate passed until the exact validation command has passed. Keep all secrets out of git and output.
