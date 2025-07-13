import { logger } from '@skelly/utils';
import { getDatabaseClient, closeDatabaseConnection } from './client';
import { users } from './schema/user/users';

const seedUsers = async () => {
  const db = getDatabaseClient();
  
  // Check if users already exist
  const existingUsers = await db.select().from(users).limit(1);
  
  if (existingUsers.length > 0) {
    logger.info('Users already exist, skipping seed');
    return;
  }
  
  logger.info('Seeding users...');
  
  // Note: In a real app, passwords would be hashed using bcrypt or similar
  const seedData = [
    {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: 'hashed_password_here',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin' as const,
      isEmailVerified: true,
      isActive: true,
    },
    {
      email: 'user@example.com',
      username: 'testuser',
      passwordHash: 'hashed_password_here',
      firstName: 'Test',
      lastName: 'User',
      role: 'user' as const,
      isEmailVerified: true,
      isActive: true,
    },
  ];
  
  await db.insert(users).values(seedData);
  
  logger.info(`Seeded ${seedData.length} users`);
};

const seed = async () => {
  try {
    logger.info('Starting database seed...');
    
    await seedUsers();
    // Add other seed functions here as we create more tables
    
    logger.info('Database seed completed successfully');
  } catch (error) {
    logger.error('Seed failed', { error });
    throw error;
  } finally {
    await closeDatabaseConnection();
  }
};

// Run if called directly
if (require.main === module) {
  seed().catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
}

export { seed, seedUsers };