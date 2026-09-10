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
 * A subject in the global academic structure - "Indian Constitution",
 * "Kerala History", "Arithmetic".
 *
 * Subjects are deliberately NOT owned by an exam. "Indian Constitution" is
 * one row that the Degree Level, Plus Two Level, SI and LDC syllabi all map
 * to through `exam_syllabus_items`; there is no per-exam copy of it.
 */
@Index('UQ_subjects_name_active', ['name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
=======
// Subjects are global: "Indian Constitution" is one row that every exam
// reaches through a syllabus item, never a per-exam copy.
//
// Partial unique index: a name is unique while the row is live, so a
// soft-deleted subject does not reserve its name forever.
@Index('UQ_subjects_name_active', ['name'], {
  unique: true,
  where: '"deletedAt" IS NULL',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
})
@Entity({ name: 'subjects' })
export class Subject {
  @PrimaryGeneratedColumn()
  id: number;

<<<<<<< HEAD
  @Column({ type: 'varchar', length: 200 })
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
