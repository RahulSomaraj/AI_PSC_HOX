import { PartialType } from '@nestjs/swagger';
import { CreateExamPostDto } from './create-exam-post.dto';

export class UpdateExamPostDto extends PartialType(CreateExamPostDto) {}
