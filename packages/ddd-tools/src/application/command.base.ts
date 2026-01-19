import { v4 as uuidv4 } from "uuid";

export type CommandProps<T> = Omit<T, "id" | "metadata"> & Partial<Command>;

export type MetadataExecutor = "system" | "anonymous" | "user";

export type CommandMetadata = {
	/**
	 * Identity of the command executor. Can be useful for
	 * logging and tracking execution of commands and events
	 */
	readonly executor: MetadataExecutor;

	/**
	 * Time when the command occurred. Mostly for tracing purposes
	 */
	readonly timestamp: number;

	/**
	 * ID of a user who invoked the command. Can be useful for
	 * logging and tracking execution of commands and events
	 */
	readonly userId?: string;
};

export class Command {
	/**
	 * Command id, in case if we want to save it
	 * for auditing purposes and create a correlation/causation chain
	 */
	readonly id: string;

	readonly metadata: CommandMetadata;

	constructor(props: CommandProps<unknown>) {
		this.id = props.id || uuidv4();
		this.metadata = {
			executor: props?.metadata?.executor || "anonymous",
			timestamp: props?.metadata?.timestamp || Date.now(),
			userId: props?.metadata?.userId,
		};
	}
}
