---
sidebar_position: 1
---

# @lec-packages/alert

Système d'alertes multi-providers pour surveiller les applications en production. Supporte Discord et Email avec détection automatique de pannes répétées.

## Installation

```bash
yarn add @lec-packages/alert
```

## Exports

```typescript
import {
  AlertManager,
  FailureDetector,
  DiscordProvider,
  EmailProvider,
  CriticalAlertEmail,
} from "@lec-packages/alert";
```

## Architecture

```
AlertManager (singleton)
├── DiscordProvider  → Webhooks Discord
├── EmailProvider    → SMTP via Nodemailer + React Email
└── ...              → Extensible via l'interface AlertProvider

FailureDetector (singleton)
└── Suit les échecs par worker → déclenche des alertes REPEATED_FAILURES
```

## Dépendances

| Package | Version | Usage |
|---------|---------|-------|
| `nodemailer` | ^7.0.12 | Envoi d'emails SMTP |
| `@react-email/components` | ^1.0.5 | Templates email |
| `@react-email/render` | ^2.0.3 | Rendu HTML des templates |
| `react` | ^19.2.3 | JSX pour les templates |
| `@lec-packages/ddd-tools` | workspace | Classe `ErrorBase` |

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `ALERT_ENABLED` | Active/désactive les alertes | `true` |
| `ADMIN_EMAIL` | Email de l'administrateur | - |
| `SMTP_HOST` | Hôte SMTP | - |
| `SMTP_PORT` | Port SMTP | - |
| `SMTP_USER` | Utilisateur SMTP | - |
| `SMTP_PASS` | Mot de passe SMTP | - |

## Quick Start

```typescript
import { AlertManager, DiscordProvider, EmailProvider } from "@lec-packages/alert";

// Initialiser
AlertManager.initialize();
const manager = AlertManager.getInstance();

// Ajouter des providers
manager.addProvider(new DiscordProvider({
  webhookUrl: "https://discord.com/api/webhooks/...",
  username: "Alert Bot",
}));

manager.addProvider(new EmailProvider({
  host: "smtp.example.com",
  port: 587,
  auth: { user: "alerts@example.com", pass: "..." },
  from: "alerts@example.com",
  to: ["admin@example.com"],
}));

// Envoyer une alerte
await manager.sendAlert({
  type: AlertType.WORKER_DOWN,
  severity: AlertSeverity.CRITICAL,
  workerName: "payment-worker",
  message: "Le worker de paiement ne répond plus",
  timestamp: new Date(),
});
```
