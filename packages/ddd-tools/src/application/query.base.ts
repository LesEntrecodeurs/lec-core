import type { Filter, OrderBy, PaginatedQueryParams } from "./paginated";

/**
 * Base class for regular queries
 */
export abstract class QueryBase {}

export abstract class PaginatedQueryBase extends QueryBase {
	limit: number;
	offset: number;
	orderBy?: OrderBy[];
	filters?: Filter[];
	search?: string;
	page: number;

	constructor(props: PaginatedParams<PaginatedQueryBase>) {
		super();
		this.limit = props.limit || 20;
		this.offset =
			props.page && props.page > 1 ? (props.page - 1) * this.limit : 0;
		this.page = props.page || 1;
		this.orderBy = props.orderBy;
		this.filters = props.filters;
		this.search = props.search;
	}
}

// Paginated query parameters
export type PaginatedParams<T> = Omit<
	T,
	"limit" | "offset" | "orderBy" | "page" | "filters"
> &
	Partial<Omit<PaginatedQueryParams, "offset">>;
