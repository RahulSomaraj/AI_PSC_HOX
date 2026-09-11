import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ResponseInterceptor } from './interceptors/response-interceptor';
import { LoggingInterceptor } from './interceptors/logging-interceptors';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe to ensure all DTOs are validated
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are sent
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
      validateCustomDecorators: true, // Validate custom decorators
    }),
  );

  // Enable CORS for all origins
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.use(cookieParser());

  // Swagger API Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('PSC Backend API')
    .setDescription('API documentation for PSC Backend application')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('categories', 'Category management endpoints')
    .addTag('course', 'Course management endpoints')
    .addTag('questions', 'Question management endpoints')
    .addTag('enrollments', 'Enrollment management endpoints')
    .addTag('exam', 'Exam attempt endpoints')
    .addTag('aspirant-profiles', 'Aspirant profile management endpoints')
    .addTag('exam-levels', 'Exam level management endpoints')
    .addTag('exams', 'Exam / post catalog endpoints')
    .addTag('exam-stages', 'Exam stage management endpoints')
    .addTag('subjects', 'Subject management and academic hierarchy endpoints')
    .addTag('topics', 'Topic management endpoints')
    .addTag('subtopics', 'Subtopic management endpoints')
    .addTag('syllabus', 'Exam stage syllabus mapping endpoints')
    .addTag('batches', 'Batch management endpoints')
    .addTag('app', 'Application endpoints')
    .addTag('subjects', 'Subject management endpoints')
    .addTag('topics', 'Topic management endpoints')
    .addTag('subtopics', 'Subtopic management endpoints')
    .addTag('batches', 'Batch management endpoints')
    .addTag('admin', 'Admin-only endpoints')
    .addTag('faculty', 'Faculty and staff management endpoints')
    .addTag('uploads', 'Presigned file upload endpoints')
    .addTag('settings', 'Admin settings lookup endpoints')
    .addTag('notifications', 'Announcement endpoints')
    .addTag('content', 'Content library endpoints')
    .addTag('dashboard', 'Admin dashboard aggregate endpoints')
    .addTag('reports', 'Student analytics and reporting endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  if (process.env.NODE_ENV !== 'production') {
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new ResponseInterceptor(),
    );
  }
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const baseUrl = (process.env.APP_URL ?? `http://localhost:${port}`).replace(
    /\/$/,
    '',
  );
  Logger.log(`Swagger UI: ${baseUrl}/docs`, 'Bootstrap');
}
bootstrap();
