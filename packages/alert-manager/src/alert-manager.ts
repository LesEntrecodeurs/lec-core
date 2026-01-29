import { Err, Ok, type Result } from "@lec-packages/ddd-tools";
import {
	type Alert,
	AlertError,
	type AlertProvider,
	type AlertSendResult,
} from "./types";

/**
 * Configuration for AlertManager
 */
export interface AlertManagerConfig {
	/** Alert providers to use */
	providers: AlertProvider[];
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
 * Result of sending alerts to multiple providers
 */
export interface MultiProviderResult {
	successful: AlertSendResult[];
	failed: Array<{ provider: string; error: AlertError }>;
}

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
 * AlertManager - handles sending alerts via multiple providers
 *
 * @example
 * ```typescript
 * import { AlertManager } from "./alert-manager";
 * import { EmailProvider, DiscordProvider } from "./providers";
 *
 * // Initialize with multiple providers
 * AlertManager.initialize({
 *   providers: [
 *     new EmailProvider({
 *       smtp: { host: "smtp.gmail.com", port: 587, auth: { user: "...", pass: "..." } },
 *       fromEmail: "alerts@company.com",
 *       toEmail: "admin@company.com",
 *     }),
 *     new DiscordProvider({
 *       webhookUrl: "https://discord.com/api/webhooks/...",
 *       username: "Alert Bot",
 *     }),
 *   ],
 *   thresholds: {
 *     failuresInWindow: 5,
 *     timeWindowMinutes: 10,
 *   },
 * });
 *
 * // Send alert to all providers
 * await AlertManager.getInstance().sendAlert({
 *   type: AlertType.SYSTEM_ERROR,
 *   severity: AlertSeverity.CRITICAL,
 *   message: "Something went wrong",
 *   timestamp: new Date(),
 * });
 *
 * // Send to specific provider only
 * await AlertManager.getInstance().sendAlert(alert, { providers: ["discord"] });
 * ```
 */
export class AlertManager {
	private static instance: AlertManager | null = null;

	private readonly providers: Map<string, AlertProvider>;
	private readonly thresholdsConfig: Required<
		NonNullable<AlertManagerConfig["thresholds"]>
	>;
	private readonly debounceWindowMs: number;

	private constructor(config: AlertManagerConfig) {
		this.providers = new Map();
		for (const provider of config.providers) {
			this.providers.set(provider.name, provider);
		}

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
	 */
	static initialize(config: AlertManagerConfig): AlertManager {
		if (AlertManager.instance) {
			console.warn(
				"AlertManager already initialized, returning existing instance",
			);
			return AlertManager.instance;
		}

		if (config.providers.length === 0) {
			throw new Error("AlertManager requires at least one provider");
		}

		AlertManager.instance = new AlertManager(config);
		console.info(
			`AlertManager initialized with providers: ${config.providers.map((c) => c.name).join(", ")}`,
		);
		return AlertManager.instance;
	}

	/**
	 * Get the singleton instance
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
	 * Reset the singleton instance
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
	 * Get list of registered provider names
	 */
	get providerNames(): string[] {
		return Array.from(this.providers.keys());
	}

	/**
	 * Get a specific provider by name
	 */
	getProvider(name: string): AlertProvider | undefined {
		return this.providers.get(name);
	}

	/**
	 * Add a new provider at runtime
	 */
	addProvider(provider: AlertProvider): void {
		this.providers.set(provider.name, provider);
		console.info(`AlertManager: added provider "${provider.name}"`);
	}

	/**
	 * Remove a provider at runtime
	 */
	removeProvider(name: string): boolean {
		const provider = this.providers.get(name);
		if (provider) {
			provider.close();
			this.providers.delete(name);
			console.info(`AlertManager: removed provider "${name}"`);
			return true;
		}
		return false;
	}

	/**
	 * Send alert to all providers (or specific ones)
	 */
	async sendAlert(
		alert: Alert,
		options?: { providers?: string[] },
	): Promise<Result<MultiProviderResult, AlertError>> {
		return this.sendAlerts([alert], options);
	}

	/**
	 * Send multiple alerts to all providers (or specific ones)
	 */
	async sendAlerts(
		alerts: Alert[],
		options?: { providers?: string[] },
	): Promise<Result<MultiProviderResult, AlertError>> {
		const firstAlert = alerts[0];

		if (!firstAlert) {
			return Err.of(
				new AlertError("No alerts to send", {
					alertType: "UNKNOWN",
					recipient: "all",
				}),
			);
		}

		const targetProviders = this.getTargetProviders(options?.providers);

		if (targetProviders.length === 0) {
			return Err.of(
				new AlertError("No valid providers found", {
					alertType: firstAlert.type,
					recipient: "none",
					context: `Requested: ${options?.providers?.join(", ") ?? "all"}`,
				}),
			);
		}

		const results: MultiProviderResult = {
			successful: [],
			failed: [],
		};

		// Send to all providers in parallel
		const promises = targetProviders.map(async (provider) => {
			const result = await provider.sendBatch(alerts);

			if (result.isOk()) {
				results.successful.push(result.value);
			} else {
				results.failed.push({ provider: provider.name, error: result.error });
			}
		});

		await Promise.all(promises);

		// Log results
		if (results.successful.length > 0) {
			console.info(
				`Alert sent successfully to: ${results.successful.map((r) => r.provider).join(", ")}`,
			);
		}

		if (results.failed.length > 0) {
			console.error(
				`Alert failed for providers: ${results.failed.map((f) => f.provider).join(", ")}`,
			);
		}

		// Return error only if ALL providers failed
		if (results.successful.length === 0) {
			return Err.of(
				new AlertError("Failed to send alert to any provider", {
					alertType: firstAlert.type,
					recipient: "all",
					context: results.failed.map((f) => ({
						provider: f.provider,
						error: f.error.message,
					})),
				}),
			);
		}

		return Ok.of(results);
	}

	/**
	 * Verify all providers connections
	 */
	async verifyProviders(): Promise<Map<string, boolean>> {
		const results = new Map<string, boolean>();

		for (const [name, provider] of this.providers) {
			const isConnected = await provider.verify();
			results.set(name, isConnected);
		}

		return results;
	}

	/**
	 * Close all providers
	 */
	close(): void {
		for (const provider of this.providers.values()) {
			provider.close();
		}
		this.providers.clear();
	}

	private getTargetProviders(providerNames?: string[]): AlertProvider[] {
		if (!providerNames || providerNames.length === 0) {
			return Array.from(this.providers.values());
		}

		return providerNames
			.map((name) => this.providers.get(name))
			.filter((provider): provider is AlertProvider => provider !== undefined);
	}
}
