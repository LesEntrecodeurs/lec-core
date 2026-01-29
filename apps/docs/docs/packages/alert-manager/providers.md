---
sidebar_position: 4
---

# Providers

Les providers sont les canaux de diffusion des alertes. Chaque provider implémente l'interface `AlertProvider`.

## Interface AlertProvider

```typescript
interface AlertProvider {
  readonly name: string;
  send(alert: Alert): Promise<void>;
  sendBatch(alerts: Alert[]): Promise<void>;
  verify(): Promise<void>;
  close(): Promise<void>;
}
```

## DiscordProvider

Envoie les alertes via un webhook Discord avec des embeds colorés selon la sévérité.

### Configuration

```typescript
interface DiscordProviderConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}
```

### Utilisation

```typescript
import { DiscordProvider } from "@lec-packages/alert";

const discord = new DiscordProvider({
  webhookUrl: "https://discord.com/api/webhooks/xxx/yyy",
  username: "LEC Alerts",
});

// Vérifier la connexion
await discord.verify();

// Envoyer une alerte
await discord.send(alert);
```

### Comportement

- Embed coloré selon la sévérité (rouge = CRITICAL, orange = HIGH, jaune = MEDIUM, bleu = LOW)
- Retry automatique avec backoff exponentiel en cas d'erreur réseau
- Les alertes batch sont envoyées dans un seul message avec plusieurs embeds

## EmailProvider

Envoie les alertes par email via SMTP en utilisant des templates React Email.

### Configuration

```typescript
interface EmailProviderConfig {
  host: string;
  port: number;
  auth: { user: string; pass: string };
  from: string;
  to: string[];
}
```

### Utilisation

```typescript
import { EmailProvider } from "@lec-packages/alert";

const email = new EmailProvider({
  host: "smtp.example.com",
  port: 587,
  auth: { user: "alerts@example.com", pass: "secret" },
  from: "alerts@example.com",
  to: ["admin@example.com", "ops@example.com"],
});

await email.verify(); // Test connexion SMTP
await email.send(alert);
```

### Template CriticalAlertEmail

Template React Email utilisé pour le rendu HTML des emails d'alerte.

```typescript
interface CriticalAlertEmailProps {
  alerts: Alert[];
  alertType: AlertType;
  severity: AlertSeverity;
  bullBoardUrl?: string;
}
```

Le template inclut :
- Icônes et couleurs selon la sévérité
- Liste détaillée des alertes avec contexte
- Bouton CTA vers le dashboard Bull Board (si configuré)

## Créer un provider custom

```typescript
import type { AlertProvider, Alert } from "@lec-packages/alert";

class SlackProvider implements AlertProvider {
  readonly name = "slack";

  async send(alert: Alert): Promise<void> {
    // Implémentation Slack...
  }

  async sendBatch(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      await this.send(alert);
    }
  }

  async verify(): Promise<void> {
    // Vérifier le webhook Slack...
  }

  async close(): Promise<void> {
    // Nettoyage...
  }
}
```
