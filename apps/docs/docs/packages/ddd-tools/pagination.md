---
sidebar_position: 7
---

# Pagination

Utilitaires pour gérer la pagination, le tri et le filtrage des requêtes.

## Types

### PaginatedQuery

```typescript
interface PaginatedQuery {
  page: number;
  limit: number;
  orderBy?: OrderBy[];
  filters?: Filter[];
  search?: string;
}
```

### Paginated (réponse)

```typescript
class Paginated<T, U = unknown> {
  readonly count: number;
  readonly limit: number;
  readonly page: number;
  readonly data: T[];
  readonly metadata?: U;
}
```

### Filter

```typescript
enum FilterOp {
  CONTAINS,
  EQUALS,
  IN,
  SOME,
  HAS,
}

enum FilterAssociation {
  AND,
  OR,
}

interface Filter {
  field: string;
  operator: FilterOp;
  value: unknown;
}
```

### OrderBy

```typescript
interface OrderBy {
  field: string;
  param: "asc" | "desc";
}
```

## Utilisation

```typescript
import { Paginated, type PaginatedQuery, FilterOp } from "@lec-core/ddd-tools";

// Construire une requête paginée
const query: PaginatedQuery = {
  page: 1,
  limit: 20,
  orderBy: [{ field: "createdAt", param: "desc" }],
  filters: [
    { field: "status", operator: FilterOp.EQUALS, value: "active" },
  ],
  search: "alice",
};

// Retourner une réponse paginée
const result = new Paginated({
  count: 100,
  limit: 20,
  page: 1,
  data: users,
});
```
