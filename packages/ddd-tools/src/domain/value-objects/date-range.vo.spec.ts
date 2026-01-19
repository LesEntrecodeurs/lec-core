import { DateRange } from "./date-range.vo";

describe("Date range VO", () => {
	describe("overlaps", () => {
		test("should return true if date ranges overlap", () => {
			const dateRange1 = new DateRange({
				from: new Date("2023-01-01"),
				to: new Date("2023-01-10"),
			});
			const dateRange2 = new DateRange({
				from: new Date("2023-01-05"),
				to: new Date("2023-01-15"),
			});

			expect(dateRange1.overlaps(dateRange2)).toBe(true);
		});

		test("should return false if date ranges do not overlap", () => {
			const dateRange1 = new DateRange({
				from: new Date("2023-01-01"),
				to: new Date("2023-01-10"),
			});
			const dateRange2 = new DateRange({
				from: new Date("2023-01-11"),
				to: new Date("2023-01-20"),
			});

			expect(dateRange1.overlaps(dateRange2)).toBe(false);
		});

		test("should work with date on same day but different times", () => {
			const dateRange1 = new DateRange({
				from: new Date("2023-01-01T10:00:00"),
				to: new Date("2023-01-01T12:00:00"),
			});
			const dateRange2 = new DateRange({
				from: new Date("2023-01-01T11:00:00"),
				to: new Date("2023-01-01T13:00:00"),
			});

			expect(dateRange1.overlaps(dateRange2)).toBe(true);
		});

		test("should return false is date ranges are following each other", () => {
			const dateRange1 = new DateRange({
				from: new Date("2023-01-01T10:00:00"),
				to: new Date("2023-01-01T12:00:00"),
			});
			const dateRange2 = new DateRange({
				from: new Date("2023-01-01T12:00:00"),
				to: new Date("2023-01-01T13:00:00"),
			});

			expect(dateRange1.overlaps(dateRange2)).toBe(false);
		});
	});

	describe("startSameDayAs", () => {
		test("should return true if start dates are the same", () => {
			const dateRange1 = new DateRange({
				from: new Date("2023-01-01"),
				to: new Date("2023-01-10"),
			});

			expect(dateRange1.startSameDayAs(new Date("2023-01-01"))).toBe(true);
		});

		test("should return false if start dates are different", () => {
			const dateRange1 = new DateRange({
				from: new Date("2023-01-01"),
				to: new Date("2023-01-10"),
			});

			expect(dateRange1.startSameDayAs(new Date("2023-01-02"))).toBe(false);
		});

		test("should work with different times on the same day", () => {
			const dateRange1 = new DateRange({
				from: new Date("2023-01-01T10:00:00"),
				to: new Date("2023-01-01T12:00:00"),
			});

			expect(dateRange1.startSameDayAs(new Date("2023-01-01T11:00:00"))).toBe(
				true,
			);
		});
	});

	describe("contains", () => {
		test("should return true if date range contains another date range", () => {
			const dateRange1 = new DateRange({
				from: new Date("2023-01-01"),
				to: new Date("2023-01-10"),
			});
			const dateRange2 = new DateRange({
				from: new Date("2023-01-05T10:00:00"),
				to: new Date("2023-01-07T11:00:00"),
			});

			expect(dateRange1.contains(dateRange2)).toBe(true);
		});

		test("should return false if date range does not contain another date range", () => {
			const dateRange1 = new DateRange({
				from: new Date("2023-01-01"),
				to: new Date("2023-01-10"),
			});
			const dateRange2 = new DateRange({
				from: new Date("2023-01-09"),
				to: new Date("2023-01-11"),
			});

			expect(dateRange1.contains(dateRange2)).toBe(false);
		});

		test("should return true if date range is equal", () => {
			const dateRange1 = new DateRange({
				from: new Date("2023-01-01T00:00:00Z"),
				to: new Date("2023-01-10T23:59:59Z"),
			});
			const dateRange2 = new DateRange({
				from: new Date("2023-01-01T00:00:00Z"),
				to: new Date("2023-01-02T23:59:59Z"),
			});

			expect(dateRange1.contains(dateRange2)).toBe(true);
		});
	});
});
