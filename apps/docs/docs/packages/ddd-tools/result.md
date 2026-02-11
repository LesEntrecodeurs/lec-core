---
sidebar_position: 4
---

# Result

Pattern fonctionnel pour la gestion d'erreurs sans exceptions. Inspiré de Rust/Haskell, il force le code appelant à traiter explicitement les cas de succès et d'erreur.

## API

```typescript
class Ok<T, E> {
  readonly value: T;
  isOk(): this is Ok<T, E>;   // true
  isErr(): this is Err<T, E>; // false
  static of<T>(value: T): Ok<T, never>;
}

class Err<T, E> {
  readonly error: E;
  isOk(): this is Ok<T, E>;   // false
  isErr(): this is Err<T, E>; // true
  static of<E>(error: E): Err<never, E>;
}

type Result<T, E> = Ok<T, E> | Err<T, E>;
```

## Utilisation

```typescript
import { Result, Ok, Err } from "@lec-core/ddd-tools";

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Err.of("Division par zéro");
  }
  return Ok.of(a / b);
}

const result = divide(10, 2);

if (result.isOk()) {
  console.log(result.value); // 5
}

if (result.isErr()) {
  console.error(result.error);
}
```

## Utilisation avec les Value Objects

Les factory methods des Value Objects retournent des `Result` :

```typescript
const range = DateRange.create({ from: new Date("2025-01-01"), to: new Date("2024-01-01") });

if (range.isErr()) {
  // range.error est une InvalidDateRangeError
  console.error(range.error.message);
}
```
