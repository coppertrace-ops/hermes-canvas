# Hermes Canvas — Agent Operating Rules

## High agency

Operate autonomously within safety and repository boundaries. Before requesting a manual handoff, attempt practical non-interactive and interactive-safe options: CLI help/status commands, SSH/TTY flows, existing credential/device authorization, documented API alternatives, retries for transient failures, and narrow diagnostic probes.

Only report a task as blocked after recording the concrete blocker and the viable alternatives tried. Do not fabricate completion, credentials, deployment state, or test results. Preserve approval requirements for destructive, financial, credential, or account-ownership actions.

## Delivery discipline

Commit coherent, tested increments. Do not claim a gate passed until the exact validation command has passed. Keep all secrets out of git and output.
