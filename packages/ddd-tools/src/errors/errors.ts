import { ErrorBase } from "./error.base";
import {
	ARGUMENT_INVALID,
	ARGUMENT_NOT_PROVIDED,
	ARGUMENT_OUT_OF_RANGE,
	CONFLICT,
	INTERNAL_SERVER_ERROR,
	NOT_FOUND,
	UNKNOWN_ERROR,
} from "./error.codes";

/**
 * Used to indicate that an incorrect argument was provided to a method/function/class constructor
 *
 * @class ArgumentInvalidError
 * @extends {ErrorBase}
 */
export class ArgumentInvalidError extends ErrorBase {
	readonly code = ARGUMENT_INVALID;
}

/**
 * Used to indicate that an argument was not provided (is empty object/array, null of undefined).
 *
 * @class ArgumentNotProvidedError
 * @extends {ErrorBase}
 */
export class ArgumentNotProvidedError extends ErrorBase {
	readonly code = ARGUMENT_NOT_PROVIDED;
}

/**
 * Used to indicate that an argument is out of allowed range
 * (for example: incorrect string/array length, number not in allowed min/max range etc)
 *
 * @class ArgumentOutOfRangeError
 * @extends {ErrorBase}
 */
export class ArgumentOutOfRangeError extends ErrorBase {
	readonly code = ARGUMENT_OUT_OF_RANGE;
}

/**
 * Used to indicate conflicting entities (usually in the database)
 *
 * @class ConflictError
 * @extends {ErrorBase}
 */
export class ConflictError extends ErrorBase {
	readonly code = CONFLICT;
}

/**
 * Used to indicate that entity is not found
 *
 * @class NotFoundError
 * @extends {ErrorBase}
 */
export class NotFoundError extends ErrorBase {
	static readonly message = "Not found";
	readonly code = NOT_FOUND;

	constructor(message = NotFoundError.message) {
		super(message);
	}
}

/**
 * Used to indicate an internal server error that does not fall under all other errors
 *
 * @class InternalServerErrorError
 * @extends {ErrorBase}
 */
export class InternalServerError extends ErrorBase {
	static readonly message = "Internal server error";
	readonly code = INTERNAL_SERVER_ERROR;

	constructor(message = InternalServerError.message) {
		super(message);
	}
}

export class UnknownError extends ErrorBase {
	static readonly message = "Unknown error";
	readonly code = UNKNOWN_ERROR;

	constructor(message = UnknownError.message, metadata?: any) {
		super(message, undefined, metadata);
	}
}

export class UnauthorizedError extends ErrorBase {
	static readonly message = "Unauthorized";
	readonly code = "UNAUTHORIZED";

	constructor(message = UnauthorizedError.message) {
		super(message);
	}
}

export class EntityValidationError extends ErrorBase {
	static readonly message = "Entity validation error";
	readonly code = "ENTITY_VALIDATION_ERROR";
	constructor(
		public errors: any[],
		message = EntityValidationError.message,
	) {
		super(message, undefined, { subErrors: errors });
	}
}

export class ValueObjectValidationError extends ErrorBase {
	static readonly message = "Value Object validation error";
	readonly code = "VALUE_OBJECT_VALIDATION_ERROR";
	constructor(
		public errors: any[],
		message = ValueObjectValidationError.message,
	) {
		super(message, undefined, { subErrors: errors });
	}
}

export class MapperError extends ErrorBase {
	readonly code = "MAPPER_ERROR";
	constructor(
		readonly message: string,
		readonly source?: ErrorBase,
	) {
		super(message, source);
	}
}
