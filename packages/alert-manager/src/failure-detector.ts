import { AlertManager } from "./alert-manager";
import { ALERT_THRESHOLDS, AlertSeverity, AlertType } from "./types";

/**
 * Tracks job failures per worker and triggers alerts when thresholds are exceeded
 */
export class FailureDetector {
	private static instance: FailureDetector;

	/** Map of worker name to array of failure timestamps */
	private failureHistory: Map<string, Date[]> = new Map();

	/** Private constructor for singleton pattern */
	private constructor() {}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): FailureDetector {
		if (!FailureDetector.instance) {
			FailureDetector.instance = new FailureDetector();
		}
		return FailureDetector.instance;
	}

	/**
	 * Track a job failure and check if alert threshold is exceeded
	 * @param jobId Job ID that failed
	 * @param workerName Worker name
	 * @param error Error that caused the failure
	 */
	public async trackJobFailure(
		jobId: string,
		workerName: string,
		error: string,
	): Promise<void> {
		const now = new Date();

		// Get or create failure history for this worker
		const failures = this.failureHistory.get(workerName) || [];

		// Add current failure
		failures.push(now);

		// Clean up old failures outside time window
		const timeWindowMs = ALERT_THRESHOLDS.timeWindowMinutes * 60 * 1000;
		const cutoffTime = new Date(now.getTime() - timeWindowMs);

		const recentFailures = failures.filter(
			(timestamp) => timestamp >= cutoffTime,
		);

		// Update history with only recent failures
		this.failureHistory.set(workerName, recentFailures);

		console.info(
			{
				workerName,
				jobId,
				recentFailureCount: recentFailures.length,
				threshold: ALERT_THRESHOLDS.failuresInWindow,
				timeWindowMinutes: ALERT_THRESHOLDS.timeWindowMinutes,
			},
			"job failure tracked",
		);

		// Check if threshold exceeded
		if (recentFailures.length >= ALERT_THRESHOLDS.failuresInWindow) {
			console.warn(
				{
					workerName,
					failureCount: recentFailures.length,
					threshold: ALERT_THRESHOLDS.failuresInWindow,
				},
				"failure threshold exceeded, sending alert",
			);

			// Send REPEATED_FAILURES alert
			await AlertManager.getInstance().sendAlert({
				type: AlertType.REPEATED_FAILURES,
				severity: AlertSeverity.HIGH,
				workerName,
				timestamp: now,
				context: {
					failureCount: recentFailures.length,
					timeWindowMinutes: ALERT_THRESHOLDS.timeWindowMinutes,
					jobId,
					error,
				},
				message: `${workerName} has ${recentFailures.length} failures in ${ALERT_THRESHOLDS.timeWindowMinutes} minutes (threshold: ${ALERT_THRESHOLDS.failuresInWindow})`,
			});

			// Reset counter after alerting to avoid spam
			this.failureHistory.set(workerName, []);

			console.info(
				{
					workerName,
					failureCount: recentFailures.length,
				},
				"failure counter reset after alert",
			);
		}
	}

	/**
	 * Get current failure count for a worker within the time window
	 * @param workerName Worker name
	 * @returns Number of failures in time window
	 */
	public getFailureCount(workerName: string): number {
		const failures = this.failureHistory.get(workerName) || [];

		// Clean up old failures
		const timeWindowMs = ALERT_THRESHOLDS.timeWindowMinutes * 60 * 1000;
		const cutoffTime = new Date(Date.now() - timeWindowMs);

		const recentFailures = failures.filter(
			(timestamp) => timestamp >= cutoffTime,
		);

		return recentFailures.length;
	}

	/**
	 * Reset failure history for a worker
	 * @param workerName Worker name
	 */
	public resetFailureHistory(workerName: string): void {
		this.failureHistory.delete(workerName);
		console.info({ workerName }, "failure history reset");
	}

	/**
	 * Clear all failure history (useful for testing)
	 */
	public clearAll(): void {
		this.failureHistory.clear();
		console.info("all failure history cleared");
	}
}
