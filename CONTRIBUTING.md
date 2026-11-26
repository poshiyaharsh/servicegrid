# Contributing & Commit Standards

## Commit Message Standard (Conventional Commits)

This repository follows the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) specification.

### Format

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Allowed Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation-only changes
- `style`: Formatting, missing semicolons, etc. (no code change)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `build`: Build system or external dependency changes
- `ci`: CI/CD configuration and scripts
- `chore`: Maintenance tasks (e.g., `.gitignore`, tooling)

### Examples

- `docs(discovery): add Phase 01 competitor analysis and MVP scope`
- `chore(repo): add gitignore for sensitive and prompt files`
- `feat(auth): implement tenant-isolated JWT session management`

## Security & Privacy Rules

1. Never commit `.env` files, API keys, certificates, or credentials.
2. Never commit internal prompt files (`MASTER_PROMPT.md`, `*PROMPT*.md`).
3. Always use `.env.example` with placeholder values for configuration documentation.
