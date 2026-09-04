import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BatchShift {
  Morning = 'Morning',
  Evening = 'Evening',
}

// A batch is a named group of students sitting a shift, shown as
// "Batch A (Morning)" on the students screen.
//
// Partial unique index on (name, shift): the same name may run in both
// shifts, but not twice in one. Scoped to live rows, so a soft-deleted
// batch frees its name for reuse.
@Index('UQ_batches_name_shift_active', ['name', 'shift'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
@Entity({ name: 'batches' })
export class Batch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  shift: BatchShift;

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
