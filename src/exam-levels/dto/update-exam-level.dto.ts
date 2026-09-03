import { PartialType } from '@nestjs/swagger';
import { CreateExamLevelDto } from './create-exam-level.dto';

export class UpdateExamLevelDto extends PartialType(CreateExamLevelDto) {}
