import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Subject } from '../../subjects/entities/subject.entity';

/**
 * Copies the existing `category` rows into the new global `subjects` table.
 *
 * The categories seeded for the quiz module ("Indian History", "Geography",
 * "Indian Polity", ...) are exactly the subjects the syllabus module needs, so
 * they are carried over instead of being retyped. Nothing is moved or
 * deleted: the categories module keeps its own table and keeps working.
 *
 * Idempotent - a category whose name already exists as a subject is skipped,
 * so it is safe to re-run after new categories are added.
 *
 *   npm run seed:subjects
 */
async function seedSubjectsFromCategories() {
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
    entities: [Category, Subject],
    synchronize: false,
    ...(useSSL ? { extra: { ssl: { rejectUnauthorized: false } } } : {}),
  });

  await dataSource.initialize();

  try {
    const categories = await dataSource
      .getRepository(Category)
      .find({ order: { id: 'ASC' } });
    const subjects = dataSource.getRepository(Subject);

    let created = 0;
    let skipped = 0;

    for (const [index, category] of categories.entries()) {
      const name = category.name?.trim();
      if (!name) {
        skipped++;
        continue;
      }

      // withDeleted, because a soft-deleted subject keeps the name and a
      // second copy would be rejected once it is restored.
      const existing = await subjects.findOne({
        where: { name },
        withDeleted: true,
      });
      if (existing) {
        console.log(
          `Skipped "${name}" - already a subject (id ${existing.id})`,
        );
        skipped++;
        continue;
      }

      const saved = await subjects.save(
        subjects.create({
          name,
          description: category.description ?? null,
          sortOrder: index + 1,
          isActive: true,
        }),
      );
      console.log(`Created subject "${name}" (id ${saved.id})`);
      created++;
    }

    console.log(
      `Done. ${created} subject(s) created, ${skipped} skipped, ${categories.length} category row(s) read.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

seedSubjectsFromCategories().catch((err) => {
  console.error(
    'Subject seed failed:',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
