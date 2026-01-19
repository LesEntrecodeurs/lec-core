/*  Most of repositories will probably need generic
    save/find/delete operations, so it's easier
    to have some shared interfaces.
    More specific queries should be defined
    in a respective repository.
*/
export abstract class RepositoryPort<Entity> {
	abstract save(entity: Entity): Promise<void>;
	abstract findById(id: string): Promise<Entity | null>;
	abstract findAll(): Promise<Entity[]>;
	abstract delete(entity: Entity): Promise<void>;
}
