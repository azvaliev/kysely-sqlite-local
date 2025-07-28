import type { Kysely, KyselyConfig, CamelCasePlugin } from "kysely";
import { Options as SQLiteOptions } from "better-sqlite3";

export interface InitDBOptions {
  /**
   * This should be a stable name for the database.
   */
  databaseName: string;
  /**
   * Identifier for your application, if you have multiple DBs they'll be in the same directory.
   */
  applicationName: string;
  /**
   * The default path is using the name of the database + application name.
   * In the `env-paths` library https://www.npmjs.com/package/env-paths#usage
   * @see {getDefaultDBPath}
   */
  path?: string;
  /**
   * Migrations to run when the database is opened
   */
  migrations: Array<Migration>;

  /**
   * Extra options for kysely.
   * Camel Case Plugin is enabled already
   * @see {@link CamelCasePlugin}
   */
  kyselyOptions?: Omit<KyselyConfig, 'dialect'>;

  /**
   * Extra options for SQLite
   */
  sqliteOptions?: SQLiteOptions;
}

export interface Migration {
  name: string;
  up: (db: Kysely<any>) => Promise<void>;
  down: (db: Kysely<any>) => Promise<void>;
}