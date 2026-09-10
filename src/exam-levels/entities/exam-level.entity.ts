import {
  Column,
  CreateDateColumn,
<<<<<<< HEAD
  DeleteDateColumn,
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

<<<<<<< HEAD
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
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
})
@Entity({ name: 'exam_levels' })
export class ExamLevel {
  @PrimaryGeneratedColumn()
  id: number;

<<<<<<< HEAD
  @Column({ type: 'varchar', length: 120 })
=======
  @Column({ length: 150 })
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

<<<<<<< HEAD
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
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  deletedBy: number | null;
}
