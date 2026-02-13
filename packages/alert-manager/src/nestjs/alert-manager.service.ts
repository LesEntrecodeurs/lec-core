import type { Result } from "@lec-core/ddd-tools";
import {
	Inject,
	Injectable,
	type OnModuleDestroy,
	type OnModuleInit,
} from "@nestjs/common";
import {
	AlertManager,
	type AlertManagerConfig,
	type MultiProviderResult,
} from "../alert-manager";
import { FailureDetector } from "../failure-detector";
import type { Alert, AlertError } from "../types";
import { ALERT_MANAGER_OPTIONS } from "./constants";

@Injectable()
export class AlertManagerService implements OnModuleInit, OnModuleDestroy {
	constructor(
		@Inject(ALERT_MANAGER_OPTIONS)
		private readonly options: AlertManagerConfig,
	) {}

	onModuleInit() {
		AlertManager.initialize(this.options);
	}

	onModuleDestroy() {
		AlertManager.reset();
	}

	async sendAlert(
		alert: Alert,
		options?: { providers?: string[] },
	): Promise<Result<MultiProviderResult, AlertError>> {
		return AlertManager.getInstance().sendAlert(alert, options);
	}

	async sendAlerts(
		alerts: Alert[],
		options?: { providers?: string[] },
	): Promise<Result<MultiProviderResult, AlertError>> {
		return AlertManager.getInstance().sendAlerts(alerts, options);
	}

	async trackFailure(
		jobId: string,
		workerName: string,
		error: string,
	): Promise<void> {
		return FailureDetector.getInstance().trackJobFailure(
			jobId,
			workerName,
			error,
		);
	}

	getInstance(): AlertManager {
		return AlertManager.getInstance();
	}

	getFailureDetector(): FailureDetector {
		return FailureDetector.getInstance();
	}
}
