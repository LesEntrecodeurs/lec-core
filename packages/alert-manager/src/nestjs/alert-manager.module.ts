import { type DynamicModule, Global, Module } from "@nestjs/common";
import type { AlertManagerConfig } from "../alert-manager";
import { AlertManagerService } from "./alert-manager.service";
import { ALERT_MANAGER_OPTIONS } from "./constants";
import type { AlertManagerModuleAsyncOptions } from "./interfaces";

@Global()
@Module({})
export class AlertManagerModule {
	static forRoot(options: AlertManagerConfig): DynamicModule {
		return {
			module: AlertManagerModule,
			providers: [
				{ provide: ALERT_MANAGER_OPTIONS, useValue: options },
				AlertManagerService,
			],
			exports: [AlertManagerService],
		};
	}

	static forRootAsync(options: AlertManagerModuleAsyncOptions): DynamicModule {
		return {
			module: AlertManagerModule,
			imports: options.imports || [],
			providers: [
				{
					provide: ALERT_MANAGER_OPTIONS,
					useFactory: options.useFactory,
					inject: options.inject || [],
				},
				AlertManagerService,
			],
			exports: [AlertManagerService],
		};
	}
}
