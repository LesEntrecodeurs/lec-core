---
sidebar_position: 6
---

# RepositoryPort

Port abstrait (interface) pour les repositories du domaine. Définit le contrat que toute implémentation de persistance doit respecter.

## API

```typescript
abstract class RepositoryPort<E extends Entity<unknown>> {
  abstract save(entity: E): Promise<void>;
  abstract findById(id: string): Promise<E | null>;
  abstract findAll(): Promise<E[]>;
  abstract delete(entity: E): Promise<void>;
}
```

## Utilisation

```typescript
import { RepositoryPort, Entity } from "@lec-packages/ddd-tools";

interface UserProps {
  email: string;
  name: string;
}

class User extends Entity<UserProps> {}

// Définir le port
abstract class UserRepository extends RepositoryPort<User> {
  abstract findByEmail(email: string): Promise<User | null>;
}

// Implémenter avec une base de données
class PrismaUserRepository extends UserRepository {
  async save(user: User): Promise<void> {
    // implémentation Prisma...
  }

  async findById(id: string): Promise<User | null> {
    // implémentation Prisma...
  }

  async findAll(): Promise<User[]> {
    // implémentation Prisma...
  }

  async delete(user: User): Promise<void> {
    // implémentation Prisma...
  }

  async findByEmail(email: string): Promise<User | null> {
    // implémentation Prisma...
  }
}
```

## Principe

Le `RepositoryPort` suit le **Dependency Inversion Principle** : le domaine définit l'interface, l'infrastructure l'implémente. Cela permet de changer de base de données sans toucher au code métier.
