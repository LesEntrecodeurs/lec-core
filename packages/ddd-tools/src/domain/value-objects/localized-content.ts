import { z } from "zod/v4";
import { Err, Ok, type Result } from "../../application";
import { NotFoundError, ValueObjectValidationError } from "../../errors";
import { ValueObject } from "../value-object";

export const LocalizedKey = z
	.string()
	.min(2, "Language code must be at least 2 characters long");
export type LocalizedKey = z.infer<typeof LocalizedKey>;

export const LocalizedValue = z.string();
export type LocalizedValue = z.infer<typeof LocalizedValue>;

export const LocalizedContentPropsSchema = z.record(
	LocalizedKey,
	LocalizedValue,
);

export type LocalizedContentProps = z.infer<typeof LocalizedContentPropsSchema>;

export interface LocalizedContentSnapshot {
	[key: string]: string;
}

export class TranslationNotFoundError extends NotFoundError {
	constructor(language: string) {
		super(`Translation not found for language: ${language}`);
	}
}

export class LocalizedContent extends ValueObject<LocalizedContentProps> {
	private readonly translations: Map<string, string>;
	constructor(props: LocalizedContentProps) {
		super(props);
		this.translations = new Map<string, string>(Object.entries(props));
	}

	get snapshot(): Record<string, string> {
		return Object.fromEntries(
			this.translations.entries(),
		) as LocalizedContentSnapshot;
	}

	getLanguages() {
		return Array.from(this.translations.keys());
	}

	getTranslation(language: string): string | undefined {
		return this.translations.get(language);
	}

	getOrFallback(language: string, fallbackLanguage: string): string {
		return (
			this.getTranslation(language) ??
			this.getTranslation(fallbackLanguage) ??
			""
		);
	}

	hasTranslation(language: string): boolean {
		return this.translations.has(language);
	}

	addTranslation(
		language: string,
		translation: string,
	): Result<void, ValueObjectValidationError> {
		const keyResult = LocalizedKey.safeParse(language);
		if (!keyResult.success) {
			return Err.of(new ValueObjectValidationError(keyResult.error.issues));
		}

		const valueResult = LocalizedValue.safeParse(translation);
		if (!valueResult.success) {
			return Err.of(new ValueObjectValidationError(valueResult.error.issues));
		}

		this.translations.set(keyResult.data, valueResult.data);

		return Ok.of(undefined);
	}

	removeTranslation(language: string): Result<void, TranslationNotFoundError> {
		if (!this.hasTranslation(language)) {
			return Err.of(new TranslationNotFoundError(language));
		}

		this.translations.delete(language);

		return Ok.of(undefined);
	}

	static create(
		props: LocalizedContentProps,
	): Result<LocalizedContent, ValueObjectValidationError> {
		const result = LocalizedContentPropsSchema.safeParse(props);

		if (!result.success) {
			return Err.of(new ValueObjectValidationError(result.error.issues));
		}

		return Ok.of(new LocalizedContent(result.data));
	}
}
