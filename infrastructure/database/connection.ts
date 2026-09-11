import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { getEnv } from "@/shared/env";
import { AppError, databaseError } from "@/shared/errors";
import { logger } from "@/shared/logger";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const env = getEnv();
  pool = mysql.createPool({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    waitForConnections: true,
    connectionLimit: 20,
    namedPlaceholders: true,
    timezone: "Z",
    dateStrings: false,
  });

  return pool;
}

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: Record<string, unknown> | unknown[]
): Promise<T> {
  try {
    const [rows] = await getPool().query<T>(
      sql,
      params as never
    );
    return rows;
  } catch (error) {
    logger.error("mysql_query_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    throw databaseError();
  }
}

export async function execute(
  sql: string,
  params?: Record<string, unknown> | unknown[]
): Promise<ResultSetHeader> {
  try {
    const [result] = await getPool().execute<ResultSetHeader>(
      sql,
      params as never
    );
    return result;
  } catch (error) {
    logger.error("mysql_execute_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    throw databaseError();
  }
}

export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("mysql_transaction_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    throw databaseError();
  } finally {
    conn.release();
  }
}

export async function pingDatabase(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export type { PoolConnection, RowDataPacket, ResultSetHeader };
