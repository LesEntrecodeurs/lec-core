# @lec-core/ddd-tools

Boîte à outils TypeScript pour le **Domain-Driven Design**. Fournit des primitives type-safe pour construire des domaines métier : `Entity`, `ValueObject`, le pattern `Result`, les `Command`/`Query` CQRS, la pagination et une hiérarchie d'erreurs typées.

- **npm** : `@lec-core/ddd-tools`
- **Dépendances runtime** : `zod` (^4), `uuid` (^13)
- **Format** : ESM + CJS + types `.d.ts`

## Installation

Installer le package avec yarn ou npm.

```bash
yarn add @lec-core/ddd-tools
# ou
npm install @lec-core/ddd-tools
```

## Imports

Tout est exporté depuis la racine du package, quelle que soit la couche (domain, application, errors).

```typescript
import {
  // Domain
  Entity,
  ValueObject,
  Address,
  DateRange,
  LocalizedContent,
  // Application
  Result,
  Ok,
  Err,
  Command,
  QueryBase,
  PaginatedQueryBase,
  RepositoryPort,
  Paginated,
  paginatedQueryToQueryString,
  // Errors
  ErrorBase,
  NotFoundError,
  ConflictError,
  ArgumentInvalidError,
  EntityValidationError,
  ValueObjectValidationError,
  ApiErrorResponse,
} from "@lec-core/ddd-tools";
```

## Result — gestion d'erreur sans exception

`Result<T, E>` est une union discriminée `Ok<T, E> | Err<T, E>`. On construit les variantes avec les factories statiques `Ok.of(value)` et `Err.of(error)`, puis on discrimine avec `isOk()` / `isErr()` avant de lire `.value` ou `.error`.

```typescript
import { Ok, Err, type Result } from "@lec-core/ddd-tools";

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) {
    return Err.of(new Error("Division by zero"));
  }
  return Ok.of(a / b);
}

const result = divide(10, 2);

if (result.isOk()) {
  console.log(result.value); // 5  — typé number
} else {
  console.error(result.error.message); // typé Error
}
```

### Signature de Result, Ok et Err

`isOk()` et `isErr()` sont des type guards : à l'intérieur d'un `if (result.isOk())`, TypeScript sait que `result.value` est disponible.

```typescript
export type Result<T, E extends Error> = Ok<T, E> | Err<T, E>;

export class Ok<T, E> {
  static of<T, E>(value: T): Ok<T, E>;
  readonly value: T;
  isOk(): this is Ok<T, E>; // true
  isErr(): this is Err<T, E>; // false
}

export class Err<T, E> {
  static of<T, E>(error: E): Err<T, E>;
  readonly error: E;
  isOk(): this is Ok<T, E>; // false
  isErr(): this is Err<T, E>; // true
}
```

## Entity — objet identifié par son id

`Entity<T, U>` modélise un objet du domaine dont l'égalité repose sur son **identité** (`id`) et non sur ses attributs. Le constructeur est `protected` : on instancie via une factory statique. `U` est le type de l'id (`string | number` par défaut).

```typescript
import { Entity } from "@lec-core/ddd-tools";

interface UserProps {
  id: string;
  email: string;
  name: string;
}

class User extends Entity<UserProps> {
  static create(props: UserProps): User {
    return new User(props);
  }

  get email(): string {
    return this._props.email;
  }
}

const a = User.create({ id: "1", email: "a@lec.fr", name: "Alice" });
const b = User.create({ id: "1", email: "renamed@lec.fr", name: "Alice 2" });

a.equals(b); // true — même id, donc même entité
a.id; // "1"
```

### Signature d'Entity

```typescript
export abstract class Entity<T extends { id: U }, U = string | number> {
  protected constructor(protected _props: T);
  get id(): U;
  equals(obj: Entity<T, U>): boolean; // égalité par id
}
```

## ValueObject — objet défini par sa valeur

`ValueObject<T>` modélise un objet **immutable** dont l'égalité repose sur la valeur de ses propriétés (comparaison structurelle via `JSON.stringify`). Idéal pour les concepts sans identité propre (montant, plage de dates, adresse).

```typescript
import { ValueObject } from "@lec-core/ddd-tools";

interface MoneyProps {
  amount: number;
  currency: string;
}

class Money extends ValueObject<MoneyProps> {
  get amount(): number {
    return this.props.amount;
  }
}

const a = new Money({ amount: 100, currency: "EUR" });
const b = new Money({ amount: 100, currency: "EUR" });

a.equals(b); // true — mêmes propriétés
```

### Signature de ValueObject

```typescript
export abstract class ValueObject<T extends Record<string, any>> {
  public props: T;
  constructor(props: T);
  equals(vo?: ValueObject<T>): boolean; // comparaison structurelle
}
```

## Value Objects fournis

Les Value Objects prêts à l'emploi se construisent via leur factory statique `.create(props)` qui valide les entrées avec Zod et renvoie un `Result<VO, ValueObjectValidationError>`.

### Address

Adresse postale validée (`street`, `city`, `country`, `postalCode` tous requis).

```typescript
import { Address } from "@lec-core/ddd-tools";

const result = Address.create({
  street: "10 rue de la Paix",
  city: "Paris",
  country: "France",
  postalCode: "75002",
});

if (result.isOk()) {
  const address = result.value;
  address.toString(); // "10 rue de la Paix, 75002 Paris, France"
  address.snapshot; // { street, city, country, postalCode }
}
```

### DateRange

Plage de dates avec garantie `from <= to` et opérations temporelles.

```typescript
import { DateRange } from "@lec-core/ddd-tools";

const result = DateRange.create({
  from: new Date("2026-01-01"),
  to: new Date("2026-01-31"),
});

if (result.isOk()) {
  const range = result.value;
  range.durationInDays(); // 30
  range.durationInHours();
  range.contains(otherRange); // boolean
  range.overlaps(otherRange); // boolean
  range.startSameDayAs(new Date("2026-01-01")); // true
}
// Err(ValueObjectValidationError) si from > to
```

### LocalizedContent

Contenu multilingue (`Record<langue, texte>`) avec fallback et mutation des traductions.

```typescript
import { LocalizedContent } from "@lec-core/ddd-tools";

const result = LocalizedContent.create({
  fr: "Bonjour",
  en: "Hello",
});

if (result.isOk()) {
  const content = result.value;
  content.getTranslation("fr"); // "Bonjour"
  content.getOrFallback("de", "en"); // "Hello" (fallback)
  content.hasTranslation("en"); // true
  content.getLanguages(); // ["fr", "en"]

  content.addTranslation("es", "Hola"); // Result<void, ValueObjectValidationError>
  content.removeTranslation("en"); // Result<void, TranslationNotFoundError>
}
```

## Command — base CQRS pour les commandes

`Command` est la classe de base des commandes CQRS. Chaque commande reçoit un `id` (UUID v4 auto-généré si absent) et des `metadata` (`executor`, `timestamp`, `userId` optionnel).

```typescript
import { Command, type CommandProps } from "@lec-core/ddd-tools";

class CreateUserCommand extends Command {
  readonly email: string;
  readonly name: string;

  constructor(props: CommandProps<CreateUserCommand>) {
    super(props);
    this.email = props.email;
    this.name = props.name;
  }
}

const command = new CreateUserCommand({
  email: "user@lec.fr",
  name: "Alice",
  metadata: { executor: "user", timestamp: Date.now(), userId: "u-42" },
});

command.id; // UUID auto-généré
command.metadata.executor; // "user"
```

### Types Command

`executor` vaut `"system" | "anonymous" | "user"` et par défaut `"anonymous"`.

```typescript
export type MetadataExecutor = "system" | "anonymous" | "user";

export type CommandMetadata = {
  readonly executor: MetadataExecutor;
  readonly timestamp: number;
  readonly userId?: string;
};

export type CommandProps<T> = Omit<T, "id" | "metadata"> & Partial<Command>;
```

## Query — base CQRS pour les requêtes paginées

`QueryBase` est la base des requêtes simples. `PaginatedQueryBase` ajoute la pagination : il calcule automatiquement `offset` à partir de `page` (limit par défaut : 20).

```typescript
import { PaginatedQueryBase, type PaginatedParams } from "@lec-core/ddd-tools";

class ListUsersQuery extends PaginatedQueryBase {
  constructor(props: PaginatedParams<ListUsersQuery>) {
    super(props);
  }
}

const query = new ListUsersQuery({
  page: 3,
  limit: 25,
  search: "alice",
  orderBy: [{ field: "createdAt", param: "desc" }],
  filters: [{ field: "active", operator: "equals", value: true }],
});

query.offset; // 50  → (page - 1) * limit
query.page; // 3
```

## Pagination — Paginated & filtres

`Paginated<T, U>` enveloppe une page de résultats. Les filtres et tris sont validés par des schémas Zod exportés.

```typescript
import { Paginated } from "@lec-core/ddd-tools";

const page = new Paginated<User>({
  count: 137, // total d'éléments
  limit: 25,
  page: 1,
  data: users, // readonly User[]
});

page.count; // 137
page.data; // readonly User[]
```

### Filtres, tri et schémas Zod

`Filter` est une union d'opérateurs (`contains`, `equals`, `in`, `some`, `has`). `OrderBy`, `PaginatedQuery`, `Limit` sont également des schémas Zod réutilisables.

```typescript
import { Filter, OrderBy, PaginatedQuery, LIMIT } from "@lec-core/ddd-tools";

// Opérateurs de filtre disponibles
const filters = [
  { field: "name", operator: "contains", value: "ali" },
  { field: "status", operator: "equals", value: "active" },
  { field: "role", operator: "in", value: ["admin", "user"] },
];

const order = { field: "createdAt", param: "desc" }; // OrderBy

LIMIT; // [10, 25, 50, 100] — valeurs de limite autorisées (Limit)

// Validation runtime via Zod
const parsed = PaginatedQuery.parse({ page: 1, limit: 25 });
```

### Sérialiser une requête paginée en query string

`paginatedQueryToQueryString` transforme un `PaginatedQuery` en query string d'URL (orderBy et filters sont JSON-encodés).

```typescript
import { paginatedQueryToQueryString } from "@lec-core/ddd-tools";

const qs = paginatedQueryToQueryString({
  page: 2,
  limit: 25,
  search: "alice",
  orderBy: [{ field: "createdAt", param: "desc" }],
});
// "page=2&limit=25&orderBy=[{\"field\":\"createdAt\",\"param\":\"desc\"}]&search=alice"
```

## Repository — port générique de persistance

`RepositoryPort<Entity>` définit les opérations CRUD génériques. On l'étend pour chaque agrégat et on ajoute les requêtes spécifiques.

```typescript
import { RepositoryPort } from "@lec-core/ddd-tools";

abstract class UserRepository extends RepositoryPort<User> {
  // hérité : save, findById, findAll, delete
  abstract findByEmail(email: string): Promise<User | null>;
}
```

### Signature de RepositoryPort

```typescript
export abstract class RepositoryPort<Entity> {
  abstract save(entity: Entity): Promise<void>;
  abstract findById(id: string): Promise<Entity | null>;
  abstract findAll(): Promise<Entity[]>;
  abstract delete(entity: Entity): Promise<void>;
}
```

## Erreurs typées

`ErrorBase` est la classe de base des exceptions métier : chaque sous-classe porte un `code` stable (utilisable au-delà de `instanceof`, ex. entre microservices) et une méthode `toJSON()` sérialisable.

```typescript
import {
  ErrorBase,
  NotFoundError,
  ConflictError,
  ArgumentInvalidError,
  EntityValidationError,
} from "@lec-core/ddd-tools";

throw new NotFoundError("User not found");
// error.code === "GENERIC.NOT_FOUND"

// Erreur métier personnalisée
class InsufficientBalanceError extends ErrorBase {
  readonly code = "WALLET.INSUFFICIENT_BALANCE";
}

const err = new InsufficientBalanceError("Solde insuffisant", undefined, {
  required: 100,
  available: 30,
});
err.toJSON(); // { message, code, stack, cause, metadata }
```

### Erreurs et codes fournis

```typescript
// Classes (toutes extends ErrorBase)
ArgumentInvalidError;       // GENERIC.ARGUMENT_INVALID
ArgumentNotProvidedError;   // GENERIC.ARGUMENT_NOT_PROVIDED
ArgumentOutOfRangeError;    // GENERIC.ARGUMENT_OUT_OF_RANGE
ConflictError;              // GENERIC.CONFLICT
NotFoundError;              // GENERIC.NOT_FOUND
InternalServerError;        // GENERIC.INTERNAL_SERVER_ERROR
UnknownError;               // GENERIC.UNKNOWN_ERROR
UnauthorizedError;          // UNAUTHORIZED
EntityValidationError;      // ENTITY_VALIDATION_ERROR (errors[])
ValueObjectValidationError; // VALUE_OBJECT_VALIDATION_ERROR (errors[])
MapperError;                // MAPPER_ERROR
```

### ErrorBase — signature

```typescript
export abstract class ErrorBase extends Error {
  abstract code: string;
  constructor(
    message: string,
    cause?: Error,
    metadata?: unknown, // ⚠️ ne jamais y mettre d'info sensible (finit dans les logs)
  );
  toJSON(): SerializedError;
}
```

### ApiErrorResponse — réponse d'erreur HTTP

Forme normalisée d'une réponse d'erreur d'API (couche transport).

```typescript
import { ApiErrorResponse } from "@lec-core/ddd-tools";

const response = new ApiErrorResponse({
  statusCode: 404,
  code: "GENERIC.NOT_FOUND",
  message: "User not found",
  error: "Not Found",
  subErrors: [],
});
```
