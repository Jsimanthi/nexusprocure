import { main } from '../prisma/seed';
import { prisma } from '../prisma/client';

main()
  .then(async () => {
    console.log('Seeding completed successfully.');
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });