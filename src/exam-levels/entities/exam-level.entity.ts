import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// The root of the exam hierarchy: exam_levels -> exam_posts -> exam_stages.
// A level is the band a post is advertised under - "Degree Level", "Plus Two
// Level", "10th Level" - and groups the posts a candidate of that standing
// can apply for.
//
// Partial unique index: a name is unique while the row is live, so a
// soft-deleted level does not reserve its name forever. Same shape as
// subjects, the root of the academic hierarchy.
@Index('UQ_exam_levels_name_active', ['name'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
@Entity({ name: 'exam_levels' })
export class ExamLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ type: 'int', nullable: true })
  updatedBy: number | null;

  @Column({ type: 'int', nullable: true })
  deletedBy: number | null;
}
