import { ErrorBase, type Result } from "@lec-packages/ddd-tools";
import { z } from "zod";

/**
 * Types of alerts that can be triggered in the system
 */
export enum AlertType {
	WORKER_DOWN = "WORKER_DOWN",
	REPEATED_FAILURES = "REPEATED_FAILURES",
	RATE_LIMIT = "RATE_LIMIT",
	JOB_FAILURE = "JOB_FAILURE",
}

/**
 * Severity levels for alerts
 */
export enum AlertSeverity {
	CRITICAL = "CRITICAL", // Immediate action required
	HIGH = "HIGH", // Response needed within hours
	MEDIUM = "MEDIUM", // Can wait until next business day
	LOW = "LOW", // Informational
}

/**
 * Alert schema with all required fields
 */
export const AlertSchema = z.object({
	type: z.nativeEnum(AlertType),
	severity: z.nativeEnum(AlertSeverity),
	workerName: z.string(),
	timestamp: z.date(),
	context: z.record(z.string(), z.unknown()),
	message: z.string(),
});

/**
 * Alert type inferred from schema
 */
export type Alert = z.infer<typeof AlertSchema>;

/**
 * Alert thresholds configuration
 */
export const ALERT_THRESHOLDS = {
	/** Number of failures before triggering REPEATED_FAILURES alert */
	failuresInWindow: 5,
	/** Time window in minutes for counting failures */
	timeWindowMinutes: 10,
} as const;

/**
 * Alert debounce window in milliseconds (5 minutes)
 * Alerts of the same type within this window will be grouped
 */
export const ALERT_DEBOUNCE_WINDOW = 5 * 60 * 1000; // 5 minutes

/**
 * Admin email for receiving alerts
 * Must be configured via ADMIN_EMAIL environment variable
 */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

/**
 * Whether alerting is enabled
 * Can be disabled via ALERT_ENABLED=false environment variable
 */
export const ALERT_ENABLED =
	process.env.ALERT_ENABLED === undefined
		? true
		: process.env.ALERT_ENABLED === "true";

export class AlertError extends ErrorBase {
	readonly code = "ALERT_SEND_ERROR";
	constructor(
		message: string,
		metadata?: {
			alertType?: string;
			recipient?: string;
			context?: unknown;
		},
	) {
		super(message, undefined, metadata);
	}
}

export class MapperError extends ErrorBase {
	readonly code = "MAPPER_ERROR";
}

/**
 * Result of sending an alert
 */
export interface AlertSendResult {
	id: string;
	timestamp: Date;
	provider: string;
}

/**
 * Interface that all alert providers must implement
 */
export interface AlertProvider {
	/** Unique name of the provider */
	readonly name: string;

	/**
	 * Send a single alert
	 */
	send(alert: Alert): Promise<Result<AlertSendResult, AlertError>>;

	/**
	 * Send multiple alerts
	 */
	sendBatch(alerts: Alert[]): Promise<Result<AlertSendResult, AlertError>>;

	/**
	 * Verify the provider connection is working
	 */
	verify(): Promise<boolean>;

	/**
	 * Close/cleanup the provider
	 */
	close(): void;
}
