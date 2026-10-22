# Agent workspace guidelines

## Security Guardrails

1. For vague prompts, use plan mode and wait for approval.
2. **Only touch what was asked.** Change only the files named for the task. Do
   not "improve," reformat, or refactor anything on the side. If you think
   another change is needed, propose it and wait.
3. Do not delete files or clean the repository unless explicitly prompted.

## Preferences

1. Use `uv` for Python env manager. Use default global Python version if initializing.
2. Git is read-only for agents. Do not commit anything unless explicitly prompted. Do not init a repo if there isn't one.
