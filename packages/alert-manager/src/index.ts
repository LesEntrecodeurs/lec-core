// Alert system exports

// Core alert manager (singleton)
export { AlertManager, type MultiProviderResult } from "./alert-manager";

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

// Types
export {
	ALERT_DEBOUNCE_WINDOW,
	ALERT_ENABLED,
	ALERT_THRESHOLDS,
	type Alert,
	AlertError,
	type AlertProvider,
	AlertSchema,
	type AlertSendResult,
	AlertSeverity,
	AlertType,
} from "./types";
