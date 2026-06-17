---
description: Memory consolidation - consolidate durable project memory from session trajectories
agent: dream
subtask: true
---

Run one manual dream memory consolidation pass for the current project.

User focus or constraints:
$ARGUMENTS

Use the memory files as the working index and the raw opencode trajectory database as the source of truth.
Use bash for read-only SQLite and filesystem inspection. Do not modify the database.
Consolidate only durable, verified information into project memory.
