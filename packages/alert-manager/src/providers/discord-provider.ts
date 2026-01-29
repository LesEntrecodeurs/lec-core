import { Err, Ok, type Result } from "@lec-packages/ddd-tools";
import {
	type Alert,
	AlertError,
	type AlertProvider,
	type AlertSendResult,
} from "../types";

/**
 * Discord provider configuration
 */
export interface DiscordProviderConfig {
	/** Discord webhook URL */
	webhookUrl: string;
	/** Bot username (optional) */
	username?: string;
	/** Bot avatar URL (optional) */
	avatarUrl?: string;
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
 * Discord embed color based on severity
 */
const SEVERITY_COLORS: Record<string, number> = {
	CRITICAL: 0xff0000, // Red
	HIGH: 0xff9900, // Orange
	MEDIUM: 0xffff00, // Yellow
	LOW: 0x00ff00, // Green
};

/**
 * Discord embed icons based on severity
 */
const SEVERITY_ICONS: Record<string, string> = {
	CRITICAL: "🚨",
	HIGH: "⚠️",
	MEDIUM: "ℹ️",
	LOW: "📝",
};

/**
 * Discord alert provider using webhooks
 */
export class DiscordProvider implements AlertProvider {
	readonly name = "discord";

	private readonly config: DiscordProviderConfig;
	private readonly retryConfig: Required<
		NonNullable<DiscordProviderConfig["retry"]>
	>;

	constructor(config: DiscordProviderConfig) {
		this.config = config;
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
		const firstAlert = alerts[0];

		if (!firstAlert) {
			return Err.of(
				new AlertError("No alerts to send", {
					alertType: "UNKNOWN",
					recipient: "discord",
				}),
			);
		}

		const embeds = alerts.map((alert) => this.createEmbed(alert));
		const payload = this.createPayload(embeds);

		return this.sendWithRetry(payload, firstAlert.type);
	}

	async verify(): Promise<boolean> {
		try {
			// Discord webhooks don't have a verify endpoint
			// We can try to send a GET request to check if the webhook exists
			const response = await fetch(this.config.webhookUrl, { method: "GET" });
			return response.ok;
		} catch {
			return false;
		}
	}

	close(): void {
		// Nothing to close for HTTP webhooks
	}

	private createEmbed(alert: Alert): DiscordEmbed {
		const icon = SEVERITY_ICONS[alert.severity] ?? "ℹ️";
		const color = SEVERITY_COLORS[alert.severity] ?? 0x808080;

		const fields: DiscordEmbedField[] = [
			{ name: "Type", value: alert.type, inline: true },
			{ name: "Severity", value: alert.severity, inline: true },
		];

		if (alert.workerName) {
			fields.push({ name: "Worker", value: alert.workerName, inline: true });
		}

		if (alert.context) {
			const contextStr =
				typeof alert.context === "string"
					? alert.context
					: JSON.stringify(alert.context, null, 2);

			// Discord has a 1024 char limit per field
			const truncated =
				contextStr.length > 1000
					? `${contextStr.slice(0, 997)}...`
					: contextStr;

			fields.push({
				name: "Context",
				value: `\`\`\`json\n${truncated}\n\`\`\``,
				inline: false,
			});
		}

		return {
			title: `${icon} ${alert.severity}: ${alert.type}`,
			description: alert.message,
			color,
			fields,
			timestamp: alert.timestamp.toISOString(),
			footer: {
				text: "Alert System",
			},
		};
	}

	private createPayload(embeds: DiscordEmbed[]): DiscordWebhookPayload {
		return {
			username: this.config.username ?? "Alert Bot",
			avatar_url: this.config.avatarUrl,
			embeds: embeds.slice(0, 10), // Discord allows max 10 embeds per message
		};
	}

	private async sendWithRetry(
		payload: DiscordWebhookPayload,
		alertType: string,
	): Promise<Result<AlertSendResult, AlertError>> {
		for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
			try {
				const response = await fetch(this.config.webhookUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});

				if (response.ok) {
					return Ok.of({
						id: `discord-${Date.now()}`,
						timestamp: new Date(),
						provider: this.name,
					});
				}

				// Check for rate limiting
				if (response.status === 429) {
					const retryAfter = response.headers.get("Retry-After");
					const delay = retryAfter
						? Number.parseInt(retryAfter, 10) * 1000
						: (this.retryConfig.delays[attempt] ?? 1000);

					if (attempt < this.retryConfig.maxAttempts - 1) {
						await this.sleep(delay);
						continue;
					}
				}

				// Other errors
				const errorBody = await response.text();

				if (attempt === this.retryConfig.maxAttempts - 1) {
					return Err.of(
						new AlertError("Failed to send Discord alert", {
							alertType,
							recipient: "discord",
							context: {
								status: response.status,
								body: errorBody,
								attempts: attempt + 1,
							},
						}),
					);
				}

				await this.sleep(this.retryConfig.delays[attempt] ?? 1000);
			} catch (error) {
				if (attempt === this.retryConfig.maxAttempts - 1) {
					return Err.of(
						new AlertError("Failed to send Discord alert", {
							alertType,
							recipient: "discord",
							context: {
								error: error instanceof Error ? error.message : String(error),
								attempts: attempt + 1,
							},
						}),
					);
				}

				await this.sleep(this.retryConfig.delays[attempt] ?? 1000);
			}
		}

		return Err.of(
			new AlertError("Failed to send Discord alert after retries", {
				alertType,
				recipient: "discord",
				context: { attempts: this.retryConfig.maxAttempts },
			}),
		);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

/**
 * Discord embed types
 */
interface DiscordEmbed {
	title: string;
	description: string;
	color: number;
	fields: DiscordEmbedField[];
	timestamp: string;
	footer?: {
		text: string;
		icon_url?: string;
	};
}

interface DiscordEmbedField {
	name: string;
	value: string;
	inline: boolean;
}

interface DiscordWebhookPayload {
	username?: string;
	avatar_url?: string;
	content?: string;
	embeds: DiscordEmbed[];
}
