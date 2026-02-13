export { AlertManager, type MultiProviderResult } from "./alert-manager";

export { FailureDetector } from "./failure-detector";
export { AlertManagerModule } from "./nestjs/alert-manager.module";
export { AlertManagerService } from "./nestjs/alert-manager.service";
export type { AlertManagerModuleAsyncOptions } from "./nestjs/interfaces";
export {
	DiscordProvider,
	type DiscordProviderConfig,
} from "./providers/discord-provider";
export {
	EmailProvider,
	type EmailProviderConfig,
} from "./providers/email-provider";
export {
	CriticalAlertEmail,
	type CriticalAlertEmailProps,
} from "./templates/critical-alert-email";
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
