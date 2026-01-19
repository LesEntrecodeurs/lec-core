export class ApiErrorResponse {
	readonly statusCode: number;

	readonly code?: string;

	readonly message: string;

	readonly error: string;

	readonly subErrors?: string[];

	constructor(body: ApiErrorResponse) {
		this.statusCode = body.statusCode;
		this.message = body.message;
		this.error = body.error;
		this.subErrors = body.subErrors;
		this.code = body.code;
	}
}
