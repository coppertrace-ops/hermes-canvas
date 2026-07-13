# Cursor Cloud / Background Agents

**Primary URLs:**
- https://cursor.com/docs/cloud-agent (Cloud Agents docs)
- https://cursor.com/cloud (Cloud Agents landing)
- https://cursor.com/changelog/1-1 (Background Agents in Slack)
- https://cursor.com/docs/account/pricing (pricing)
- https://cursor.com/blog/cloud-agents (announcement)

**Accessed:** 2026-07-13

## Verbatim quotes (PRIMARY / official)

- "You can run as many agents as you want in parallel, and they do not require your local machine to be connected to the internet." (docs/cloud-agent)
- "The Cloud Agents dashboard shows which environment an agent used, along with environment details and version history." (docs/cloud-agent)
- "Cloud agents clone your repo from GitHub, GitLab, Azure DevOps Services, or Bitbucket Cloud and work on a separate branch, then push changes to your repo for handoff." (docs/cloud-agent)
- "Agents produce merge-ready PRs with artifacts to demo their changes." (docs/cloud-agent)
- "You can also control the agent's remote desktop to use the modified software." / "Release control back to the agent for it to keep working." (docs/cloud-agent) — human take-over / hand-back.
- "Cursor-managed Cloud Agents are the default path for most teams." / "Use My Machines or Self-Hosted Pool when you want to own the machine that executes terminal commands..." (docs/cloud-agent) — hosted-managed default + BYO-compute option.
- "Cloud Agents are charged at API pricing for the selected model. You'll be asked to set a spend limit when you first start using them." (docs/cloud-agent)
- Surfaces (per docs): cursor.com/agents browser dashboard, iOS mobile app, Slack (@Cursor mention), Microsoft Teams, GitHub comments/PRs, Linear Kanban.

## Pricing (official, accessed 2026-07-13)
- Pro $20/mo ($20 API usage incl.); Pro+ $60/mo ($70 incl.); Ultra $200/mo ($400 incl.). Teams: Standard $40/user/mo, Premium $120/user/mo. "All individual plans include ... access to Cloud Agents." Cloud Agents billed at model API pricing with a user-set spend limit.

## Confidence
- HIGH on parallel agents, dashboard existence, PR/branch provenance, take-over control, managed+BYO-compute, API-priced billing (all official docs).
- MEDIUM on exact structured-event streaming: docs describe a dashboard + remote desktop but do NOT document a structured tool/event stream API (no evidence of one; state shown via dashboard + PR).
