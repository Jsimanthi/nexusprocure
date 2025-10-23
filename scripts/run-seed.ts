import { main } from '../prisma/seed';

main()
  .then(async () => {
    console.log('Seeding completed successfully.');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  });