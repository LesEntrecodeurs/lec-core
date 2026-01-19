export abstract class Entity<T extends { id: U }, U = string | number> {
	protected constructor(protected _props: T) {}

	get id(): U {
		return this._props.id;
	}

	equals(obj: Entity<T, U>): boolean {
		return !!obj && this._props.id === obj._props.id;
	}
}
