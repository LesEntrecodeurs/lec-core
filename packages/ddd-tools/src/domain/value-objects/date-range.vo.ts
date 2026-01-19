import z from "zod/v4";
import { Err, Ok, type Result } from "../../application";
import { ErrorBase, ValueObjectValidationError } from "../../errors";
import { ValueObject } from "../value-object";

export class InvalidDateRangeError extends ErrorBase {
	readonly code = "INVALID_DATE_RANGE";
	constructor() {
		super('Invalid date range: "from" date must be before "to" date.');
	}
}

const DateRangePropsSchema = z.object({
	from: z.date(),
	to: z.date(),
});

export type DateRangeProps = z.infer<typeof DateRangePropsSchema>;

export interface DateRangeSnapshot {
	from: Date;
	to: Date;
}

export class DateRange extends ValueObject<DateRangeProps> {
	get from(): Date {
		return this.props.from;
	}

	get to(): Date {
		return this.props.to;
	}

	get snapshot(): DateRangeSnapshot {
		return {
			from: this.props.from,
			to: this.props.to,
		};
	}

	static create(
		props: DateRangeProps,
	): Result<DateRange, ValueObjectValidationError> {
		if (props.from > props.to) {
			return Err.of(new ValueObjectValidationError([InvalidDateRangeError]));
		}
		const result = DateRangePropsSchema.safeParse(props);

		if (!result.success) {
			return Err.of(new ValueObjectValidationError(result.error.issues));
		}

		return Ok.of(new DateRange(result.data));
	}

	startSameDayAs(date: Date): boolean {
		return (
			this.props.from.getDate() === date.getDate() &&
			this.props.from.getMonth() === date.getMonth() &&
			this.props.from.getFullYear() === date.getFullYear()
		);
	}

	contains(other: DateRange): boolean {
		return (
			this.props.from <= other.props.from && this.props.to >= other.props.to
		);
	}

	overlaps(other: DateRange): boolean {
		return this.props.from < other.props.to && this.props.to > other.props.from;
	}

	durationInDays() {
		const msInDay = 1000 * 60 * 60 * 24;

		return Math.ceil(
			(this.props.to.getTime() - this.props.from.getTime()) / msInDay,
		);
	}

	durationInHours() {
		const msInHour = 1000 * 60 * 60;

		return Math.ceil(
			(this.props.to.getTime() - this.props.from.getTime()) / msInHour,
		);
	}
}
