import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';
import { CategoriesModule } from './categories/categories.module';
import { CourseModule } from './course/course.module';
import { QuestionsModule } from './questions/questions.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { ExamModule } from './exam/exam.module';
import { AspirantProfilesModule } from './aspirant-profiles/aspirant-profiles.module';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
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
    CategoriesModule,
    CourseModule,
    QuestionsModule,
    EnrollmentsModule,
    ExamModule,
    AspirantProfilesModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
