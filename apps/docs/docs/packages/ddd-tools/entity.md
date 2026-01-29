---
sidebar_position: 2
---

# Entity

Classe abstraite de base pour les entités du domaine. Une entité est identifiée par son `id` et non par ses attributs.

## API

```typescript
abstract class Entity<T, U extends string | number = string> {
  readonly id: U;
  protected readonly props: T;

  equals(entity?: Entity<T, U>): boolean;
}
```

## Paramètres génériques

| Paramètre | Description |
|-----------|-------------|
| `T` | Type des propriétés de l'entité |
| `U` | Type de l'identifiant (`string` ou `number`, défaut : `string`) |

## Utilisation

```typescript
import { Entity } from "@lec-packages/ddd-tools";

interface UserProps {
  email: string;
  name: string;
  createdAt: Date;
}

class User extends Entity<UserProps> {
  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  static create(props: UserProps & { id: string }): User {
    return new User(props);
  }
}
```

## Comparaison d'entités

La méthode `equals` compare uniquement les identifiants :

```typescript
const user1 = User.create({ id: "abc", email: "a@b.com", name: "Alice", createdAt: new Date() });
const user2 = User.create({ id: "abc", email: "changed@b.com", name: "Alice Updated", createdAt: new Date() });

user1.equals(user2); // true — même id
```
