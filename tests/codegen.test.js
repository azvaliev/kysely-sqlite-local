import envPaths from 'env-paths';
import { getDB } from '../index.js';
import { describe, test, beforeAll, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import { sql } from 'kysely';

const applicationName = 'test-codegen';

describe('codegen', () => {
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

  test('can generate types from database with diverse schema and constraints', async () => {
    // Create database with both migrations
    const db = await getDB({
      databaseName: 'test-codegen-comprehensive',
      applicationName,
      migrations: [migrationWithDiverseTypes, migrationWithConstraints],
    });

    // Verify the database was created with expected data from first migration
    const users = await db.selectFrom('users').selectAll().execute();
    expect(users, 'should have created users from migration').toHaveLength(2);

    const products = await db.selectFrom('products').selectAll().execute();
    expect(products, 'should have created products from migration').toHaveLength(1);

    // Verify the database was created with expected data from second migration
    const categories = await db.selectFrom('categories').selectAll().execute();
    expect(categories, 'should have created categories from migration').toHaveLength(2);

    const items = await db.selectFrom('items').selectAll().execute();
    expect(items, 'should have created items from migration').toHaveLength(3);

    await db.destroy();

    // Generate types using the codegen script
    const outFile = path.join(os.tmpdir(), 'generated-types-comprehensive.ts');
    
    try {
      await runCodegen({
        databaseName: 'test-codegen-comprehensive',
        applicationName,
        outFile,
      });

      // Read the generated file
      const generatedContent = await fs.readFile(outFile, 'utf-8');
      
      // Compare with snapshot
      expect(generatedContent).toMatchSnapshot();
      
    } finally {
      // Clean up generated file
      try {
        await fs.unlink(outFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('can generate types from database with custom path', async () => {
    // Create a custom path for the database
    const customDbPath = path.join(os.tmpdir(), 'custom-db', 'test-custom-path.sqlite');
    
    // Ensure the directory exists
    await fs.mkdir(path.dirname(customDbPath), { recursive: true });

    // Create database with custom path
    const db = await getDB({
      databaseName: 'test-custom-path',
      applicationName,
      migrations: [migrationWithDiverseTypes],
      path: customDbPath,
    });

    // Verify the database was created with expected data
    const users = await db.selectFrom('users').selectAll().execute();
    expect(users, 'should have created users from migration').toHaveLength(2);

    const products = await db.selectFrom('products').selectAll().execute();
    expect(products, 'should have created products from migration').toHaveLength(1);

    await db.destroy();

    // Generate types using the codegen script with custom path
    const outFile = path.join(os.tmpdir(), 'generated-types-custom-path.ts');
    
    try {
      await runCodegen({
        databaseName: 'test-custom-path',
        applicationName,
        outFile,
        path: customDbPath,
      });

      // Read the generated file
      const generatedContent = await fs.readFile(outFile, 'utf-8');
      
      // Compare with snapshot
      expect(generatedContent).toMatchSnapshot();
      
    } finally {
      // Clean up generated file
      try {
        await fs.unlink(outFile);
      } catch (error) {
        // Ignore cleanup errors
      }
      // Clean up custom database directory
      try {
        await fs.rm(path.dirname(customDbPath), { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
});

/**
 * Run the codegen script with the given parameters
 * @param {Object} params
 * @param {string} params.databaseName
 * @param {string} params.applicationName
 * @param {string} params.outFile
 * @param {string} [params.path]
 */
async function runCodegen({ databaseName, applicationName, outFile, path }) {
  return new Promise((resolve, reject) => {
    const args = [
      'codegen.js',
      '--databaseName', databaseName,
      '--applicationName', applicationName,
      '--outFile', outFile,
    ];
    
    if (path) {
      args.push('--path', path);
    }
    
    const child = spawn('node', args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Codegen failed with code ${code}. Stderr: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/** @type {import('../types').Migration} */
const migrationWithDiverseTypes = {
  name: '0001_diverse_types',
  up: async (db) => {
    // Create users table with various SQLite data types
    await db.schema.createTable('users')
      .addColumn('id', 'integer', (b) => b.primaryKey().autoIncrement())
      .addColumn('name', 'text', (b) => b.notNull())
      .addColumn('email', 'text', (b) => b.unique())
      .addColumn('age', 'integer')
      .addColumn('is_active', 'boolean', (b) => b.notNull().defaultTo(true))
      .addColumn('created_at', 'datetime', (b) => b.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'datetime')
      .addColumn('bio', 'text')
      .addColumn('score', 'real')
      .addColumn('avatar_blob', 'blob')
      .execute();

    // Create products table with different data types
    await db.schema.createTable('products')
      .addColumn('id', 'integer', (b) => b.primaryKey().autoIncrement())
      .addColumn('name', 'text', (b) => b.notNull())
      .addColumn('price', 'real', (b) => b.notNull())
      .addColumn('description', 'text')
      .addColumn('in_stock', 'boolean', (b) => b.notNull().defaultTo(false))
      .addColumn('tags', 'text') // JSON-like string
      .addColumn('metadata', 'text') // JSON-like string
      .execute();

    // Insert sample data
    await db.insertInto('users').values([
      { 
        name: 'John Doe', 
        email: 'john@example.com', 
        age: 30, 
        is_active: 1,
        bio: 'Software developer',
        score: 95.5,
      },
      { 
        name: 'Jane Smith', 
        email: 'jane@example.com', 
        age: 25, 
        is_active: 0,
        bio: 'Designer',
        score: 88.2,
      }
    ]).execute();

    await db.insertInto('products').values([
      {
        name: 'Laptop',
        price: 999.99,
        description: 'High-performance laptop',
        in_stock: 1,
        tags: '["electronics", "computer"]',
        metadata: '{"brand": "TechCorp", "warranty": "2 years"}',
      }
    ]).execute();
  },
  down: async () => {
    // noop
  },
};

/** @type {import('../types').Migration} */
const migrationWithConstraints = {
  name: '0002_constraints',
  up: async (db) => {
    // Create categories table
    await db.schema.createTable('categories')
      .addColumn('id', 'integer', (b) => b.primaryKey().autoIncrement())
      .addColumn('name', 'text', (b) => b.notNull().unique())
      .addColumn('description', 'text')
      .addColumn('created_at', 'datetime', (b) => b.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Create items table with foreign key
    await db.schema.createTable('items')
      .addColumn('id', 'integer', (b) => b.primaryKey().autoIncrement())
      .addColumn('name', 'text', (b) => b.notNull())
      .addColumn('category_id', 'integer', (b) => b.notNull().references('categories.id'))
      .addColumn('price', 'real', (b) => b.notNull())
      .addColumn('quantity', 'integer', (b) => b.notNull().defaultTo(0))
      .addColumn('is_available', 'boolean', (b) => b.notNull().defaultTo(true))
      .addColumn('created_at', 'datetime', (b) => b.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Insert sample data
    await db.insertInto('categories').values([
      { name: 'Electronics', description: 'Electronic devices and gadgets' },
      { name: 'Books', description: 'Books and publications' },
    ]).execute();

    await db.insertInto('items').values([
      { name: 'Smartphone', category_id: 1, price: 599.99, quantity: 10, is_available: 1 },
      { name: 'Programming Book', category_id: 2, price: 49.99, quantity: 25, is_available: 1 },
      { name: 'Laptop', category_id: 1, price: 1299.99, quantity: 5, is_available: 1 },
    ]).execute();
  },
  down: async () => {
    // noop
  },
};
