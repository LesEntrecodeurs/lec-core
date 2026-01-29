---
sidebar_position: 3
---

# ValueObject

Classe abstraite pour les objets valeur. Un value object est immuable et défini par l'ensemble de ses propriétés.

## API

```typescript
abstract class ValueObject<T> {
  protected readonly props: T;

  equals(vo?: ValueObject<T>): boolean;
  toJSON(): T;
}
```

## Value Objects inclus

### DateRange

Représente une plage de dates avec validation.

```typescript
import { DateRange } from "@lec-packages/ddd-tools";

const range = DateRange.create({
  from: new Date("2024-01-01"),
  to: new Date("2024-12-31"),
});

if (range.isOk()) {
  range.value.durationInDays();    // nombre de jours
  range.value.durationInHours();   // nombre d'heures
  range.value.contains(someDate);  // true/false
  range.value.overlaps(otherRange); // true/false
  range.value.startSameDayAs(otherRange); // true/false
}
```

### Address

Représente une adresse postale avec validation Zod.

```typescript
import { Address } from "@lec-packages/ddd-tools";

const address = Address.create({
  street: "12 rue de la Paix",
  city: "Paris",
  country: "France",
  postalCode: "75002",
});

if (address.isOk()) {
  address.value.toString(); // "12 rue de la Paix, 75002 Paris, France"
}
```

### LocalizedContent

Stocke du contenu traduit en plusieurs langues.

```typescript
import { LocalizedContent } from "@lec-packages/ddd-tools";

const content = LocalizedContent.create({
  translations: new Map([
    ["fr", "Bonjour"],
    ["en", "Hello"],
  ]),
});

if (content.isOk()) {
  content.value.getTranslation("fr");             // "Bonjour"
  content.value.getOrFallback("de", "en");         // "Hello" (fallback)
  content.value.hasTranslation("fr");              // true
  content.value.addTranslation("es", "Hola");      // nouveau LocalizedContent
  content.value.removeTranslation("en");           // nouveau LocalizedContent
}
```

## Créer un Value Object custom

```typescript
import { ValueObject } from "@lec-packages/ddd-tools";

interface MoneyProps {
  amount: number;
  currency: string;
}

class Money extends ValueObject<MoneyProps> {
  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot add different currencies");
    }
    return new Money({ amount: this.amount + other.amount, currency: this.currency });
  }
}
```
