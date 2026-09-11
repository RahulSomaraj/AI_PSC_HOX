import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FacultyModule } from './faculty/faculty.module';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CategoriesModule } from './categories/categories.module';
import { CourseModule } from './course/course.module';
import { QuestionsModule } from './questions/questions.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { ExamModule } from './exam/exam.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TopicsModule } from './topics/topics.module';
import { SubtopicsModule } from './subtopics/subtopics.module';
import { BatchesModule } from './batches/batches.module';
import { AspirantProfilesModule } from './aspirant-profiles/aspirant-profiles.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ExamLevelsModule } from './exam-levels/exam-levels.module';
import { ExamPostsModule } from './exam-posts/exam-posts.module';
import { ExamStagesModule } from './exam-stages/exam-stages.module';
import { SyllabusModule } from './syllabus/syllabus.module';
import { ActivityModule } from './activity/activity.module';
import { ActivityInterceptor } from './activity/activity.interceptor';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AnswerLogModule } from './answer-log/answer-log.module';
import { UploadsModule } from './uploads/uploads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    FacultyModule,
    UsersModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbHost = configService.get('DB_HOST');
        const dbPort = configService.get('DB_PORT');
        const dbUsername = configService.get('DB_USERNAME');
        const dbPassword = configService.get('DB_PASSWORD');
        const dbName = configService.get('DB_NAME');

        // Validate required environment variables
        if (!dbHost || !dbPort || !dbUsername || !dbPassword || !dbName) {
          throw new Error(
            'Missing required database environment variables. Please check your .env file and ensure the following are set: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME',
          );
        }

        const useSSL = configService.get('DB_SSL') !== 'false';

        const config: any = {
          type: 'postgres',
          host: dbHost,
          port: +dbPort,
          username: dbUsername,
          password: dbPassword,
          database: dbName,
          entities: [join(process.cwd(), 'dist/**/*.entity.js')],
          synchronize: true,
          logging: process.env.NODE_ENV === 'development',
          connectTimeoutMS: 10000,
          acquireTimeoutMS: 10000,
          timeout: 10000,
        };

        // SSL configuration for AWS RDS PostgreSQL (rds.force_ssl=1 requires SSL)
        // The 'extra' option passes SSL config directly to the pg driver
        // For RDS, SSL is mandatory when rds.force_ssl=1
        if (useSSL) {
          config.extra = {
            ssl: {
              rejectUnauthorized: false, // Required for RDS - allows connection without cert validation
            },
          };
        }

        return config;
      },
    }),
    AuthModule,
    AspirantProfilesModule,

    // Exam structure: level -> exam/post -> stage -> syllabus
    ExamLevelsModule,
    ExamPostsModule,
    ExamStagesModule,
    SyllabusModule,

    // Global academic structure: subject -> topic -> subtopic
    SubjectsModule,
    TopicsModule,
    SubtopicsModule,

    // Coaching cohorts, targeted at an exam post
    BatchesModule,
    SubscriptionsModule,

    // Content and delivery
    CategoriesModule,
    CourseModule,
    QuestionsModule,
    EnrollmentsModule,
    ExamModule,

    // Presence tracking, read by the dashboard's DAU chart
    ActivityModule,

    // One row per question answered, read by Reports and the results page
    AnswerLogModule,

    // Presigned upload URLs, so file bytes never reach this process
    UploadsModule,

    // Admin dashboard aggregates
    DashboardModule,

    // Admin settings lookups
    SettingsModule,
  ],
  controllers: [AppController],
  // Guard order follows provider order: JwtAuthGuard must run first so that
  // request.user is populated by the time RolesGuard reads the role off it.
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Registered here rather than in main.ts: the interceptors there are
    // behind an `if (NODE_ENV !== 'production')`, and activity must be
    // recorded in production above all. Runs after the guards, so
    // request.user is populated.
    { provide: APP_INTERCEPTOR, useClass: ActivityInterceptor },
  ],
})
export class AppModule {}
