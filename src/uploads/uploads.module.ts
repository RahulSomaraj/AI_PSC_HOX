import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/**
 * Presigned upload URLs. No entities and no repository - this module owns no
 * rows, only the signature that lets a client write one object to storage.
 *
 * Exported so the Content Library module can sign URLs without going back
 * out over HTTP.
 */
@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
