---
sidebar_position: 2
---

# AlertManager

Singleton central qui orchestre l'envoi d'alertes vers un ou plusieurs providers.

## API

```typescript
class AlertManager {
  static initialize(): void;
  static getInstance(): AlertManager;

  addProvider(provider: AlertProvider): void;
  removeProvider(name: string): void;

  sendAlert(alert: Alert): Promise<void>;
  sendAlerts(alerts: Alert[]): Promise<void>;
  verifyProviders(): Promise<void>;

  close(): Promise<void>;
}
```

## Méthodes

### `initialize()`

Initialise l'instance singleton. Doit être appelé une seule fois au démarrage de l'application.

### `getInstance()`

Retourne l'instance singleton. Lance une erreur si `initialize()` n'a pas été appelé.

### `addProvider(provider)`

Enregistre un nouveau provider d'alertes. Chaque provider doit implémenter l'interface `AlertProvider`.

### `removeProvider(name)`

Retire un provider par son nom.

### `sendAlert(alert)`

Envoie une alerte à tous les providers enregistrés.

### `sendAlerts(alerts)`

Envoie un batch d'alertes à tous les providers.

### `verifyProviders()`

Vérifie la connectivité de tous les providers (test SMTP, webhook Discord, etc.).

### `close()`

Ferme proprement tous les providers (connexions SMTP, etc.).

## Configuration

| Constante | Valeur | Description |
|-----------|--------|-------------|
| `ALERT_THRESHOLDS.failuresInWindow` | `5` | Nombre d'échecs avant alerte |
| `ALERT_THRESHOLDS.timeWindowMinutes` | `10` | Fenêtre temporelle en minutes |
| `ALERT_DEBOUNCE_WINDOW` | `5 min` | Délai minimum entre deux alertes identiques |
