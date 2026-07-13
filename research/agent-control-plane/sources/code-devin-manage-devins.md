# Devin — Managed Devins (fleet / coordinator = closest thing to mission-control)

Accessed: 2026-07-13
Confidence: high (official Cognition blog)

## PRIMARY — "Devin can now Manage Devins" (https://cognition.com/blog/devin-can-now-manage-devins)
- "Devin can break down large tasks and delegate them to a team of managed Devins that work in parallel."
- "Each managed Devin is a full Devin, running in its own isolated virtual machine with its own terminal, browser, and development environment."
- "Each one can independently run shell commands, execute tests, and verify its own changes before reporting back."
- Coordinator model: "The main Devin session acts as a coordinator: it scopes the work, assigns each piece to a managed Devin, monitors progress, resolves any conflicts, and compiles the results."
- "Each managed Devin gets a clean slate, a narrow focus, its own shell, and its own test runner. And they all run in parallel."
- Legibility of runs: "Devin can also read the full trajectories of its managed Devins to understand what worked, what didn't, and where they got stuck."
- Human access per run: "Each has its own session link, so you can inspect its work or message it directly."

## Notes / analysis
- This is Cognition's fleet story: an orchestrator Devin + N managed Devins, each with its own inspectable session link and full trajectory.
- It is agent-orchestrated fanout, NOT a purpose-built human "mission-control grid" dashboard over arbitrary runs (though Teams plan adds an "admin dashboard with analytics").
- Workspace note (docs, via search): repos added at app.devin.ai/workspace; uncommitted/non-snapshot state disappears when a session ends. Confidence: med.
