# build-kit

Reusable TypeScript infrastructure libraries by [Zeroshot Builders](https://www.zeroshotbuilders.com/).

## Packages

| Package | Description |
|---|---|
| `@zeroshotbuilders/commons` | Core utilities — config loading, Redis, Postgres, BullMQ, logging, crypto |
| `@zeroshotbuilders/commons-testing` | Test utilities — testcontainers for Postgres/Redis, test fixtures |
| `@zeroshotbuilders/sql-decorators` | Sequelize decorators and query utilities |
| `@zeroshotbuilders/openai-utils` | OpenAI client factory and service |
| `@zeroshotbuilders/tavily-utils` | Tavily search client and tool definitions |
| `@zeroshotbuilders/agentic-workflows` | AI agent orchestration — @Agent decorator, session management |

## Prerequisites

- Node 22
- Yarn 4
- Docker (for integration tests)

## Getting Started

```bash
yarn install
yarn nx run-many --target=build
yarn nx run-many --target=test
```

## License

MIT
