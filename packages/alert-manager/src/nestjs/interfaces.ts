import type { ModuleMetadata } from "@nestjs/common";
import type { AlertManagerConfig } from "../alert-manager";

export interface AlertManagerModuleAsyncOptions
	extends Pick<ModuleMetadata, "imports"> {
	inject?: any[];
	useFactory: (
		...args: any[]
	) => AlertManagerConfig | Promise<AlertManagerConfig>;
}
