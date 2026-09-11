import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AnswerLogService } from './answer-log.service';

/**
 * Rebuilds answer_log from the answers already stored on completed exams.
 *
 * Run once after deploying, so Reports opens with history instead of an
 * empty table:
 *
 *   npx nest build
 *   node dist/answer-log/answer-log.backfill.js
 *
 * or without building:
 *
 *   npx ts-node src/answer-log/answer-log.backfill.ts
 *
 * Safe to re-run. Every insert is orIgnore against the partial unique index
 * on (exam_id, question_id), so a second pass writes only what the first
 * missed - which also means it is safe to interrupt and restart.
 *
 * Deliberately a script rather than an onModuleInit hook: a backfill that
 * runs on every boot would rescan every exam on every deploy and on every
 * instance, for work that needs doing once.
 *
 * Uses createApplicationContext rather than create: no HTTP server is
 * needed, and starting one would bind the port the running API is using.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('AnswerLogBackfill');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const answerLogService = app.get(AnswerLogService);

    const startedAt = Date.now();
    const summary = await answerLogService.backfillFromExams();
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

    logger.log(
      `Done in ${seconds}s - ${summary.examsScanned} exams scanned, ` +
        `${summary.rowsInserted} rows inserted, ` +
        `${summary.questionsMissing} answers skipped (question deleted)`,
    );
  } catch (err) {
    logger.error('Backfill failed', err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
