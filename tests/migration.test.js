import envPaths from 'env-paths';
import { getDB } from '../index.js';
import { describe, test, beforeAll, expect } from 'vitest';
import * as fs from 'node:fs/promises';

const applicationName = 'test-migration';

describe('run migrations', () => {
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

  test('can run 1 migration', async () => {
    const db = await getDB({
      databaseName: 'test-migration-1',
      applicationName,
      migrations: [migrationOne],
    });

    const migrationLog = await db.selectFrom('kysely_migration').selectAll().execute();
    expect(migrationLog, 'should have run the first migration').toHaveLength(1);
    // @ts-expect-error i dont care if this exists or not
    expect(migrationLog[0]['name'], 'should have run the first migration').toBe('0001_users');

    const users = await db.selectFrom('users').selectAll().execute();
    expect(users, 'should have created 2 users in migration one').toHaveLength(2);
    expect(users, 'should have created 2 users in migration one').toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'John' }),
      expect.objectContaining({ name: 'Jane' }),
    ]))

    await db.destroy();
  });

  test('can run 2 migrations at once in the correct order', async () => {
    const db = await getDB({
      databaseName: 'test-migration-2',
      applicationName,
      migrations: [migrationTwo, migrationOne],
    });

    const migrationLog = await db.selectFrom('kysely_migration').orderBy('timestamp', 'desc').selectAll().execute();
    expect(migrationLog, 'should have run the first migration').toHaveLength(2);
    // @ts-expect-error i dont care if this exists or not
    expect(migrationLog[0]['name'], 'should have run the second migration').toBe('0002_posts');
    // @ts-expect-error i dont care if this exists or not
    expect(migrationLog[1]['name'], 'should have run the first migration').toBe('0001_users');

    try {
      await db.selectFrom('users').selectAll().execute();
    } catch (error) {
      expect(error, 'the users table should now exists after migration').not.toBeDefined();
    }

    await db.destroy();
  });

  test('can run 2 migration, then run a third migration on a new launch', async () => {
    const db = await getDB({
      databaseName: 'test-migration-3',
      applicationName,
      migrations: [migrationOne, migrationTwo],
    });

    const migrationLog = await db.selectFrom('kysely_migration').orderBy('timestamp', 'desc').selectAll().execute();
    expect(migrationLog, 'should have run the first migration').toHaveLength(2);
    // @ts-expect-error i dont care if this exists or not
    expect(migrationLog[0]['name'], 'should have run the second migration').toBe('0002_posts');
    // @ts-expect-error i dont care if this exists or not
    expect(migrationLog[1]['name'], 'should have run the first migration').toBe('0001_users');

    expect(await db.selectFrom('users').selectAll().execute(), 'should have created 2 users in migration one').toHaveLength(2);
    expect(await db.selectFrom('posts').selectAll().execute(), 'should have created 2 posts in migration two').toHaveLength(2);

    await db.destroy();

    const db2 = await getDB({
      databaseName: 'test-migration-3',
      applicationName,
      migrations: [migrationOne, migrationTwo, migrationThree],
    });

    const migrationLog2 = await db2.selectFrom('kysely_migration').orderBy('timestamp', 'desc').selectAll().execute();
    expect(migrationLog2, 'should have run the third migration').toHaveLength(3);
    // @ts-expect-error i dont care if this exists or not
    expect(migrationLog2[0]['name'], 'should have run the third migration').toBe('0003_comments');
    // @ts-expect-error i dont care if this exists or not
    expect(migrationLog2[1]['name'], 'should have run the second migration previously').toBe('0002_posts');
    // @ts-expect-error i dont care if this exists or not
    expect(migrationLog2[2]['name'], 'should have run the first migration previously').toBe('0001_users');

    const comments = await db2.selectFrom('comments').selectAll().execute();
    expect(comments, 'should have created 2 comments in migration three').toHaveLength(2);
    expect(comments, 'should have created 2 comments in migration three').toEqual(expect.arrayContaining([
      expect.objectContaining({ content: 'Comment 1' }),
      expect.objectContaining({ content: 'Comment 2' }),
    ]))

    await db2.destroy();
  });
});

/** @type {import('../types').Migration} */
const migrationOne = {
  name: '0001_users',
  up: async (db) => {
    await db.schema.createTable('users').addColumn('id', 'integer', (b) => b.primaryKey().autoIncrement()).addColumn('name', 'text').execute();
    await db.insertInto('users').values([{ name: 'John' }, { name: 'Jane' }]).execute();
  },
  down: async () => {
    // noop
  },
}

/** @type {import('../types').Migration} */
const migrationTwo = {
  name: '0002_posts',
  up: async (db) => {
    await db.schema.createTable('posts').addColumn('id', 'integer', (b) => b.primaryKey().autoIncrement()).addColumn('title', 'text').execute();
    await db.insertInto('posts').values([{ title: 'Post 1' }, { title: 'Post 2' }]).execute();
  },
  down: async () => {
    // noop
  },
}

/** @type {import('../types').Migration} */
const migrationThree = {
  name: '0003_comments',
  up: async (db) => {
    await db.schema.createTable('comments').addColumn('id', 'integer', (b) => b.primaryKey().autoIncrement()).addColumn('content', 'text').execute();
    await db.insertInto('comments').values([{ content: 'Comment 1' }, { content: 'Comment 2' }]).execute();
  },
  down: async () => {
    // noop
  },
}
