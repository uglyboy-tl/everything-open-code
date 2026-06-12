---
description: Write a session checkpoint to preserve state across context resets
agent: checkpoint-writer
subtask: true
---

Write a checkpoint for the current session.

Review the conversation so far and write a structured state file to `.opencode/memory/sessions/<SESSION_ID>/checkpoint.md`.

Also update `.opencode/memory/MEMORY.md` with any durable project-level knowledge that has emerged.
