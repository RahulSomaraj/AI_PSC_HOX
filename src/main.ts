import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { LoggingInterceptor } from './interceptors/logging-interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser()); 
  if(process.env.NODE_ENV!=='production')
  {
    app.useGlobalInterceptors(new LoggingInterceptor());
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();