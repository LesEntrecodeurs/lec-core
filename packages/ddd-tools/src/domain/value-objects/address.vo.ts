import z from "zod/v4";
import { Err, Ok, type Result } from "../../application";
import { ValueObjectValidationError } from "../../errors";
import { ValueObject } from "../value-object";

const AddressPropsSchema = z.object({
	street: z.string().min(1, "Street is required"),
	city: z.string().min(1, "City is required"),
	country: z.string().min(1, "Country is required"),
	postalCode: z.string().min(1, "Postal code is required"),
});

export type AddressProps = z.infer<typeof AddressPropsSchema>;

export interface AddressSnapshot {
	street: string;
	city: string;
	country: string;
	postalCode: string;
}

export class Address extends ValueObject<AddressProps> {
	static schema = AddressPropsSchema;

	get street(): string {
		return this.props.street;
	}

	get city(): string {
		return this.props.city;
	}

	get country(): string {
		return this.props.country;
	}

	get postalCode(): string {
		return this.props.postalCode;
	}

	get snapshot(): AddressSnapshot {
		return {
			street: this.street,
			city: this.city,
			country: this.country,
			postalCode: this.postalCode,
		};
	}

	static create(
		props: AddressProps,
	): Result<Address, ValueObjectValidationError> {
		const result = AddressPropsSchema.safeParse(props);

		if (!result.success) {
			return Err.of(new ValueObjectValidationError(result.error.issues));
		}

		return Ok.of(new Address(result.data));
	}

	toString() {
		return `${this.street}, ${this.postalCode} ${this.city}, ${this.country}`;
	}
}
