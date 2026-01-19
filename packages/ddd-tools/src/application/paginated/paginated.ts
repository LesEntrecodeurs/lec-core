import type { Filter, OrderBy } from "./filters";

export class Paginated<T, U = undefined> {
	readonly count: number;
	readonly limit: number;
	readonly page: number;
	readonly data: readonly T[];
	readonly metadata?: U;

	constructor(props: Omit<Paginated<T, U>, "metadata"> & { metadata?: U }) {
		this.count = props.count;
		this.limit = props.limit;
		this.page = props.page;
		this.data = props.data;
		this.metadata = props.metadata as U;
	}
}

export type PaginatedQueryParams = {
	limit: number;
	page: number;
	offset: number;
	orderBy?: OrderBy[];
	filters?: Filter[];
	search?: string;
};
