import z from "zod/v4";

const _FilterAssociation = {
	AND: "AND",
	OR: "OR",
} as const;

export const FilterAssociation = z.nativeEnum(_FilterAssociation);

const _FilterOp = {
	CONTAINS: "contains",
	EQUALS: "equals",
	IN: "in",
	SOME: "some",
	HAS: "has",
} as const;

export const FilterOp = z.nativeEnum(_FilterOp);

export const ContainsFilter = z.object({
	field: z.string(),
	operator: z.literal("contains"),
	value: z.string(),
});

export const EqualsFilter = z.object({
	field: z.string(),
	operator: z.literal("equals"),
	value: z.any(),
});

export const InFilter = z.object({
	field: z.string(),
	operator: z.literal("in"),
	value: z.array(z.any()),
});

export const SomeFilter = z.object({
	field: z.string(),
	operator: z.literal("some"),
	value: z.any(),
});

export const HasFilter = z.object({
	field: z.string(),
	operator: z.literal("has"),
	value: z.any(),
});

export const Filter = z.union([
	ContainsFilter,
	EqualsFilter,
	InFilter,
	SomeFilter,
	HasFilter,
]);
export type Filter = z.infer<typeof Filter>;

export const Filters = Filter.array();
export type Filters = z.infer<typeof Filters>;

export const OrderBy = z.object({
	field: z.string(),
	param: z.enum(["asc", "desc"]),
});
export type OrderBy = z.infer<typeof OrderBy>;

export const PaginatedQuery = z.object({
	page: z.number(),
	limit: z.number(),
	orderBy: z.array(OrderBy).optional(),
	filters: Filter.array().optional(),
	search: z.string().optional(),
});
export type PaginatedQuery = z.infer<typeof PaginatedQuery>;

export const LIMIT = [10, 25, 50, 100] as const;
export const Limit = z.literal([10, 25, 50, 100]);
export type Limit = z.infer<typeof Limit>;
