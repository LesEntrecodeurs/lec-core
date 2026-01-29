---
sidebar_position: 5
---

# Types

Types et enums exportés par `@lec-packages/alert`.

## AlertType

```typescript
enum AlertType {
  WORKER_DOWN,
  REPEATED_FAILURES,
  RATE_LIMIT,
  JOB_FAILURE,
}
```

| Valeur | Description |
|--------|-------------|
| `WORKER_DOWN` | Un worker ne répond plus |
| `REPEATED_FAILURES` | Échecs répétés détectés par le `FailureDetector` |
| `RATE_LIMIT` | Limite de taux dépassée |
| `JOB_FAILURE` | Un job individuel a échoué |

## AlertSeverity

```typescript
enum AlertSeverity {
  CRITICAL,
  HIGH,
  MEDIUM,
  LOW,
}
```

| Valeur | Couleur Discord | Usage |
|--------|----------------|-------|
| `CRITICAL` | Rouge | Worker down, perte de données |
| `HIGH` | Orange | Échecs répétés, dégradation de service |
| `MEDIUM` | Jaune | Rate limit, avertissements |
| `LOW` | Bleu | Informationnel |

## Alert

```typescript
interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  workerName: string;
  timestamp: Date;
  message: string;
  context?: Record<string, unknown>;
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `type` | `AlertType` | Type d'alerte |
| `severity` | `AlertSeverity` | Niveau de sévérité |
| `workerName` | `string` | Nom du worker concerné |
| `timestamp` | `Date` | Date de l'événement |
| `message` | `string` | Message descriptif |
| `context` | `Record<string, unknown>?` | Données additionnelles (stack trace, job id, etc.) |

## AlertError

```typescript
class AlertError extends ErrorBase {
  readonly code = "ALERT_ERROR";
}
```

Erreur lancée lorsqu'un provider échoue à envoyer une alerte.
