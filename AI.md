---
apply: always
---

# Coding Agent Guidelines

## build-kit

build-kit is an NX monorepo of reusable TypeScript infrastructure libraries published under the `@zeroshotbuilders/*`
scope. These packages provide shared utilities for NestJS-based backend services — configuration, database access,
job queues, AI agent orchestration, and testing infrastructure.

## Build and Test

```bash
yarn nx run <package>:build     # compile a single package (+ deps)
yarn nx run <package>:lint      # lint a single package
yarn nx run <package>:test      # test a single package
yarn nx run-many --target=build # build everything
yarn install                    # only if deps change
```

**IMPORTANT: You MUST run tests for every package you modify.** Do not skip tests. Tests are the final validation.
Never run all tests — only for changed packages. Fix any failures before moving on.

## Key Rules

- **Errors**: Always throw `ServerError` from "nice-grpc". Never throw `Error`.
- **Logging**: Always use `winston` (`createLogger`). Never use `console`.
- **100% of DML** must use the `sql-decorators` framework. All queries live in DAOs.
- **DI**: All classes managed via NestJS. Use `@Injectable()`.
- Keep logging and error handling focused and minimal.

## Packages

| Package | Purpose |
|---|---|
| `commons` | Core utilities — config, redis, postgres, bull, logging, crypto |
| `commons-testing` | Test utilities — testcontainers for postgres/redis, ollama fixture |
| `sql-decorators` | Sequelize decorators and query utilities |
| `openai-utils` | OpenAI client factory and service |
| `tavily-utils` | Tavily search client + tool definitions |
| `agentic-workflows` | AI agent orchestration — @Agent decorator, session management |

## Detailed Documentation

Canonical deep-dive docs live in `.ai/`:

| Topic | File |
|---|---|
| sql-decorators framework & queries | `.ai/sql-decorators.md` |
| Testing (integration, unit, testcontainers) | `.ai/testing.md` |
| Configuration loading | `.ai/configuration.md` |
| NestJS dependency injection | `.ai/dependency-injection.md` |
| BullMQ crons & async workers | `.ai/bull-queues.md` |
| AI agents (OpenAI SDK) | `.ai/ai-agents.md` |

## On-Demand Skills

Canonical skill guides live in `.ai/skills/`:

- `testing-guide`

When a task matches a skill, open the relevant `.ai/skills/<name>.md` and follow it.
