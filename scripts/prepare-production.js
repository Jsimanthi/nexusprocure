const fs = require('fs');
const path = require('path');

const prismaSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const prodSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prod.prisma');

console.log('Preparing production Prisma schema...');

try {
  const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');

  // Replace the provider from "sqlite" to "postgresql"
  const updatedSchemaContent = schemaContent.replace(
    /provider\s*=\s*"sqlite"/,
    'provider = "postgresql"'
  );

  if (schemaContent === updatedSchemaContent) {
    console.warn('Warning: Database provider was not "sqlite". Production schema may be incorrect.');
  }

  fs.writeFileSync(prodSchemaPath, updatedSchemaContent, 'utf8');

  console.log('Successfully created production schema at prisma/schema.prod.prisma');
} catch (error) {
  console.error('Error preparing production Prisma schema:', error);
  process.exit(1);
}
