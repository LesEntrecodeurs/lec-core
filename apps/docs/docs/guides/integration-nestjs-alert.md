---
sidebar_position: 3
---

# Integrer Alert Manager dans NestJS

Ce guide explique comment integrer le package `@lec-core/alert-manager` dans un projet [NestJS](https://nestjs.com/) pour envoyer des alertes Discord et/ou Email depuis ton application.

## Installation

```bash
yarn add @lec-core/alert-manager @lec-core/ddd-tools
```

## Configuration avec `forRoot()`

Le package fournit un module NestJS pret a l'emploi avec le pattern `forRoot()` / `forRootAsync()`.

### Configuration statique

Dans `src/app.module.ts` :

```ts
import { Module } from "@nestjs/common";
import { AlertManagerModule, DiscordProvider } from "@lec-core/alert-manager";

@Module({
  imports: [
    AlertManagerModule.forRoot({
      providers: [
        new DiscordProvider({
          webhookUrl: "https://discord.com/api/webhooks/xxx/yyy",
          username: "Mon App Alert",
        }),
      ],
    }),
  ],
})
export class AppModule {}
```

### Configuration asynchrone (recommande)

Utilise `forRootAsync()` pour injecter `ConfigService` et lire les variables d'environnement :

```ts
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  AlertManagerModule,
  DiscordProvider,
  EmailProvider,
} from "@lec-core/alert-manager";

@Module({
  imports: [
    ConfigModule.forRoot(),
    AlertManagerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        providers: [
          new DiscordProvider({
            webhookUrl: config.getOrThrow("DISCORD_WEBHOOK_URL"),
            username: "Mon App Alert",
          }),
          new EmailProvider({
            smtp: {
              host: config.getOrThrow("SMTP_HOST"),
              port: config.get("SMTP_PORT", 587),
              secure: false,
              auth: {
                user: config.getOrThrow("SMTP_USER"),
                pass: config.getOrThrow("SMTP_PASS"),
              },
            },
            fromEmail: config.getOrThrow("ALERT_FROM_EMAIL"),
            toEmail: config.getOrThrow("ALERT_TO_EMAIL"),
          }),
        ],
      }),
    }),
  ],
})
export class AppModule {}
```

Le module est declare `@Global()`, donc `AlertManagerService` est injectable partout sans avoir a reimporter le module.

## Utilisation

Injecte `AlertManagerService` dans n'importe quel service ou controller :

```ts
import { Injectable } from "@nestjs/common";
import {
  AlertManagerService,
  AlertType,
  AlertSeverity,
} from "@lec-core/alert-manager";

@Injectable()
export class PaymentService {
  constructor(private readonly alertManager: AlertManagerService) {}

  async processPayment(orderId: string) {
    try {
      // ... logique metier
    } catch (error) {
      await this.alertManager.sendAlert({
        type: AlertType.JOB_FAILURE,
        severity: AlertSeverity.CRITICAL,
        workerName: "payment-service",
        message: `Echec paiement commande ${orderId}`,
        timestamp: new Date(),
        context: { orderId, error: error.message },
      });

      throw error;
    }
  }
}
```

### Tracker les echecs automatiquement

Le `FailureDetector` compte les echecs par worker et declenche une alerte `REPEATED_FAILURES` quand le seuil est depasse (par defaut : 5 echecs en 10 minutes).

```ts
@Injectable()
export class JobProcessor {
  constructor(private readonly alertManager: AlertManagerService) {}

  async processJob(jobId: string) {
    try {
      // ... traitement du job
    } catch (error) {
      // Track l'echec — alerte auto si seuil depasse
      await this.alertManager.trackFailure(
        jobId,
        "job-processor",
        error.message,
      );
      throw error;
    }
  }
}
```

### Envoyer vers un provider specifique

Par defaut, `sendAlert` envoie a **tous** les providers configures. Pour cibler un provider :

```ts
await this.alertManager.sendAlert(
  {
    type: AlertType.JOB_FAILURE,
    severity: AlertSeverity.MEDIUM,
    workerName: "mon-service",
    message: "Notification non critique",
    timestamp: new Date(),
    context: {},
  },
  { providers: ["discord"] }, // Uniquement Discord
);
```

### Acces direct aux singletons

Si tu as besoin d'acceder directement a `AlertManager` ou `FailureDetector` :

```ts
const alertManager = this.alertManager.getInstance();
const failureDetector = this.alertManager.getFailureDetector();
```

## Variables d'environnement

```env
# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@tondomaine.com
SMTP_PASS=xxx
ALERT_FROM_EMAIL=alerts@tondomaine.com
ALERT_TO_EMAIL=admin@tondomaine.com

# Optionnel
ALERT_ENABLED=true
```

## Discord uniquement

Si tu n'as besoin que de Discord :

```ts
AlertManagerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    providers: [
      new DiscordProvider({
        webhookUrl: config.getOrThrow("DISCORD_WEBHOOK_URL"),
        username: "Mon App Alert",
      }),
    ],
  }),
});
```

Les variables SMTP ne seront alors pas necessaires.

## Types d'alertes disponibles

| Type                           | Usage                                                         |
| ------------------------------ | ------------------------------------------------------------- |
| `AlertType.WORKER_DOWN`        | Un worker/service est down                                    |
| `AlertType.REPEATED_FAILURES`  | Seuil d'echecs depasse (utilise par `FailureDetector`)        |
| `AlertType.RATE_LIMIT`         | Rate limit atteint                                            |
| `AlertType.JOB_FAILURE`        | Echec d'un job/tache                                          |

## Niveaux de severite

| Severite                   | Usage                                        |
| -------------------------- | -------------------------------------------- |
| `AlertSeverity.CRITICAL`  | Action immediate requise                     |
| `AlertSeverity.HIGH`      | Reponse necessaire sous quelques heures      |
| `AlertSeverity.MEDIUM`    | Peut attendre le prochain jour ouvre          |
| `AlertSeverity.LOW`       | Informatif                                   |
