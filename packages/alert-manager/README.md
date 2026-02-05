# @lec-packages/alert

Systeme d'alertes multi-providers pour surveiller les applications en production. Supporte Discord et Email (SMTP via Nodemailer + React Email) avec detection automatique de pannes repetees.

## Installation

```bash
yarn add @lec-packages/alert
```

## Quick Start

```typescript
import {
  AlertManager,
  DiscordProvider,
  EmailProvider,
  AlertType,
  AlertSeverity,
} from "@lec-packages/alert";

// Initialiser
AlertManager.initialize();
const manager = AlertManager.getInstance();

// Ajouter des providers
manager.addProvider(
  new DiscordProvider({
    webhookUrl: "https://discord.com/api/webhooks/...",
    username: "Alert Bot",
  })
);

manager.addProvider(
  new EmailProvider({
    host: "smtp.example.com",
    port: 587,
    auth: { user: "alerts@example.com", pass: "..." },
    from: "alerts@example.com",
    to: ["admin@example.com"],
  })
);

// Envoyer une alerte
await manager.sendAlert({
  type: AlertType.WORKER_DOWN,
  severity: AlertSeverity.CRITICAL,
  workerName: "payment-worker",
  message: "Le worker de paiement ne repond plus",
  timestamp: new Date(),
  context: {},
});
```

## Architecture

```
AlertManager (singleton)
├── DiscordProvider  → Webhooks Discord
├── EmailProvider    → SMTP via Nodemailer + React Email
└── ...              → Extensible via l'interface AlertProvider

FailureDetector (singleton)
└── Suit les echecs par worker → declenche des alertes REPEATED_FAILURES
```

## Exports

```typescript
// Core
export { AlertManager } from "./alert-manager";
export { FailureDetector } from "./failure-detector";

// Providers
export { DiscordProvider, type DiscordProviderConfig } from "./providers/discord-provider";
export { EmailProvider, type EmailProviderConfig } from "./providers/email-provider";

// Templates
export { CriticalAlertEmail, type CriticalAlertEmailProps } from "./templates/critical-alert-email";

// Types (depuis ./types/index.ts)
export { AlertType, AlertSeverity, AlertSchema, AlertError, type Alert, type AlertProvider, type AlertSendResult };
```

## Alert Types

| Type | Severite | Description |
|------|----------|-------------|
| `WORKER_DOWN` | CRITICAL | Un worker ne repond plus |
| `REPEATED_FAILURES` | HIGH | Echecs repetes detectes par le `FailureDetector` |
| `RATE_LIMIT` | HIGH | Limite de taux depassee |
| `JOB_FAILURE` | CRITICAL | Un job a echoue apres tous ses retries |

## Alert Severity

| Niveau | Description |
|--------|-------------|
| `CRITICAL` | Action immediate requise |
| `HIGH` | Reponse necessaire dans les heures |
| `MEDIUM` | Peut attendre le prochain jour ouvre |
| `LOW` | Informationnel |

## Providers

### DiscordProvider

Envoie les alertes via webhook Discord avec des embeds colores selon la severite.

```typescript
const discord = new DiscordProvider({
  webhookUrl: "https://discord.com/api/webhooks/xxx/yyy",
  username: "LEC Alerts",    // optionnel
  avatarUrl: "https://...",  // optionnel
});
```

### EmailProvider

Envoie les alertes par email via SMTP avec des templates React Email.

```typescript
const email = new EmailProvider({
  host: "smtp.example.com",
  port: 587,
  auth: { user: "alerts@example.com", pass: "secret" },
  from: "alerts@example.com",
  to: ["admin@example.com"],
});
```

### Creer un provider custom

```typescript
import type { AlertProvider, Alert, AlertSendResult, AlertError } from "@lec-packages/alert";
import type { Result } from "@lec-packages/ddd-tools";

class SlackProvider implements AlertProvider {
  readonly name = "slack";

  async send(alert: Alert): Promise<Result<AlertSendResult, AlertError>> {
    // implementation...
  }

  async sendBatch(alerts: Alert[]): Promise<Result<AlertSendResult, AlertError>> {
    // implementation...
  }

  async verify(): Promise<boolean> {
    // verification...
  }

  close(): void {
    // cleanup...
  }
}
```

## FailureDetector

Detecte automatiquement les pannes repetees et declenche des alertes `REPEATED_FAILURES` quand le seuil est atteint.

```typescript
import { FailureDetector } from "@lec-packages/alert";

const detector = FailureDetector.getInstance();

// Tracker un echec
await detector.trackJobFailure("job-123", "digest-worker", "API timeout");

// Alerte REPEATED_FAILURES declenchee automatiquement si :
// - 5 echecs en 10 minutes (configurable via ALERT_THRESHOLDS)
```

## Variables d'environnement

| Variable | Description | Defaut |
|----------|-------------|--------|
| `ALERT_ENABLED` | Active/desactive les alertes | `true` |
| `ADMIN_EMAIL` | Email de l'administrateur | - |
| `SMTP_HOST` | Hote SMTP | - |
| `SMTP_PORT` | Port SMTP | - |
| `SMTP_USER` | Utilisateur SMTP | - |
| `SMTP_PASS` | Mot de passe SMTP | - |

## Dependencies

| Package | Version | Usage |
|---------|---------|-------|
| `@lec-packages/ddd-tools` | ^1.0.1 | `ErrorBase`, `Result` |
| `nodemailer` | ^7.0.12 | Envoi d'emails SMTP |
| `@react-email/components` | ^1.0.5 | Templates email |
| `@react-email/render` | ^2.0.3 | Rendu HTML des templates |
| `react` | ^19.2.3 | JSX pour les templates |

## License

MIT
