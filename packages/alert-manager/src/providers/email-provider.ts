import { Err, Ok, type Result } from "@lec-packages/ddd-tools";
import { render } from "@react-email/render";
import type React from "react";
import { NodemailerClient, type NodemailerConfig } from "../nodemailer";
import { CriticalAlertEmail } from "../templates/critical-alert-email";
import {
	type Alert,
	AlertError,
	type AlertProvider,
	type AlertSendResult,
} from "../types";

/**
 * Email provider configuration
 */
export interface EmailProviderConfig {
	/** SMTP configuration */
	smtp: NodemailerConfig;
	/** Sender email address */
	fromEmail: string;
	/** Recipient email address */
	toEmail: string;
	/** Retry configuration */
	retry?: {
		maxAttempts?: number;
		delays?: number[];
	};
}

const DEFAULT_RETRY = {
	maxAttempts: 3,
	delays: [1000, 2000, 4000],
};

/**
 * Email alert provider using Nodemailer
 */
export class EmailProvider implements AlertProvider {
	readonly name = "email";

	private readonly mailer: NodemailerClient;
	private readonly config: EmailProviderConfig;
	private readonly retryConfig: Required<
		NonNullable<EmailProviderConfig["retry"]>
	>;

	constructor(config: EmailProviderConfig) {
		this.config = config;
		this.mailer = new NodemailerClient(config.smtp);
		this.retryConfig = {
			maxAttempts: config.retry?.maxAttempts ?? DEFAULT_RETRY.maxAttempts,
			delays: config.retry?.delays ?? DEFAULT_RETRY.delays,
		};
	}

	async send(alert: Alert): Promise<Result<AlertSendResult, AlertError>> {
		return this.sendBatch([alert]);
	}

	async sendBatch(
		alerts: Alert[],
	): Promise<Result<AlertSendResult, AlertError>> {
		if (alerts.length === 0) {
			return Err.of(
				new AlertError("No alerts to send", {
					alertType: "UNKNOWN",
					recipient: this.config.toEmail,
				}),
			);
		}

		const firstAlert = alerts[0];

		if (!firstAlert) {
			return Err.of(new AlertError("No valid alerts to send"));
		}

		const subject = this.getSubject(firstAlert.severity, firstAlert.type);

		// Render email template
		let html: string;
		try {
			html = await render(
				CriticalAlertEmail({
					alerts,
					alertType: firstAlert.type,
					severity: firstAlert.severity,
				}) as React.ReactElement,
			);
		} catch (error) {
			return Err.of(
				new AlertError("Failed to render email template", {
					alertType: firstAlert.type,
					recipient: this.config.toEmail,
					context: error instanceof Error ? error.message : String(error),
				}),
			);
		}

		// Send with retry
		return this.sendWithRetry(subject, html, firstAlert.type);
	}

	async verify(): Promise<boolean> {
		return this.mailer.verify();
	}

	close(): void {
		this.mailer.close();
	}

	private async sendWithRetry(
		subject: string,
		html: string,
		alertType: string,
	): Promise<Result<AlertSendResult, AlertError>> {
		for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
			const { data, error } = await this.mailer.send({
				from: this.config.fromEmail,
				to: this.config.toEmail,
				subject,
				html,
			});

			if (error) {
				const isTransient = this.isTransientError(error);

				if (!isTransient || attempt === this.retryConfig.maxAttempts - 1) {
					return Err.of(
						new AlertError("Failed to send email", {
							alertType,
							recipient: this.config.toEmail,
							context: { error: error.message, attempts: attempt + 1 },
						}),
					);
				}

				await this.sleep(this.retryConfig.delays[attempt] ?? 1000);
				continue;
			}

			if (!data?.id) {
				return Err.of(
					new AlertError("Invalid response from mailer", {
						alertType,
						recipient: this.config.toEmail,
					}),
				);
			}

			return Ok.of({
				id: data.id,
				timestamp: new Date(),
				provider: this.name,
			});
		}

		return Err.of(
			new AlertError("Failed to send email after retries", {
				alertType,
				recipient: this.config.toEmail,
				context: { attempts: this.retryConfig.maxAttempts },
			}),
		);
	}

	private getSubject(severity: string, alertType: string): string {
		const icons: Record<string, string> = {
			CRITICAL: "🚨",
			HIGH: "⚠️",
			MEDIUM: "ℹ️",
			LOW: "📝",
		};
		const icon = icons[severity] ?? "ℹ️";
		return `${icon} ${severity}: ${alertType}`;
	}

	private isTransientError(error: {
		message: string;
		statusCode?: number;
	}): boolean {
		if (error.statusCode === 429 || error.statusCode === 503) return true;
		const msg = error.message.toLowerCase();
		return (
			msg.includes("timeout") ||
			msg.includes("network") ||
			msg.includes("econnrefused")
		);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
