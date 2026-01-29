---
sidebar_position: 5
---

# Command

Classe de base pour le pattern CQRS (Command Query Responsibility Segregation). Chaque commande porte un identifiant unique et des métadonnées sur son exécution.

## API

```typescript
type CommandExecutor = "system" | "anonymous" | "user";

interface CommandMetadata {
  executor: CommandExecutor;
  timestamp: Date;
  userId?: string;
}

type CommandProps<T> = T & {
  metadata: CommandMetadata;
};

class Command {
  readonly id: string;      // UUID auto-généré
  readonly metadata: CommandMetadata;
}
```

## Utilisation

```typescript
import { Command, type CommandProps } from "@lec/ddd-tools";

interface CreateUserPayload {
  email: string;
  name: string;
}

class CreateUserCommand extends Command {
  readonly email: string;
  readonly name: string;

  constructor(props: CommandProps<CreateUserPayload>) {
    super(props);
    this.email = props.email;
    this.name = props.name;
  }
}

// Créer une commande
const command = new CreateUserCommand({
  email: "alice@example.com",
  name: "Alice",
  metadata: {
    executor: "user",
    timestamp: new Date(),
    userId: "user-123",
  },
});

console.log(command.id);                 // UUID auto-généré
console.log(command.metadata.executor);  // "user"
```

## Métadonnées

| Champ | Type | Description |
|-------|------|-------------|
| `executor` | `"system" \| "anonymous" \| "user"` | Qui déclenche la commande |
| `timestamp` | `Date` | Quand la commande a été créée |
| `userId` | `string?` | Identifiant de l'utilisateur (si `executor === "user"`) |
