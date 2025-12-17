import { Pool, QueryResult, QueryResultRow } from 'pg';

const globalForDb = global as unknown as { pool: Pool };

const getPool = (): Pool => {
    if (!globalForDb.pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is not defined');
        }

        const poolConfig = {
            connectionString: process.env.DATABASE_URL,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000, // Increased to 10s
        };

        globalForDb.pool = new Pool(poolConfig);
    }
    return globalForDb.pool;
};

export const query = async <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
): Promise<QueryResult<T>> => {
    const pool = getPool();
    return pool.query<T>(text, params);
};
