# Ana Pajkovic: Montenegro Property

Search the new-build projects Ana Pajkovic works with in Montenegro, look up one project, and get the buying costs, transfer tax and residency rules a foreign buyer needs. Ana Pajkovic is an independent property advisor working in Montenegro: [anapajkovic.com](https://anapajkovic.com).

## Example requests

- "New apartments in Tivat under €450,000."
- "What's ready to move into in Montenegro?"
- "Tell me about Horizon at Luštica Bay."
- "What would I pay on top of a €1.1M resale in Montenegro?"
- "Can I get residency if I buy off-plan in Montenegro?"

## Tools

| Tool | What it does |
|---|---|
| `find_montenegro_projects` | Projects by area, budget, type or ready now. Returns starting price, payment plan, delivery, status, project page and WhatsApp contact |
| `get_montenegro_project` | One project by name |
| `montenegro_buying_rules` | New build vs resale costs, progressive transfer tax with an estimate, property tax, capital gains tax, residency rules |

The plugin also includes one skill, `montenegro-property`, a plain-text guide telling Claude which tool to use and how to word the answer.

## What it connects to

One remote MCP server, read-only, no sign-in:
`https://wkroaoprtqaxaykbgtcg.supabase.co/functions/v1/montenegro-mcp`

It runs nothing on your machine and asks for no credentials. When Claude calls a tool, only that tool's arguments are sent (an area, a budget, a project name, a price). Your conversation, name and contact details are not sent, and nothing creates an enquiry.

## Limits

- Results cover only the projects Ana currently works with, not every property in Montenegro.
- Prices are asking prices for the cheapest available home in each project, with the date the data was last updated. Units and availability change; confirm with Ana before relying on them.
- Tax and cost figures are general information, not legal or tax advice. Property tax rates differ by municipality.
- Residency: only property registered in the cadastre in the buyer's name can be used. An off-plan contract cannot. Eligibility depends on the person.

## Install

In Claude Code:

```
/plugin marketplace add anavujisic/montenegro-property
/plugin install montenegro-property@ana-pajkovic
```

## Contact

WhatsApp: [+381 69 1300899](https://wa.me/381691300899) · hello@anapajkovic.com
