# @lec-core/alert

## 1.2.0

### Minor Changes

- a5549de: feat(discord): add mention support in DiscordProvider

  The `DiscordProvider` can now mention users, roles, `@everyone` and `@here`
  when sending alerts. Mentions are placed in the webhook `content` (with
  `allowed_mentions` set explicitly so notifications actually fire) and can
  be configured two ways:

  - **Statically per severity** via `DiscordProviderConfig.mentionsBySeverity`.
    For batched alerts, the highest severity wins.
  - **Dynamically per send** via `AlertManager.sendAlert(alert, { providerOptions: { discord: { mentions } } })`,
    which fully replaces the static config for that send.

  The `AlertProvider` interface now takes an optional `TOptions` generic
  (default `void`), so existing implementations (e.g. `EmailProvider`) keep
  working without changes. New exports: `DiscordMentions`, `DiscordSendOptions`,
  `SendAlertOptions`, `ProviderSendOptions`.

## 1.1.0

### Minor Changes

- add alert manager module suystem for nest js

## 2.0.0

### Major Changes

- 5849c58: Init

### Patch Changes

- Updated dependencies [5849c58]
  - @lec-core/ddd-tools@2.0.0

## 1.1.3

### Patch Changes

- 76a0f99: Fix npm publishing: use workspace:^ for proper version resolution

## 1.1.2

### Patch Changes

- 90f5ad4: Export missing types

## 1.1.1

### Patch Changes

- 3083243: Export missing types from package index

## 1.1.0

### Minor Changes

- 3a22d6a: update readme

### Patch Changes

- Updated dependencies [3a22d6a]
  - @lec-core/ddd-tools@1.1.0

## 1.0.0

### Major Changes

- Initial release
