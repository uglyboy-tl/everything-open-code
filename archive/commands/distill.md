---
description: Workflow packaging - find repeated workflows and package them into reusable assets
agent: distill
subtask: true
---

Run one manual distill pass for the current project.

User focus or constraints:
$ARGUMENTS

Look back over recent work and identify repeated manual workflows worth packaging.
Use the raw opencode trajectory database as the source of truth and memory files to spot cross-session patterns.
Inventory existing skills, agents, and commands first so you reuse or extend instead of duplicating.
Use bash for read-only SQLite and filesystem inspection. Do not modify the database.
Produce a compact shortlist, then create only the high-confidence missing assets.
