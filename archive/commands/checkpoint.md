---
description: Write a session checkpoint to preserve state across context resets
agent: checkpoint-writer
subtask: true
---

SESSION_ID: !`P=$(opencode db path 2>/dev/null || echo "$HOME/.local/share/opencode/opencode.db") && sqlite3 -readonly "$P" "SELECT id FROM session WHERE parent_id IS NULL ORDER BY time_updated DESC LIMIT 1" 2>/dev/null || echo "new-$(date +%s)"`

Write a checkpoint for this session. Update checkpoint.md and MEMORY.md based on the parent session conversation (queryable from the SQLite database using the SESSION_ID above) and any entries in notes.md.
