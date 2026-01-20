// Alert system exports

// Core alert manager (singleton)
export { AlertManager } from "./alert-manager";

// Failure detection
export { FailureDetector } from "./failure-detector";

// Email templates
export {
	CriticalAlertEmail,
	type CriticalAlertEmailProps,
} from "./templates/critical-alert-email";
