const { runMigrations } = require('./migrator');
const Database = require('better-sqlite3');
const { Kysely, SqliteDialect, CamelCasePlugin } = require('kysely');

/**
 * Create or open an existing database.
 * All migrations will be run when the database is opened.
 * @template DB
 * @param {import('./types').InitDBOptions} options
 * @returns {Promise<import('kysely').Kysely<DB>>}
 */
module.exports.getDB = async function getDB(options) {
  let dbPath = options.path ?? await getDefaultDBPath(options);

  const db = new Database(dbPath, options.sqliteOptions);
  const kysely = new Kysely({
    dialect: new SqliteDialect({
      database: db,
    }),
    ...options.kyselyOptions,
    plugins: getPlugins(options),
  });

  await runMigrations(kysely, options.migrations);

  return kysely;
}

/**
 * Mix the users plugin with our required camel case plugin
 * @param {import('./types').InitDBOptions} options 
 * @returns {import('kysely').KyselyPlugin[]}
 */
function getPlugins(options) {
  const userProvidedPlugins = options.kyselyOptions?.plugins ?? [];
  
  const userProvidedPluginsWithoutCamelCase = userProvidedPlugins?.filter(plugin => plugin instanceof CamelCasePlugin);

  return [ ...userProvidedPluginsWithoutCamelCase, new CamelCasePlugin() ];
}

/**
 * Get the default path for the database.
 * @param {Pick<import('./types').InitDBOptions, 'databaseName' | 'applicationName'>} options 
 * @returns {Promise<string>}
 */
async function getDefaultDBPath(options) {
  const path = await import('node:path');
  const envPaths = (await import('env-paths')).default

  const appFolder = envPaths(options.applicationName).data;

  const normalizedDatabaseName = options.databaseName.replace(
    '.sqlite',
    ''
  ) + '.sqlite';

  return path.join(appFolder, normalizedDatabaseName);
}