---
sidebar_position: 1
---

# @lec/ddd-tools

Boîte à outils TypeScript pour le **Domain-Driven Design**. Fournit les primitives de base pour construire des domaines métier type-safe.

## Installation

```bash
yarn add @lec/ddd-tools
```

## Exports

```typescript
// Application layer
import {
  Command,
  Result, Ok, Err,
  RepositoryPort,
  Paginated, PaginatedQuery,
} from "@lec/ddd-tools";

// Domain layer
import {
  Entity,
  ValueObject,
  DateRange,
  Address,
  LocalizedContent,
} from "@lec/ddd-tools";

// Errors
import {
  ErrorBase,
  NotFoundError,
  ConflictError,
  EntityValidationError,
  // ...
} from "@lec/ddd-tools";
```

## Dépendances

| Package | Version | Usage |
|---------|---------|-------|
| `zod` | ^4.3.5 | Validation des Value Objects |
| `uuid` | ^13.0.0 | Génération d'identifiants |

## Concepts clés

### Entity

Objet du domaine identifié par son identité (id) plutôt que par ses attributs. Deux entités avec le même id sont considérées identiques.

### ValueObject

Objet immutable défini par la valeur de ses propriétés. Deux value objects avec les mêmes propriétés sont considérés égaux.

### Result

Pattern fonctionnel pour gérer les erreurs sans exceptions. Retourne soit `Ok<T>` soit `Err<E>`, forçant le code appelant à traiter les deux cas.

### Command

Base CQRS pour les commandes. Chaque commande porte un identifiant unique et des métadonnées (executor, timestamp).
