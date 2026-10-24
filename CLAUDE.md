@AGENTS.md

## Cerebe tools

Cerebe's MCP server is registered in `.mcp.json` as `cerebe`. Prefer its tools to parsing CLI text:
`cerebe_findings` reads a local review's findings for a commit, `cerebe_gate_push` says whether a push would pass, and `cerebe_pr_review_result` reads the pull request's `cerebe/critic` result.
