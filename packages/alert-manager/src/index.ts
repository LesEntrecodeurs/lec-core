// Alert system exports

// Core alert manager (singleton)
export { AlertManager } from "./alert-manager";

// Failure detection
export { FailureDetector } from "./failure-detector";
export {
	DiscordProvider,
	type DiscordProviderConfig,
} from "./providers/discord-provider";

export {
	EmailProvider,
	type EmailProviderConfig,
} from "./providers/email-provider";
// Email templates
export {
	CriticalAlertEmail,
	type CriticalAlertEmailProps,
} from "./templates/critical-alert-email";
