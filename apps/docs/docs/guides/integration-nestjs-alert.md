---
sidebar_position: 3
---

# Intégrer Alert Manager dans NestJS

Ce guide explique comment intégrer le package `@lec-packages/alert` dans un projet [NestJS](https://nestjs.com/) pour envoyer des alertes Discord et/ou Email depuis ton application.

## Installation

```bash
yarn add @lec-packages/alert @lec-packages/ddd-tools
```

## Créer le module Alert

### Service

Crée le fichier `src/alert/alert.service.ts` :

```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AlertManager,
  DiscordProvider,
  EmailProvider,
  FailureDetector,
} from "@lec-packages/alert";
import { AlertType, AlertSeverity } from "@lec-packages/alert";

@Injectable()
export class AlertService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    AlertManager.initialize({
      providers: [
        new DiscordProvider({
          webhookUrl: this.config.getOrThrow("DISCORD_WEBHOOK_URL"),
          username: "Mon App Alert",
        }),
        new EmailProvider({
          smtp: {
            host: this.config.getOrThrow("SMTP_HOST"),
            port: this.config.get("SMTP_PORT", 587),
            auth: {
              user: this.config.getOrThrow("SMTP_USER"),
              pass: this.config.getOrThrow("SMTP_PASS"),
            },
          },
          fromEmail: this.config.getOrThrow("ALERT_FROM_EMAIL"),
          toEmail: this.config.getOrThrow("ALERT_TO_EMAIL"),
        }),
      ],
    });
  }

  onModuleDestroy() {
    AlertManager.reset();
  }

  /** Envoyer une alerte */
  async sendAlert(params: {
    type: AlertType;
    severity: AlertSeverity;
    workerName: string;
    message: string;
    context?: Record<string, unknown>;
  }) {
    return AlertManager.getInstance().sendAlert({
      type: params.type,
      severity: params.severity,
      workerName: params.workerName,
      message: params.message,
      timestamp: new Date(),
      context: params.context ?? {},
    });
  }

  /** Tracker un echec de job (declenche une alerte auto si seuil depasse) */
  async trackFailure(jobId: string, workerName: string, error: string) {
    return FailureDetector.getInstance().trackJobFailure(
      jobId,
      workerName,
      error,
    );
  }
}
```

### Module

Crée le fichier `src/alert/alert.module.ts` :

```ts
import { Global, Module } from "@nestjs/common";
import { AlertService } from "./alert.service";

@Global()
@Module({
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
```

Le decorator `@Global()` permet d'injecter `AlertService` dans n'importe quel module sans avoir a importer `AlertModule` a chaque fois.

## Importer le module

Dans `src/app.module.ts` :

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AlertModule } from "./alert/alert.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    AlertModule,
    // ... tes autres modules
  ],
})
export class AppModule {}
```

## Utilisation

Injecte `AlertService` dans n'importe quel service ou controller :

```ts
import { Injectable } from "@nestjs/common";
import { AlertType, AlertSeverity } from "@lec-packages/alert";
import { AlertService } from "../alert/alert.service";

@Injectable()
export class PaymentService {
  constructor(private readonly alert: AlertService) {}

  async processPayment(orderId: string) {
    try {
      // ... logique metier
    } catch (error) {
      await this.alert.sendAlert({
        type: AlertType.JOB_FAILURE,
        severity: AlertSeverity.CRITICAL,
        workerName: "payment-service",
        message: `Echec paiement commande ${orderId}`,
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
  constructor(private readonly alert: AlertService) {}

  async processJob(jobId: string) {
    try {
      // ... traitement du job
    } catch (error) {
      // Track l'echec — alerte auto si seuil depasse
      await this.alert.trackFailure(jobId, "job-processor", error.message);
      throw error;
    }
  }
}
```

### Envoyer vers un provider specifique

Par defaut, `sendAlert` envoie a **tous** les providers configures. Pour cibler un provider :

```ts
await AlertManager.getInstance().sendAlert(
  {
    type: AlertType.SYSTEM_ERROR,
    severity: AlertSeverity.MEDIUM,
    workerName: "mon-service",
    message: "Notification non critique",
    timestamp: new Date(),
    context: {},
  },
  { providers: ["discord"] }, // Uniquement Discord
);
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

Si tu n'as besoin que de Discord, retire le `EmailProvider` du tableau `providers` :

```ts
onModuleInit() {
  AlertManager.initialize({
    providers: [
      new DiscordProvider({
        webhookUrl: this.config.getOrThrow("DISCORD_WEBHOOK_URL"),
        username: "Mon App Alert",
      }),
    ],
  });
}
```

Les variables SMTP ne seront alors pas necessaires.

## Types d'alertes disponibles

| Type | Usage |
|------|-------|
| `AlertType.WORKER_DOWN` | Un worker/service est down |
| `AlertType.REPEATED_FAILURES` | Seuil d'echecs depasse (utilise par `FailureDetector`) |
| `AlertType.RATE_LIMIT` | Rate limit atteint |
| `AlertType.JOB_FAILURE` | Echec d'un job/tache |

## Niveaux de severite

| Severite | Usage |
|----------|-------|
| `AlertSeverity.CRITICAL` | Action immediate requise |
| `AlertSeverity.HIGH` | Reponse necessaire sous quelques heures |
| `AlertSeverity.MEDIUM` | Peut attendre le prochain jour ouvre |
| `AlertSeverity.LOW` | Informatif |