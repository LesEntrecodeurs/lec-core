---
sidebar_position: 3
---

# FailureDetector

Singleton qui suit les échecs de jobs par worker et déclenche des alertes `REPEATED_FAILURES` lorsqu'un seuil est dépassé.

## API

```typescript
class FailureDetector {
  static getInstance(): FailureDetector;

  trackJobFailure(workerName: string, error: Error): void;
  getFailureCount(workerName: string): number;
  resetFailureHistory(workerName: string): void;
  clearAll(): void;
}
```

## Méthodes

### `trackJobFailure(workerName, error)`

Enregistre un échec pour un worker donné. Si le nombre d'échecs dans la fenêtre temporelle dépasse le seuil configuré, une alerte `REPEATED_FAILURES` est envoyée via l'`AlertManager`.

### `getFailureCount(workerName)`

Retourne le nombre d'échecs récents pour un worker.

### `resetFailureHistory(workerName)`

Remet à zéro l'historique d'échecs d'un worker spécifique.

### `clearAll()`

Remet à zéro l'historique de tous les workers.

## Fonctionnement

```
Job échoue → trackJobFailure("payment-worker", error)
                    ↓
            Compteur incrémenté
                    ↓
            5 échecs en 10 min ?
                    ↓ oui
            AlertManager.sendAlert({
              type: REPEATED_FAILURES,
              severity: HIGH,
              workerName: "payment-worker"
            })
```

## Seuils par défaut

| Paramètre | Valeur |
|-----------|--------|
| Échecs déclencheurs | 5 |
| Fenêtre temporelle | 10 minutes |
