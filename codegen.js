#!/usr/bin/env node
const { generate, getDialect } = require('kysely-codegen');
const { parseArgs } = require('node:util');
const { getDB } = require('./index');

main();

async function main() {
  const args = getArgs();

  const db = await getDB({
    databaseName: args.databaseName,
    applicationName: args.applicationName,
    migrations: [],
  });

  try { 
    const generateOut = await generate({
      db,
      dialect: getDialect('sqlite'),
      outFile: args.outFile,
      camelCase: true,
    });

    console.info(generateOut);
  } catch (error) {
    console.error('generation failed', error);
    process.exit(1);
  }
}

/**
 * 
 * @returns {{ databaseName: string, applicationName: string, outFile: string }}
 */
function getArgs() {
  let {
    databaseName,
    applicationName,
    outFile,
  } = parseArgs({
    options: {
      databaseName: {
        type: 'string',
      },
      applicationName: {
        type: 'string',
      },
      outFile: {
        type: 'string',
      }
    }
  }).values;

  if (process.argv.includes('-h') || process.argv.includes('--help')) {
    console.log('npx kysely-sqlite-codegen --databaseName <databaseName> --applicationName <applicationName> --outFile <outFile>');
    console.log('databaseName: The name of the database to generate types for (this should match your code)');
    console.log('applicationName: The name of the application to generate types for (this should match your code)');
    console.log('outFile: The file to write the types to');
    process.exit(0);
  }

  if (!applicationName) {
    console.error('Application name is required');
    process.exit(1);
  }
  if (!outFile) {
    console.error('Output file for types is required');
    process.exit(1);
  }
  if (!databaseName) {
    console.error('Database name is required');
    process.exit(1);
  }

  return {
    databaseName,
    applicationName,
    outFile,
  };
}