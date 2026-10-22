const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const tables = await prisma.$queryRawUnsafe('SHOW TABLES;');
    console.log('Tables in DB:');
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      const columns = await prisma.$queryRawUnsafe(`DESCRIBE \`${tableName}\`;`);
      console.log(`\n--- Table: ${tableName} ---`);
      console.log(columns.map(c => `${c.Field} (${c.Type}, Null:${c.Null}, Default:${c.Default})`).join('\n  '));
    }
  } catch (err) {
    console.error('Prisma Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
