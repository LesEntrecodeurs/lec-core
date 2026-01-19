import { Paginated } from "./paginated";

export abstract class PaginatedResponseDto<T, U = undefined> extends Paginated<
	T,
	U
> {
	abstract readonly data: readonly T[];
}
