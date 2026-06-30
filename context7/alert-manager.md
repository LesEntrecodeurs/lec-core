# @lec-core/alert-manager

Système d'alertes multi-providers pour surveiller des applications en production. Envoie des alertes vers **Discord** (webhooks) et **Email** (SMTP via Nodemailer + templates React Email), avec retry automatique, dé-duplication (debounce) et détection de pannes répétées. Intégration **NestJS** fournie.

- **npm** : `@lec-core/alert-manager` *(et non `@lec-core/alert` : ancien nom hérité de certains README)*
- **Dépendances** : `@lec-core/ddd-tools`, `nodemailer`, `@react-email/components`, `@react-email/render`, `react`, `zod`
- **Peer dependency optionnelle** : `@nestjs/common` (>=10) pour le module NestJS

## Installation

```bash
yarn add @lec-core/alert-manager
# ou
npm install @lec-core/alert-manager
```

## Imports

```typescript
import {
  AlertManager,
  type MultiProviderResult,
  FailureDetector,
  DiscordProvider,
  type DiscordProviderConfig,
  EmailProvider,
  type EmailProviderConfig,
  CriticalAlertEmail,
  // Types & enums
  type Alert,
  AlertType,
  AlertSeverity,
  AlertSchema,
  AlertError,
  type AlertProvider,
  type AlertSendResult,
  ALERT_THRESHOLDS,
  ALERT_DEBOUNCE_WINDOW,
  ALERT_ENABLED,
  // NestJS
  AlertManagerModule,
  AlertManagerService,
  type AlertManagerModuleAsyncOptions,
} from "@lec-core/alert-manager";
```

## Quick Start

`AlertManager` est un **singleton** : on l'initialise une seule fois avec au moins un provider, puis on récupère l'instance partout via `getInstance()`. L'envoi renvoie un `Result` (jamais d'exception).

```typescript
import {
  AlertManager,
  DiscordProvider,
  EmailProvider,
  AlertType,
  AlertSeverity,
} from "@lec-core/alert-manager";

// 1. Initialisation au démarrage de l'app (au moins un provider requis)
AlertManager.initialize({
  providers: [
    new DiscordProvider({
      webhookUrl: "https://discord.com/api/webhooks/xxx/yyy",
      username: "LEC Alerts",
    }),
    new EmailProvider({
      smtp: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: { user: "alerts@example.com", pass: "secret" },
      },
      fromEmail: "alerts@example.com",
      toEmail: "admin@example.com",
    }),
  ],
  thresholds: { failuresInWindow: 5, timeWindowMinutes: 10 },
});

// 2. Envoi d'une alerte (vers tous les providers)
const result = await AlertManager.getInstance().sendAlert({
  type: AlertType.WORKER_DOWN,
  severity: AlertSeverity.CRITICAL,
  workerName: "payment-worker",
  message: "Le worker de paiement ne répond plus",
  timestamp: new Date(),
  context: { lastSeen: "2026-06-30T10:00:00Z" },
});

if (result.isOk()) {
  console.log("Envoyé via :", result.value.successful);
} else {
  console.error("Échec total :", result.error.message);
}
```

## L'objet Alert

Toute alerte respecte `AlertSchema` (Zod). **Tous les champs sont requis**, y compris `context` (un `Record<string, unknown>`, utiliser `{}` si vide).

```typescript
import { type Alert, AlertType, AlertSeverity } from "@lec-core/alert-manager";

const alert: Alert = {
  type: AlertType.JOB_FAILURE,
  severity: AlertSeverity.CRITICAL,
  workerName: "digest-worker",
  timestamp: new Date(),
  context: { jobId: "job-123", attempts: 3 }, // requis (peut être {})
  message: "Le job a échoué après 3 tentatives",
};
```

### AlertType & AlertSeverity

```typescript
export enum AlertType {
  WORKER_DOWN = "WORKER_DOWN",            // un worker ne répond plus
  REPEATED_FAILURES = "REPEATED_FAILURES",// échecs répétés (FailureDetector)
  RATE_LIMIT = "RATE_LIMIT",              // limite de taux dépassée
  JOB_FAILURE = "JOB_FAILURE",            // job échoué après tous ses retries
}

export enum AlertSeverity {
  CRITICAL = "CRITICAL", // action immédiate requise
  HIGH = "HIGH",         // réponse nécessaire dans les heures
  MEDIUM = "MEDIUM",     // peut attendre le prochain jour ouvré
  LOW = "LOW",           // informationnel
}
```

## AlertManager — API

Le singleton dispatch les alertes vers tous les providers (ou un sous-ensemble) **en parallèle**. `sendAlert` ne renvoie une `Err` que si **tous** les providers échouent.

```typescript
class AlertManager {
  // Cycle de vie (statique)
  static initialize(config: AlertManagerConfig): AlertManager; // 1 seul provider min.
  static getInstance(): AlertManager; // throw si non initialisé
  static isInitialized(): boolean;
  static reset(): void; // ferme les providers et détruit l'instance

  // Providers (runtime)
  addProvider(provider: AlertProvider): void;
  removeProvider(name: string): boolean;
  getProvider(name: string): AlertProvider | undefined;
  get providerNames(): string[];

  // Envoi
  sendAlert(alert: Alert, options?: { providers?: string[] }): Promise<Result<MultiProviderResult, AlertError>>;
  sendAlerts(alerts: Alert[], options?: { providers?: string[] }): Promise<Result<MultiProviderResult, AlertError>>;
  verifyProviders(): Promise<Map<string, boolean>>;
  close(): void;

  // Config
  get thresholds(): { failuresInWindow: number; timeWindowMinutes: number };
  get debounceWindow(): number;
}
```

### Configuration (AlertManagerConfig)

```typescript
export interface AlertManagerConfig {
  providers: AlertProvider[]; // requis, au moins un
  thresholds?: {
    failuresInWindow?: number; // défaut 5
    timeWindowMinutes?: number; // défaut 10
  };
  debounceWindowMs?: number; // défaut 5 * 60 * 1000 (5 min)
}
```

### Cibler des providers spécifiques

Passer `options.providers` (par nom) pour n'envoyer qu'à certains providers.

```typescript
// N'envoie qu'à Discord, pas à l'email
await AlertManager.getInstance().sendAlert(alert, { providers: ["discord"] });
```

### Vérifier la connectivité des providers

```typescript
const status = await AlertManager.getInstance().verifyProviders();
// Map { "discord" => true, "email" => false }
```

### Le résultat MultiProviderResult

`sendAlert`/`sendAlerts` renvoient le détail par provider.

```typescript
export interface MultiProviderResult {
  successful: AlertSendResult[]; // { id, timestamp, provider }
  failed: Array<{ provider: string; error: AlertError }>;
}
```

## DiscordProvider

Envoie les alertes via webhook Discord sous forme d'**embeds** colorés selon la sévérité (rouge/orange/jaune/vert), avec retry sur erreur 429 (rate limit).

```typescript
import { DiscordProvider } from "@lec-core/alert-manager";

const discord = new DiscordProvider({
  webhookUrl: "https://discord.com/api/webhooks/xxx/yyy",
  username: "LEC Alerts", // optionnel
  avatarUrl: "https://...", // optionnel
  retry: { maxAttempts: 3, delays: [1000, 2000, 4000] }, // optionnel
});
```

### DiscordProviderConfig

```typescript
export interface DiscordProviderConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
  retry?: { maxAttempts?: number; delays?: number[] };
}
```

## EmailProvider

Envoie les alertes par email via SMTP (Nodemailer) avec un template React Email (`CriticalAlertEmail`). Retry automatique sur erreurs transitoires (timeout, réseau, 429/503).

```typescript
import { EmailProvider } from "@lec-core/alert-manager";

const email = new EmailProvider({
  smtp: {
    host: "smtp.example.com",
    port: 587,
    secure: false, // true pour le port 465
    auth: { user: "alerts@example.com", pass: "secret" },
  },
  fromEmail: "alerts@example.com",
  toEmail: "admin@example.com",
  retry: { maxAttempts: 3, delays: [1000, 2000, 4000] }, // optionnel
});
```

### EmailProviderConfig

`smtp` est un `NodemailerConfig`. ⚠️ Ne pas confondre avec l'ancienne forme à plat `{ host, port, auth, from, to }`.

```typescript
export interface EmailProviderConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth?: { user: string; pass: string };
  };
  fromEmail: string;
  toEmail: string;
  retry?: { maxAttempts?: number; delays?: number[] };
}
```

## Provider personnalisé

N'importe quel objet implémentant l'interface `AlertProvider` peut être branché (Slack, SMS, etc.). Les méthodes d'envoi renvoient un `Result` du package `@lec-core/ddd-tools`.

```typescript
import {
  type AlertProvider,
  type Alert,
  type AlertSendResult,
  AlertError,
} from "@lec-core/alert-manager";
import { Ok, Err, type Result } from "@lec-core/ddd-tools";

class SlackProvider implements AlertProvider {
  readonly name = "slack";

  async send(alert: Alert): Promise<Result<AlertSendResult, AlertError>> {
    // ... POST vers l'API Slack
    return Ok.of({ id: "slack-1", timestamp: new Date(), provider: this.name });
  }

  async sendBatch(alerts: Alert[]): Promise<Result<AlertSendResult, AlertError>> {
    return this.send(alerts[0]);
  }

  async verify(): Promise<boolean> {
    return true;
  }

  close(): void {}
}

AlertManager.getInstance().addProvider(new SlackProvider());
```

### Interface AlertProvider

```typescript
export interface AlertProvider {
  readonly name: string; // identifiant unique du provider
  send(alert: Alert): Promise<Result<AlertSendResult, AlertError>>;
  sendBatch(alerts: Alert[]): Promise<Result<AlertSendResult, AlertError>>;
  verify(): Promise<boolean>;
  close(): void;
}
```

## FailureDetector

Singleton qui compte les échecs **par worker** dans une fenêtre glissante et déclenche automatiquement une alerte `REPEATED_FAILURES` (sévérité `HIGH`) quand le seuil est atteint (par défaut : 5 échecs en 10 minutes via `ALERT_THRESHOLDS`). Le compteur est remis à zéro après l'alerte pour éviter le spam.

```typescript
import { FailureDetector } from "@lec-core/alert-manager";

const detector = FailureDetector.getInstance();

// Tracker un échec — déclenche une alerte si le seuil est franchi
await detector.trackJobFailure("job-123", "digest-worker", "API timeout");

detector.getFailureCount("digest-worker"); // nb d'échecs dans la fenêtre
detector.resetFailureHistory("digest-worker"); // reset un worker
detector.clearAll(); // reset tout (utile en test)
```

> `FailureDetector` appelle `AlertManager.getInstance()` : le singleton `AlertManager` doit avoir été initialisé au préalable.

### Seuils et constantes

```typescript
import { ALERT_THRESHOLDS, ALERT_DEBOUNCE_WINDOW } from "@lec-core/alert-manager";

ALERT_THRESHOLDS.failuresInWindow; // 5
ALERT_THRESHOLDS.timeWindowMinutes; // 10
ALERT_DEBOUNCE_WINDOW; // 300000 (5 min en ms)
```

## Intégration NestJS

Le module `AlertManagerModule` est `@Global()` : il initialise le singleton au démarrage (`onModuleInit`) et le nettoie à l'arrêt (`onModuleDestroy`). Injecter ensuite `AlertManagerService` partout.

### forRoot — configuration statique

```typescript
import { Module } from "@nestjs/common";
import { AlertManagerModule, DiscordProvider } from "@lec-core/alert-manager";

@Module({
  imports: [
    AlertManagerModule.forRoot({
      providers: [
        new DiscordProvider({ webhookUrl: process.env.DISCORD_WEBHOOK! }),
      ],
    }),
  ],
})
export class AppModule {}
```

### forRootAsync — configuration via ConfigService

```typescript
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  AlertManagerModule,
  DiscordProvider,
  EmailProvider,
} from "@lec-core/alert-manager";

AlertManagerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    providers: [
      new DiscordProvider({ webhookUrl: config.get("DISCORD_WEBHOOK")! }),
      new EmailProvider({
        smtp: {
          host: config.get("SMTP_HOST")!,
          port: Number(config.get("SMTP_PORT")),
          secure: false,
          auth: {
            user: config.get("SMTP_USER")!,
            pass: config.get("SMTP_PASS")!,
          },
        },
        fromEmail: config.get("ALERT_FROM")!,
        toEmail: config.get("ADMIN_EMAIL")!,
      }),
    ],
  }),
});
```

### AlertManagerService

Service injectable qui encapsule le singleton et le `FailureDetector`.

```typescript
import { Injectable } from "@nestjs/common";
import {
  AlertManagerService,
  AlertType,
  AlertSeverity,
} from "@lec-core/alert-manager";

@Injectable()
export class PaymentService {
  constructor(private readonly alerts: AlertManagerService) {}

  async onWorkerDown() {
    await this.alerts.sendAlert({
      type: AlertType.WORKER_DOWN,
      severity: AlertSeverity.CRITICAL,
      workerName: "payment-worker",
      timestamp: new Date(),
      context: {},
      message: "Payment worker is down",
    });

    // Suivi des échecs répétés
    await this.alerts.trackFailure("job-1", "payment-worker", "timeout");
  }
}
```

### Méthodes de AlertManagerService

```typescript
class AlertManagerService {
  sendAlert(alert: Alert, options?: { providers?: string[] }): Promise<Result<MultiProviderResult, AlertError>>;
  sendAlerts(alerts: Alert[], options?: { providers?: string[] }): Promise<Result<MultiProviderResult, AlertError>>;
  trackFailure(jobId: string, workerName: string, error: string): Promise<void>;
  getInstance(): AlertManager;
  getFailureDetector(): FailureDetector;
}
```

## Template email — CriticalAlertEmail

Composant React Email utilisé par `EmailProvider`, réutilisable seul pour prévisualiser/rendre le HTML d'alerte (couleurs selon sévérité, regroupement d'alertes, bouton CTA).

```typescript
import { CriticalAlertEmail } from "@lec-core/alert-manager";
import { render } from "@react-email/render";

const html = await render(
  CriticalAlertEmail({
    alerts: [alert],
    alertType: alert.type,
    severity: alert.severity,
    bullBoardUrl: "https://dashboard.example.com",
  }),
);
```

## Variables d'environnement

`NodemailerClient` lit ces variables en l'absence de config SMTP explicite ; `ALERT_ENABLED` / `ADMIN_EMAIL` pilotent le comportement global.

| Variable | Description | Défaut |
|----------|-------------|--------|
| `ALERT_ENABLED` | Active/désactive les alertes (`ALERT_ENABLED`) | `true` |
| `ADMIN_EMAIL` | Email administrateur (`ADMIN_EMAIL`) | - |
| `SMTP_HOST` | Hôte SMTP | `localhost` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_SECURE` | TLS (`"true"` pour le port 465) | `false` |
| `SMTP_USER` | Utilisateur SMTP | - |
| `SMTP_PASS` | Mot de passe SMTP | - |
