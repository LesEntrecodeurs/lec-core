import { Err, Ok, type Result } from "@lec-core/ddd-tools";
import {
	type Alert,
	AlertError,
	type AlertProvider,
	type AlertSendResult,
	AlertSeverity,
} from "../types";

/**
 * Mentions to apply to a Discord alert.
 *
 * Mentions are placed in the `content` field of the webhook payload
 * (mentions inside embeds do not trigger notifications) and the
 * `allowed_mentions` field is set explicitly to bypass webhook
 * default restrictions.
 */
export interface DiscordMentions {
	/** Discord user IDs (snowflakes) → rendered as <@id> */
	users?: string[];
	/** Discord role IDs (snowflakes) → rendered as <@&id> */
	roles?: string[];
	/** Render @everyone (notifies the whole server) */
	everyone?: boolean;
	/** Render @here (notifies online members of the channel) */
	here?: boolean;
}

/**
 * Per-send options for the DiscordProvider.
 */
export interface DiscordSendOptions {
	/**
	 * Override the static `mentionsBySeverity` config for this send.
	 * The override fully replaces the static config — passing
	 * `mentions: {}` is a valid way to opt out of static mentions.
	 */
	mentions?: DiscordMentions;
}

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
	/**
	 * Static mentions per severity. Used when no per-send override
	 * is provided. For batched alerts, the highest severity wins
	 * (CRITICAL > HIGH > MEDIUM > LOW).
	 */
	mentionsBySeverity?: Partial<Record<AlertSeverity, DiscordMentions>>;
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
 * Severity ranking used to resolve mentions for batched alerts.
 * Higher = more critical.
 */
const SEVERITY_RANK: Record<AlertSeverity, number> = {
	[AlertSeverity.CRITICAL]: 4,
	[AlertSeverity.HIGH]: 3,
	[AlertSeverity.MEDIUM]: 2,
	[AlertSeverity.LOW]: 1,
};

/**
 * Discord alert provider using webhooks
 */
export class DiscordProvider implements AlertProvider<DiscordSendOptions> {
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

	async send(
		alert: Alert,
		options?: DiscordSendOptions,
	): Promise<Result<AlertSendResult, AlertError>> {
		return this.sendBatch([alert], options);
	}

	async sendBatch(
		alerts: Alert[],
		options?: DiscordSendOptions,
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
		const mentions = this.resolveMentions(alerts, options);
		const payload = this.createPayload(embeds, mentions);

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

	private createPayload(
		embeds: DiscordEmbed[],
		mentions: DiscordMentions | undefined,
	): DiscordWebhookPayload {
		const payload: DiscordWebhookPayload = {
			username: this.config.username ?? "Alert Bot",
			avatar_url: this.config.avatarUrl,
			embeds: embeds.slice(0, 10), // Discord allows max 10 embeds per message
		};

		if (mentions) {
			const content = renderMentionsContent(mentions);
			if (content) {
				payload.content = content;
				payload.allowed_mentions = buildAllowedMentions(mentions);
			}
		}

		return payload;
	}

	private resolveMentions(
		alerts: Alert[],
		options: DiscordSendOptions | undefined,
	): DiscordMentions | undefined {
		// Per-alert override (even an empty object explicitly opts out
		// of the static config).
		if (options?.mentions !== undefined) {
			return options.mentions;
		}

		const map = this.config.mentionsBySeverity;
		if (!map) {
			return undefined;
		}

		const severity = highestSeverity(alerts);
		if (!severity) {
			return undefined;
		}

		return map[severity];
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
 * Pick the highest-severity alert from a batch (CRITICAL > HIGH > MEDIUM > LOW).
 * Returns undefined for an empty batch.
 */
function highestSeverity(alerts: Alert[]): AlertSeverity | undefined {
	let best: AlertSeverity | undefined;
	let bestRank = 0;
	for (const alert of alerts) {
		const rank = SEVERITY_RANK[alert.severity] ?? 0;
		if (rank > bestRank) {
			bestRank = rank;
			best = alert.severity;
		}
	}
	return best;
}

/**
 * Build the `content` string for mentions. Order: @everyone, @here,
 * roles, users. Returns an empty string if nothing is requested.
 */
function renderMentionsContent(mentions: DiscordMentions): string {
	const parts: string[] = [];
	if (mentions.everyone) parts.push("@everyone");
	if (mentions.here) parts.push("@here");
	if (mentions.roles) {
		for (const id of mentions.roles) parts.push(`<@&${id}>`);
	}
	if (mentions.users) {
		for (const id of mentions.users) parts.push(`<@${id}>`);
	}
	return parts.join(" ");
}

/**
 * Build the `allowed_mentions` object that whitelists exactly what
 * we want Discord to actually notify. Required because webhooks may
 * silently drop pings that aren't explicitly allowed.
 */
function buildAllowedMentions(
	mentions: DiscordMentions,
): DiscordAllowedMentions {
	const allowed: DiscordAllowedMentions = {
		users: mentions.users ?? [],
		roles: mentions.roles ?? [],
	};
	if (mentions.everyone || mentions.here) {
		allowed.parse = ["everyone"];
	}
	return allowed;
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

interface DiscordAllowedMentions {
	parse?: Array<"everyone" | "users" | "roles">;
	users?: string[];
	roles?: string[];
}

interface DiscordWebhookPayload {
	username?: string;
	avatar_url?: string;
	content?: string;
	embeds: DiscordEmbed[];
	allowed_mentions?: DiscordAllowedMentions;
}
