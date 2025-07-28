const { Migrator } = require('kysely');

/**
 * This is already auto ran when DB is opened/created
 * You probably don't need to run this manually
 * it may have breaking changes in the future
 * @internal
 * @param {import('kysely').Kysely<any>} db
 * @param {import('./types').Migration[]} migrations
 * @returns {Promise<void>}
 */
module.exports.runMigrations = async function runMigrations(db, migrations) {
  const migrationProvider = createMigrationProvider(migrations);

  const migrator = new Migrator({
    db,
    provider: migrationProvider,
  });

  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
}


/**
 * @typedef {import('kysely').Migration} KyselyMigration
 */

/**
 * @param {import('./types').Migration[]} migrations
 * @returns {import('kysely').MigrationProvider}
 */
function createMigrationProvider(migrations) {
  /**
   * @type {Record<string, KyselyMigration>}
   */
  const mappedMigrations = migrations.reduce((acc, migration) => {
    acc[migration.name] = migration;
    return acc;
  }, /**
   * @type {Record<string, KyselyMigration>}
   */
  ({}));

  return {
    getMigrations: () => Promise.resolve(mappedMigrations),
  }
}