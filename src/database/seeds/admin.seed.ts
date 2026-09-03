import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

/**
 * Provisions the initial admin account from ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * Admin is never self-assignable over the API - POST /users always creates a
 * `user`. This script is the only way to mint the first admin.
 *
 * Idempotent: re-running it promotes an existing account to admin if needed,
 * but never overwrites an existing password.
 *
 *   npm run seed:admin
 */
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing required environment variables. Please check your .env file and ensure the following are set: ADMIN_EMAIL, ADMIN_PASSWORD',
    );
  }

  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT;
  const dbUsername = process.env.DB_USERNAME;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;

  if (!dbHost || !dbPort || !dbUsername || !dbPassword || !dbName) {
    throw new Error(
      'Missing required database environment variables. Please check your .env file and ensure the following are set: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME',
    );
  }

  const useSSL = process.env.DB_SSL !== 'false';

  const dataSource = new DataSource({
    type: 'postgres',
    host: dbHost,
    port: +dbPort,
    username: dbUsername,
    password: dbPassword,
    database: dbName,
    entities: [User],
    synchronize: false,
    ...(useSSL ? { extra: { ssl: { rejectUnauthorized: false } } } : {}),
  });

  await dataSource.initialize();

  try {
    const users = dataSource.getRepository(User);
    const existing = await users.findOne({ where: { email } });

    if (existing) {
      if (existing.role === Role.Admin) {
        console.log(`Admin already exists: ${email} (id ${existing.id})`);
        return;
      }
      existing.role = Role.Admin;
      await users.save(existing);
      console.log(`Promoted existing user to admin: ${email} (id ${existing.id})`);
      return;
    }

    const admin = users.create({
      firstName: process.env.ADMIN_FIRST_NAME?.trim() || 'Admin',
      lastName: process.env.ADMIN_LAST_NAME?.trim() || 'User',
      email,
      phone: process.env.ADMIN_PHONE?.trim() || '9999999999',
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      role: Role.Admin,
      isActive: true,
    });

    const saved = await users.save(admin);
    console.log(`Created admin: ${email} (id ${saved.id})`);
  } finally {
    await dataSource.destroy();
  }
}

seedAdmin().catch((err) => {
  console.error('Admin seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
