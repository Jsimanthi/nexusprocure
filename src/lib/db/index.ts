import { PrismaClient as PostgresClient } from '../../../node_modules/.prisma/postgres-client';
import { PrismaClient as SqliteClient } from '../../../node_modules/.prisma/sqlite-client';

const pg = new PostgresClient();
const sq = new SqliteClient();

async function getPrimaryClient() {
  // try Postgres ping
  try {
    await pg.$connect();
    // quick health check - select 1
    await pg.$queryRaw`SELECT 1`;
    await sq.$disconnect().catch(()=>{});
    return pg;
  } catch (e) {
    // fallback to sqlite
    try {
      await sq.$connect();
      return sq;
    } catch (err) {
      throw new Error('No database available');
    }
  }
}

export default getPrimaryClient;