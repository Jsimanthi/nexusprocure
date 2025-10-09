const prismaConfig = {
  seed: "ts-node --compiler-options '{\\\"module\\\":\\\"CommonJS\\\"}' prisma/seed.ts"
};

export default prismaConfig;
