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
async function getDB(options) {
  let dbPath = await getDefaultDBPath(options);

  await makeDBFolderIfNotExists(dbPath.folder);

  const db = new Database(dbPath.fullDbPath, { ...options.sqliteOptions, fileMustExist: false } );
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
 * 
 * @param {string} folder 
 */
async function makeDBFolderIfNotExists(folder) {
  const fs = await import('node:fs/promises');

  const exists = await (async () => {
    try {
      await fs.stat(folder);
      return true;
    } catch (error) {
      return false;
    }
  })()
  if (exists) return;

  await fs.mkdir(folder, { recursive: true });
}

/**
 * Get the default path for the database.
 * @param {Pick<import('./types').InitDBOptions, 'databaseName' | 'applicationName' | 'path'>} options 
 * @returns {Promise<{ folder: string, fullDbPath: string }>}
 */
async function getDefaultDBPath(options) {
  const path = await import('node:path');

  if (options.path) {
    const folder = path.dirname(options.path);

    return {
      folder: folder,
      fullDbPath: options.path,
    };
  }

  const envPaths = (await import('env-paths')).default

  const appFolder = envPaths(options.applicationName).data;

  const normalizedDatabaseName = options.databaseName.replace(
    '.sqlite',
    ''
  ) + '.sqlite';

  return {
    folder: appFolder,
    fullDbPath: path.join(appFolder, normalizedDatabaseName),
  };
}

module.exports = {
  getDB,
  getDefaultDBPath,
}