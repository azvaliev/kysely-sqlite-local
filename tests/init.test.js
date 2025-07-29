import { expect, test, describe, beforeAll, afterAll} from 'vitest';
import { getDB, getDefaultDBPath } from '../index.js';
import { sql, Kysely } from 'kysely';
import * as fs from 'node:fs/promises';
import envPaths from 'env-paths';
import * as os from 'node:os'
import * as path from 'node:path';
import { SqliteError } from 'better-sqlite3';

const applicationName = 'test-init';

/**
 * @param {Kysely<any>} db 
 */
async function validateDBIsQueryable(db) {
  expect(db).toBeDefined();
  try {
    await sql`SELECT sqlite_version()`.execute(db);
  } catch (error) {
    console.error(error);
    expect(error, 'select version from newly created DB should not fail').not.toBeDefined();
  }
}

describe('DB Creation', () => {
  beforeAll(async () => {
    const appPaths = envPaths(applicationName);
    await Promise.all(Object.values(appPaths).map((p) => {
      return (async () => {
        try {
          await fs.rm(p, { recursive: true, force: true })
        } catch (error) {
          console.error('error removing app paths', error);
        }
      })()
    }))
  });

  describe('using automatic path', () => {
    test('can create a DB using the happy path', async () => {
      const db = await getDB({
        databaseName: 'test-init',
        applicationName,
        migrations: [],
      });

      await validateDBIsQueryable(db);

      await db.destroy();
    });

    test('it is OK if the db already exists', async () => {
      const dbName = 'testExisting';
      const applicationName = 'testExisting';

      {
        const db = await getDB({
          databaseName: dbName,
          applicationName,
          migrations: [],
        });

        await validateDBIsQueryable(db);

        await db.destroy();
      }

      const dbPath = await getDefaultDBPath({
        databaseName: dbName,
        applicationName,
      })

      const exists = await (async () => {
        try {
          await fs.stat(dbPath.fullDbPath);
          return true;
        } catch (error) {
          return false;
        }
      })()

      expect(exists, 'DB did not get created').toBe(true);

      {
        const db = await getDB({
          databaseName: dbName,
          applicationName,
          migrations: [],
        });

        await validateDBIsQueryable(db);

        await db.destroy();
      }
    });
  });

  describe('using custom path', () => {
    const customPath = path.join(os.tmpdir(), 'test-init.sqlite');
    
    afterAll(async () => {
      await fs.rm(customPath, { recursive: true, force: true });
    });

    test('can create a DB using the happy path', async () => {
      const db = await getDB({
        databaseName: 'test-init',
        applicationName,
        migrations: [],
        path: path.join(customPath, 'foo', 'test-init.sqlite'),
      });

      await validateDBIsQueryable(db);

      await db.destroy();
    });

    test('will NOT append the database name to the path', async () => {
      /** @type {any} */
      let error;

      try {
        await getDB({
          databaseName: 'test-init',
          applicationName,
          migrations: [],
          path: path.join(customPath, 'foo'),
        });
      } catch (e) {
        error = e;
      }

      expect(error, 'should have thrown an error').toBeDefined();
      expect(error).toBeInstanceOf(SqliteError);
      expect(error.message, 'should have thrown an error').toMatch(/unable to open database file/ig);
      expect(error.code, 'should have thrown an error').toBe('SQLITE_CANTOPEN');
    });
  });
});