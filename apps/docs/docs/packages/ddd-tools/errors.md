---
sidebar_position: 8
---

# Errors

Hiérarchie d'erreurs typées pour une gestion d'erreurs cohérente à travers tout le domaine.

## ErrorBase

Classe abstraite dont toutes les erreurs héritent.

```typescript
abstract class ErrorBase extends Error {
  abstract readonly code: string;
  readonly cause?: Error;
  readonly metadata?: Record<string, unknown>;

  toJSON(): { code: string; message: string; metadata?: Record<string, unknown> };
}
```

## Erreurs disponibles

### Erreurs d'arguments

| Classe | Code | Description |
|--------|------|-------------|
| `ArgumentInvalidError` | `ARGUMENT_INVALID` | Argument invalide |
| `ArgumentNotProvidedError` | `ARGUMENT_NOT_PROVIDED` | Argument manquant |
| `ArgumentOutOfRangeError` | `ARGUMENT_OUT_OF_RANGE` | Argument hors limites |

### Erreurs métier

| Classe | Code | Description |
|--------|------|-------------|
| `NotFoundError` | `NOT_FOUND` | Ressource introuvable |
| `ConflictError` | `CONFLICT` | Conflit de données |
| `UnauthorizedError` | `UNAUTHORIZED` | Non autorisé |

### Erreurs de validation

| Classe | Code | Description |
|--------|------|-------------|
| `EntityValidationError` | `ENTITY_VALIDATION` | Validation d'entité échouée |
| `ValueObjectValidationError` | `VALUE_OBJECT_VALIDATION` | Validation de value object échouée |

### Erreurs d'infrastructure

| Classe | Code | Description |
|--------|------|-------------|
| `InternalServerError` | `INTERNAL_SERVER_ERROR` | Erreur serveur interne |
| `UnknownError` | `UNKNOWN` | Erreur inconnue |
| `MapperError` | `MAPPER_ERROR` | Erreur de mapping (DTO / Entity) |

### Erreurs de Value Objects

| Classe | Code | Description |
|--------|------|-------------|
| `InvalidDateRangeError` | `INVALID_DATE_RANGE` | Plage de dates invalide |
| `TranslationNotFoundError` | `TRANSLATION_NOT_FOUND` | Traduction introuvable |

## Utilisation

```typescript
import { NotFoundError, Result, Err } from "@lec-packages/ddd-tools";

function findUser(id: string): Result<User, NotFoundError> {
  const user = db.find(id);
  if (!user) {
    return Err.of(new NotFoundError(`User ${id} not found`));
  }
  return Ok.of(user);
}
```

## Sérialisation

Toutes les erreurs sont sérialisables via `toJSON()` :

```typescript
const error = new NotFoundError("User not found");
console.log(JSON.stringify(error));
// { "code": "NOT_FOUND", "message": "User not found" }
```
