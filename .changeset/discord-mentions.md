---
"@lec-core/alert-manager": minor
---

feat(discord): add mention support in DiscordProvider

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
