import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Top of the exam hierarchy: the qualification band a post is advertised
 * under - "10th Level", "Plus Two Level", "Degree Level", "Technical",
 * "Teaching", "KAS".
 *
 *   ExamLevel -> ExamPost -> ExamStage -> ExamSyllabus
 *
 * Partial unique index: a level name may only be live once, but a
 * soft-deleted row keeps its name so the name can be reused later.
 */
@Index('UQ_exam_levels_name_active', ['name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Entity({ name: 'exam_levels' })
export class ExamLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy: number | null;
}
