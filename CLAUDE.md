@AGENTS.md

## Claude Code

Claude Code reads this file. Other agents ignore it and read only AGENTS.md.
Keep this overlay thin: model defaults and Claude-only tool names. Shared
doctrine lives in AGENTS.md so every agent and the critic fleet see the same rules.

## Cerebe tools

Cerebe's MCP server is registered in `.mcp.json` as `cerebe`. Prefer its tools to parsing CLI text:
`cerebe_findings` reads a local review's findings for a commit, `cerebe_gate_push` says whether a push would pass, and `cerebe_pr_review_result` reads the pull request's `cerebe/critic` result.
