# Development Guide

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) ≥ 1.1
- [Docker](https://www.docker.com/) & Docker Compose

### First-Time Setup

```bash
# Install dependencies
bun install

# Copy environment file and configure credentials
cp .env.example .env
# Edit .env with your credentials

# Start PostgreSQL
bun run db:up

# Run database migrations
bun run db:migrate
bun run db:migrate:test

# Start dev server (with hot reload)
bun run dev
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run dev` | Start dev server with hot reload |
| `start` | `bun run start` | Start production server |
| `test` | `bun test` | Run test suite |
| `build` | `bun run build` | Build for production |
| `db:up` | `bun run db:up` | Start PostgreSQL |
| `db:down` | `bun run db:down` | Stop PostgreSQL |
| `db:migrate` | `bun run db:migrate` | Run Liquibase migrations |
| `db:migrate:test` | `bun run db:migrate:test` | Migrate test database |
| `db:reset` | `bun run db:reset` | Full database reset |

## Adding a New Module

Follow this checklist to add a new entity (e.g., `Order`):

### 1. Model (`src/models/order.model.ts`)

```typescript
export interface Order {
  id: number;
  userId: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDto {
  userId: number;
  total: number;
}

export interface UpdateOrderDto {
  status?: string;
}

export type OrderResponse = Omit<Order, "sensitiveField">;
```

### 2. Migration (`liquibase/changelogs/002-create-orders-table.yaml`)

```yaml
databaseChangeLog:
  - changeSet:
      id: 002-create-orders-table
      author: your-name
      changes:
        - createTable:
            tableName: orders
            columns:
              - column:
                  name: id
                  type: SERIAL
                  autoIncrement: true
                  constraints:
                    primaryKey: true
              - column:
                  name: user_id
                  type: INTEGER
                  constraints:
                    nullable: false
              - column:
                  name: total
                  type: DECIMAL(10,2)
                  constraints:
                    nullable: false
              - column:
                  name: status
                  type: VARCHAR(50)
                  defaultValue: pending
              - column:
                  name: created_at
                  type: TIMESTAMP WITH TIME ZONE
                  defaultValueComputed: NOW()
              - column:
                  name: updated_at
                  type: TIMESTAMP WITH TIME ZONE
                  defaultValueComputed: NOW()
        - addForeignKeyConstraint:
            baseTableName: orders
            baseColumnNames: user_id
            referencedTableName: users
            referencedColumnNames: id
            constraintName: fk_orders_user
      rollback:
        - dropTable:
            tableName: orders
```

Run: `bun run db:migrate && bun run db:migrate:test`

### 3. DAO (`src/dao/order.dao.ts`)

```typescript
import type { Sql } from "postgres";

export interface IOrderDao {
  findAll(): Promise<Order[]>;
  findById(id: number): Promise<Order | null>;
  create(data: CreateOrderDto): Promise<Order>;
  // ...
}

export function createOrderDao(sql: Sql): IOrderDao {
  return {
    async findAll() {
      const rows = await sql`SELECT * FROM orders ORDER BY id`;
      return rows.map(mapRow);
    },
    // ...
  };
}
```

### 4. Repository (`src/repositories/order.repository.ts`)

Define `IOrderRepository` interface + implementation that delegates to the DAO.

### 5. Service (`src/services/order.service.ts`)

Business logic, validation, and data transformation.

### 6. Controller (`src/controllers/order.controller.ts`)

REST endpoints using Elysia.

### 7. Wire in DI (`src/index.ts`)

```typescript
container.registerSingleton("orderDao", (c) =>
  createOrderDao(c.resolve<DatabaseManager>("database").getConnection())
);
container.registerSingleton("orderRepository", (c) =>
  new OrderRepository(c.resolve<IOrderDao>("orderDao"))
);
container.registerSingleton("orderService", (c) =>
  new OrderService(c.resolve<OrderRepository>("orderRepository"))
);

// Add to Elysia app
.use(createOrderController(container.resolve<OrderService>("orderService")))
```

### 8. Tests

Add tests mirroring the structure in `tests/`:
- `tests/dao/order.dao.test.ts` (real DB)
- `tests/repositories/order.repository.test.ts` (real DB)
- `tests/services/order.service.test.ts` (mocked repo)
- `tests/controllers/order.controller.test.ts` (integration)

Update `tests/helpers/test-utils.ts`:
```typescript
export async function truncateAll(sql: Sql): Promise<void> {
  await sql`TRUNCATE TABLE orders, users RESTART IDENTITY CASCADE`;
}
```

## Project Structure

```
ts-bun-starter/
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env                        # Credentials (gitignored)
├── .env.example                # Template
├── .gitignore
│
├── docs/                       # Documentation
│   ├── architecture.md
│   ├── api-reference.md
│   ├── database.md
│   ├── testing.md
│   └── development.md
│
├── liquibase/                  # Database migrations
│   ├── changelog.yaml
│   ├── liquibase.properties
│   └── changelogs/
│       └── 001-create-users-table.yaml
│
├── scripts/
│   └── init-test-db.sql
│
├── src/
│   ├── index.ts                # Bootstrap & DI wiring
│   ├── config/config.ts
│   ├── container/container.ts
│   ├── database/database.ts
│   ├── common/
│   │   ├── errors.ts
│   │   ├── logger.ts
│   │   └── types.ts
│   ├── models/
│   ├── dao/
│   ├── repositories/
│   ├── services/
│   ├── controllers/
│   └── middleware/
│
└── tests/                      # Mirrors src/
    ├── helpers/test-utils.ts
    ├── container/
    ├── dao/
    ├── repositories/
    ├── services/
    └── controllers/
```
