import { query } from '../lib/db';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('Initializing database schema...');

    try {
        const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolons to execute statements individually if needed, 
        // or execute the whole block if pg supports it (it usually does for simple scripts)
        // For safety and better error reporting, we can execute the whole file.

        await query(schemaSql);

        console.log('Schema initialized successfully!');
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

main();
