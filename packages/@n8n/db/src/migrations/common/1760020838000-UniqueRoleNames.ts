import type { Role } from '../../entities';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class UniqueRoleNames1760020838000 implements ReversibleMigration {
	async up({ isMysql, escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('role');
		const roleNames: Array<Pick<Role, 'displayName'>> = await runQuery(
			`SELECT displayName FROM ${tableName}`,
		);

		for (const { displayName } of roleNames) {
			const duplicates: Array<Pick<Role, 'slug' | 'displayName'>> = await runQuery(
				`SELECT slug, displayName FROM ${tableName} WHERE displayName = :displayName ORDER BY createdAt ASC`,
				{ displayName },
			);

			if (duplicates.length > 1) {
				await Promise.all(
					duplicates.map(async (role, index) => {
						if (index === 0) return;
						return await runQuery(
							`UPDATE ${tableName} SET displayName = :displayName WHERE slug = :slug`,
							{
								displayName: `${role.displayName} ${index + 1}`,
								slug: role.slug,
							},
						);
					}),
				);
			}
		}

		const indexName = escape.indexName('UniqueRoleDisplayName');
		await runQuery(
			isMysql
				? `ALTER TABLE ${tableName} ADD UNIQUE INDEX ${indexName} (${escape.columnName('displayName')})`
				: `CREATE UNIQUE INDEX ${indexName} ON ${tableName} ("displayName")`,
		);
	}

	async down({ isMysql, escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('role');
		const indexName = escape.indexName('UniqueRoleDisplayName');
		await runQuery(
			isMysql ? `ALTER TABLE ${tableName} DROP INDEX ${indexName}` : `DROP INDEX ${indexName}`,
		);
	}
}
