import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { LoggingInterceptor } from './interceptors/logging-interceptors';
import { ResponseInterceptor } from './interceptors/response-interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser()); 
  if(process.env.NODE_ENV!=='production')
  {
    app.useGlobalInterceptors(new LoggingInterceptor(),new ResponseInterceptor());
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();