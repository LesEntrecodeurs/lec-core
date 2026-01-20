import { Err, Ok, type Result } from "@lec/ddd-tools";
import { render } from "@react-email/render";
import type React from "react";
import { NodemailerClient, type NodemailerConfig } from "./nodemailer";
import { CriticalAlertEmail } from "./templates/critical-alert-email";
import {
	type Alert,
	AlertError,
	type AlertSeverity,
	type AlertType,
} from "./types";

/**
 * Configuration for AlertManager
 */
export interface AlertManagerConfig {
	/** SMTP configuration */
	smtp: NodemailerConfig;
	/** Default sender email address (can be overridden per send) */
	fromEmail?: string;
	/** Admin email to receive alerts */
	adminEmail: string;
	/** Retry configuration */
	retry?: {
		maxAttempts?: number;
		delays?: number[]; // Exponential backoff in ms
	};
	/** Alert thresholds configuration */
	thresholds?: {
		/** Number of failures before triggering REPEATED_FAILURES alert */
		failuresInWindow?: number;
		/** Time window in minutes for counting failures */
		timeWindowMinutes?: number;
	};
	/** Debounce window in milliseconds to prevent duplicate alerts */
	debounceWindowMs?: number;
}

/**
 * Email sent result
 */
export interface EmailSent {
	id: string;
	timestamp: Date;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
	maxAttempts: 3,
	delays: [1000, 2000, 4000],
};

/**
 * Default alert thresholds
 */
const DEFAULT_THRESHOLDS = {
	failuresInWindow: 5,
	timeWindowMinutes: 10,
};

/**
 * Default debounce window (5 minutes)
 */
const DEFAULT_DEBOUNCE_WINDOW_MS = 5 * 60 * 1000;

/**
 * AlertManager - handles sending alert emails via Nodemailer
 *
 * @example
 * ```typescript
 * // Initialize once at app startup
 * AlertManager.initialize({
 *   smtp: {
 *     host: "smtp.gmail.com",
 *     port: 587,
 *     secure: false,
 *     auth: {
 *       user: "your-email@gmail.com",
 *       pass: "your-app-password",
 *     },
 *   },
 *   fromEmail: "alerts@yourcompany.com", // optional default
 *   adminEmail: "admin@yourcompany.com",
 *   // Optional: customize thresholds
 *   thresholds: {
 *     failuresInWindow: 5,    // failures before alert
 *     timeWindowMinutes: 10,  // time window for counting
 *   },
 *   // Optional: debounce window (default 5 min)
 *   debounceWindowMs: 5 * 60 * 1000,
 *   // Optional: retry config
 *   retry: {
 *     maxAttempts: 3,
 *     delays: [1000, 2000, 4000],
 *   },
 * });
 *
 * // Access thresholds anywhere
 * const { failuresInWindow, timeWindowMinutes } = AlertManager.getInstance().thresholds;
 * const debounce = AlertManager.getInstance().debounceWindow;
 *
 * // Send alert
 * await AlertManager.getInstance().sendAlert({
 *   type: AlertType.SYSTEM_ERROR,
 *   severity: AlertSeverity.CRITICAL,
 *   message: "Something went wrong",
 *   timestamp: new Date(),
 * });
 *
 * // Or override from per call
 * await AlertManager.getInstance().sendAlert(
 *   { type: AlertType.SYSTEM_ERROR, severity: AlertSeverity.HIGH, ... },
 *   { from: "other-sender@yourcompany.com" }
 * );
 * ```
 */
export class AlertManager {
	private static instance: AlertManager | null = null;

	private readonly mailer: NodemailerClient;
	private readonly config: AlertManagerConfig;
	private readonly retryConfig: Required<
		NonNullable<AlertManagerConfig["retry"]>
	>;
	private readonly thresholdsConfig: Required<
		NonNullable<AlertManagerConfig["thresholds"]>
	>;
	private readonly debounceWindowMs: number;

	private constructor(config: AlertManagerConfig) {
		this.config = config;
		this.mailer = new NodemailerClient(config.smtp);
		this.retryConfig = {
			maxAttempts:
				config.retry?.maxAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts,
			delays: config.retry?.delays ?? DEFAULT_RETRY_CONFIG.delays,
		};
		this.thresholdsConfig = {
			failuresInWindow:
				config.thresholds?.failuresInWindow ??
				DEFAULT_THRESHOLDS.failuresInWindow,
			timeWindowMinutes:
				config.thresholds?.timeWindowMinutes ??
				DEFAULT_THRESHOLDS.timeWindowMinutes,
		};
		this.debounceWindowMs =
			config.debounceWindowMs ?? DEFAULT_DEBOUNCE_WINDOW_MS;
	}

	/**
	 * Initialize the singleton instance with configuration
	 * Must be called once before using getInstance()
	 */
	static initialize(config: AlertManagerConfig): AlertManager {
		if (AlertManager.instance) {
			console.warn(
				"AlertManager already initialized, returning existing instance",
			);
			return AlertManager.instance;
		}
		AlertManager.instance = new AlertManager(config);
		console.info("AlertManager initialized");
		return AlertManager.instance;
	}

	/**
	 * Get the singleton instance
	 * @throws Error if not initialized
	 */
	static getInstance(): AlertManager {
		if (!AlertManager.instance) {
			throw new Error(
				"AlertManager not initialized. Call AlertManager.initialize(config) first.",
			);
		}
		return AlertManager.instance;
	}

	/**
	 * Check if AlertManager has been initialized
	 */
	static isInitialized(): boolean {
		return AlertManager.instance !== null;
	}

	/**
	 * Reset the singleton instance (useful for testing)
	 */
	static reset(): void {
		if (AlertManager.instance) {
			AlertManager.instance.close();
			AlertManager.instance = null;
		}
	}

	/**
	 * Get alert thresholds configuration
	 */
	get thresholds(): Readonly<
		Required<NonNullable<AlertManagerConfig["thresholds"]>>
	> {
		return this.thresholdsConfig;
	}

	/**
	 * Get debounce window in milliseconds
	 */
	get debounceWindow(): number {
		return this.debounceWindowMs;
	}

	/**
	 * Get retry configuration
	 */
	get retry(): Readonly<Required<NonNullable<AlertManagerConfig["retry"]>>> {
		return this.retryConfig;
	}

	/**
	 * Verify SMTP connection is working
	 */
	async verifyConnection(): Promise<boolean> {
		return this.mailer.verify();
	}

	/**
	 * Send an alert email (single alert)
	 */
	async sendAlert(
		alert: Alert,
		options?: { from?: string },
	): Promise<Result<EmailSent, AlertError>> {
		return this.sendAlerts([alert], alert.type, alert.severity, options);
	}

	/**
	 * Send multiple alerts in one email
	 */
	async sendAlerts(
		alerts: Alert[],
		alertType: AlertType,
		severity: AlertSeverity,
		options?: { from?: string },
	): Promise<Result<EmailSent, AlertError>> {
		const startTime = Date.now();
		const subject = this.getAlertSubject(severity, alertType);
		const fromEmail = options?.from ?? this.config.fromEmail;

		if (!fromEmail) {
			return Err.of(
				new AlertError("No from email provided", {
					alertType,
					recipient: this.config.adminEmail,
					context: "Provide fromEmail in config or pass it in options",
				}),
			);
		}

		console.info(
			{
				recipient: this.config.adminEmail,
				subject,
				alertType,
				severity,
				alertCount: alerts.length,
			},
			"sending alert email",
		);

		// Render email template
		let html: string;
		try {
			html = await render(
				CriticalAlertEmail({
					alerts,
					alertType,
					severity,
				}) as React.ReactElement,
			);
		} catch (error) {
			console.error(
				{
					recipient: this.config.adminEmail,
					alertType,
					error: error instanceof Error ? error.message : String(error),
				},
				"failed to render alert email template",
			);
			return Err.of(
				new AlertError("Failed to render alert email template", {
					alertType,
					recipient: this.config.adminEmail,
					context: error instanceof Error ? error.message : String(error),
				}),
			);
		}

		console.info(
			{
				recipient: this.config.adminEmail,
				htmlLength: html.length,
			},
			"alert email template rendered",
		);

		// Send email with retry logic
		const result = await this.sendWithRetry({
			subject,
			html,
			alertType,
			fromEmail,
		});

		const duration = Date.now() - startTime;

		if (result.isErr()) {
			console.error(
				{
					recipient: this.config.adminEmail,
					subject,
					alertType,
					error: result.error.toJSON(),
					duration,
				},
				"alert email send failed after retries",
			);
			return result;
		}

		console.info(
			{
				recipient: this.config.adminEmail,
				emailId: result.value.id,
				alertType,
				duration,
			},
			"alert email sent successfully",
		);

		return result;
	}

	/**
	 * Send a custom email (not using alert template)
	 */
	async sendCustomEmail(params: {
		from?: string;
		to?: string;
		subject: string;
		html: string;
		text?: string;
	}): Promise<Result<EmailSent, AlertError>> {
		const recipient = params.to ?? this.config.adminEmail;
		const fromEmail = params.from ?? this.config.fromEmail;

		if (!fromEmail) {
			return Err.of(
				new AlertError("No from email provided", {
					alertType: "CUSTOM",
					recipient,
					context: "Provide fromEmail in config or pass it in params",
				}),
			);
		}

		const { data, error } = await this.mailer.send({
			from: fromEmail,
			to: recipient,
			subject: params.subject,
			html: params.html,
			text: params.text,
		});

		if (error || !data) {
			return Err.of(
				new AlertError("Failed to send custom email", {
					alertType: "CUSTOM",
					recipient,
					context: error?.message,
				}),
			);
		}

		return Ok.of({
			id: data.id,
			timestamp: new Date(),
		});
	}

	/**
	 * Send email with exponential backoff retry logic
	 */
	private async sendWithRetry(params: {
		subject: string;
		html: string;
		alertType: AlertType;
		fromEmail: string;
	}): Promise<Result<EmailSent, AlertError>> {
		const { subject, html, alertType, fromEmail } = params;

		for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
			try {
				console.info(
					{
						recipient: this.config.adminEmail,
						alertType,
						attempt: attempt + 1,
						maxAttempts: this.retryConfig.maxAttempts,
					},
					"attempting alert email send",
				);

				const { data, error } = await this.mailer.send({
					from: fromEmail,
					to: this.config.adminEmail,
					subject,
					html,
				});

				if (error) {
					const isTransient = this.isTransientError(error);

					if (!isTransient || attempt === this.retryConfig.maxAttempts - 1) {
						console.error(
							{
								recipient: this.config.adminEmail,
								alertType,
								error: error.message,
								attempt: attempt + 1,
								isTransient,
							},
							"alert email send failed",
						);

						return Err.of(
							new AlertError("Failed to send alert email", {
								alertType,
								recipient: this.config.adminEmail,
								context: {
									error: error.message,
									attempts: attempt + 1,
								},
							}),
						);
					}

					// Transient error, retry
					console.warn(
						{
							recipient: this.config.adminEmail,
							alertType,
							error: error.message,
							attempt: attempt + 1,
							nextDelay: this.retryConfig.delays[attempt],
						},
						"transient error, retrying alert email",
					);

					await this.sleep(this.retryConfig.delays[attempt] ?? 1000);
					continue;
				}

				// Success
				if (!data?.id) {
					return Err.of(
						new AlertError("Invalid response from mailer", {
							alertType,
							recipient: this.config.adminEmail,
							context: { response: data },
						}),
					);
				}

				return Ok.of({
					id: data.id,
					timestamp: new Date(),
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				if (attempt < this.retryConfig.maxAttempts - 1) {
					console.warn(
						{
							recipient: this.config.adminEmail,
							alertType,
							error: errorMessage,
							attempt: attempt + 1,
							nextDelay: this.retryConfig.delays[attempt],
						},
						"network error, retrying alert email",
					);

					await this.sleep(this.retryConfig.delays[attempt] ?? 1000);
					continue;
				}

				console.error(
					{
						recipient: this.config.adminEmail,
						alertType,
						error: errorMessage,
						attempt: attempt + 1,
					},
					"alert email send failed after all retries",
				);

				return Err.of(
					new AlertError("Failed to send alert email after retries", {
						alertType,
						recipient: this.config.adminEmail,
						context: {
							error: errorMessage,
							attempts: attempt + 1,
						},
					}),
				);
			}
		}

		return Err.of(
			new AlertError("Failed to send alert email", {
				alertType,
				recipient: this.config.adminEmail,
				context: { attempts: this.retryConfig.maxAttempts },
			}),
		);
	}

	/**
	 * Get alert email subject line
	 */
	private getAlertSubject(
		severity: AlertSeverity,
		alertType: AlertType,
	): string {
		const icon = this.getSeverityIcon(severity);
		return `${icon} ${severity}: ${alertType}`;
	}

	/**
	 * Get severity icon for email subject
	 */
	private getSeverityIcon(severity: AlertSeverity): string {
		const icons: Record<AlertSeverity, string> = {
			CRITICAL: "🚨",
			HIGH: "⚠️",
			MEDIUM: "ℹ️",
			LOW: "📝",
		};
		return icons[severity] ?? "ℹ️";
	}

	/**
	 * Check if error is transient (retryable)
	 */
	private isTransientError(error: {
		message: string;
		statusCode?: number;
	}): boolean {
		if (error.statusCode === 429 || error.statusCode === 503) {
			return true;
		}

		const msg = error.message.toLowerCase();
		return (
			msg.includes("timeout") ||
			msg.includes("network") ||
			msg.includes("econnrefused")
		);
	}

	/**
	 * Sleep utility
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Close the mailer connection
	 */
	close(): void {
		this.mailer.close();
	}
}
