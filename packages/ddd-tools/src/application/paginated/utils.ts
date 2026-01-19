import type { PaginatedQuery } from "./filters";

export const paginatedQueryToQueryString = (query: PaginatedQuery) => {
	let queryString = `page=${query.page}&limit=${query.limit}`;

	if (query.orderBy?.length) {
		queryString += `&orderBy=${JSON.stringify(query.orderBy)}`;
	}

	if (query.filters?.length) {
		queryString += `&filters=${JSON.stringify(query.filters)}`;
	}

	if (query.search) {
		queryString += `&search=${query.search}`;
	}

	return queryString;
};
