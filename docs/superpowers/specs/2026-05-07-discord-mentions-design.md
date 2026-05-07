# Discord Provider — Mentions (tags) support

**Date:** 2026-05-07
**Status:** Spec — awaiting user review
**Package:** `@lec-core/alert-manager`

## Summary

Add the ability for the `DiscordProvider` to mention (tag) users, roles, `@everyone` and `@here` when sending alerts. Mentions can be configured statically per severity on the provider, and overridden dynamically per alert via the `AlertManager.sendAlert` API.

## Goals

- Static configuration: route mentions by `AlertSeverity` (e.g. `CRITICAL` → `@oncall` role + `@here`).
- Dynamic override: per-alert mentions passed at `sendAlert` time.
- Real Discord notifications: mentions placed in `content` (not embed), with `allowed_mentions` set explicitly.
- 100% backward compatible: existing callers pass nothing → behavior unchanged.

## Non-goals

- No mentions for `EmailProvider`.
- No Zod validation of Discord snowflake IDs (Discord silently ignores invalid IDs; not worth the surface).
- No templating of mentions inside the alert `message`.

## API

### New types

```typescript
export interface DiscordMentions {
  /** Discord user IDs → rendered as <@id> */
  users?: string[];
  /** Discord role IDs → rendered as <@&id> */
  roles?: string[];
  /** Render @everyone */
  everyone?: boolean;
  /** Render @here */
  here?: boolean;
}

export interface DiscordSendOptions {
  /** Override the static `mentionsBySeverity` config for this send. */
  mentions?: DiscordMentions;
}
```

### `DiscordProviderConfig` extended

```typescript
export interface DiscordProviderConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
  /** Static mentions per severity. Used when no per-send override is provided. */
  mentionsBySeverity?: Partial<Record<AlertSeverity, DiscordMentions>>;
  retry?: { maxAttempts?: number; delays?: number[] };
}
```

### `AlertProvider` interface — generic options

```typescript
export interface AlertProvider<TOptions = void> {
  readonly name: string;
  send(
    alert: Alert,
    options?: TOptions,
  ): Promise<Result<AlertSendResult, AlertError>>;
  sendBatch(
    alerts: Alert[],
    options?: TOptions,
  ): Promise<Result<AlertSendResult, AlertError>>;
  verify(): Promise<boolean>;
  close(): void;
}
```

`TOptions = void` default keeps existing implementations (e.g. `EmailProvider`) valid without changes.

`DiscordProvider` becomes:

```typescript
export class DiscordProvider implements AlertProvider<DiscordSendOptions> { ... }
```

### `AlertManager.sendAlert` extended

```typescript
sendAlert(
  alert: Alert,
  options?: {
    providers?: string[];
    providerOptions?: {
      discord?: DiscordSendOptions;
      // future: email?: EmailSendOptions;
    };
  },
): Promise<Result<MultiProviderResult, AlertError>>;
```

`AlertManager` routes `providerOptions[provider.name]` to the matching provider's `sendBatch`. Routing is by `provider.name` (the `readonly name` field). The `DiscordProvider` ships with `name = "discord"` — documented as the contract.

## Behavior

### Mention resolution (in `DiscordProvider.sendBatch(alerts, options)`)

1. If `options?.mentions !== undefined` → use it. Override is total — does not merge with static config. An explicit `mentions: {}` is a valid way to opt out of the static config for this send.
2. Else, compute the **highest** severity in the batch (`CRITICAL > HIGH > MEDIUM > LOW`) and look up `config.mentionsBySeverity[severity]`.
3. If still no mentions, or all resolved segments are empty → no mentions. Payload identical to current behavior (no `content`, no `allowed_mentions`).

Highest-severity selection avoids emitting multiple mention blocks for a batch and ensures the most critical mention wins.

### `content` rendering

Segments concatenated with single spaces, in this order:
1. `@everyone` (if `everyone: true`)
2. `@here` (if `here: true`)
3. Roles: `<@&ROLE_ID>` for each
4. Users: `<@USER_ID>` for each

Empty arrays / false flags are skipped. If all segments are empty, no `content` field is added to the payload.

### `allowed_mentions`

Sent only when there is at least one mention. Built from the resolved `DiscordMentions`:

```json
{
  "parse": ["everyone"],   // present only if everyone === true || here === true
  "users": ["..."],         // resolved user IDs (empty array OK)
  "roles": ["..."]          // resolved role IDs (empty array OK)
}
```

Discord treats `@everyone` and `@here` as the same `parse` value (`"everyone"`) — both require it.

### Edge cases

- `mentions: {}` passed as override → treated as "no mentions" (falls through to no `content`).
- Empty arrays on `users` / `roles` → skipped.
- Severity not present in `mentionsBySeverity` map → no mentions for that severity.
- Batch with mixed severities → highest severity wins.

## Backward compatibility

- `AlertProvider<TOptions = void>` default makes existing `implements AlertProvider` valid as-is.
- `sendAlert(alert)` and `sendAlert(alert, { providers })` keep working — `providerOptions` is optional.
- Without `mentionsBySeverity` and without override → payload byte-identical to today.

## Tests

In `packages/alert-manager/src/providers/discord-provider.test.ts` (create or extend):

1. No mentions configured → payload has no `content` / `allowed_mentions` (regression guard).
2. `mentionsBySeverity.CRITICAL` configured, alert is CRITICAL → `content` contains mentions, `allowed_mentions` correct.
3. `mentionsBySeverity.HIGH` configured, alert is LOW → no mentions (no severity match).
4. Batch with mixed severities → highest severity wins.
5. Per-alert override → fully replaces static config.
6. Override `mentions: {}` → no `content`.
7. `everyone: true` → `allowed_mentions.parse` contains `"everyone"`.
8. Combination of users + roles + here → ordering and format are correct.
9. AlertManager routing → `providerOptions.discord` reaches `DiscordProvider`, not other providers.

## Files touched

- `packages/alert-manager/src/types/index.ts` — `AlertProvider<TOptions = void>` generic.
- `packages/alert-manager/src/providers/discord-provider.ts` — `DiscordMentions`, `DiscordSendOptions`, config field, resolution + rendering logic.
- `packages/alert-manager/src/alert-manager.ts` — `sendAlert` / `sendAlerts` accept `providerOptions`; route by `provider.name`.
- `packages/alert-manager/src/index.ts` — export `DiscordMentions`, `DiscordSendOptions`.
- `packages/alert-manager/src/providers/email-provider.ts` — declare `implements AlertProvider<void>` for consistency (optional thanks to default).
- `packages/alert-manager/src/providers/discord-provider.test.ts` — new tests.

## Open questions

None.
