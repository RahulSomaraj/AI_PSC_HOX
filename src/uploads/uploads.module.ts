import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/**
 * Presigned upload URLs. No entities and no repository - this module owns no
 * rows, only the signature that lets a client write one object to storage.
 *
 * Exported so the Content Library module can sign URLs without going back
 * out over HTTP.
 *
 * ConfigModule is imported explicitly because ConfigModule.forRoot() in
 * AppModule is not registered as global.
 */
@Module({
  imports: [ConfigModule],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
