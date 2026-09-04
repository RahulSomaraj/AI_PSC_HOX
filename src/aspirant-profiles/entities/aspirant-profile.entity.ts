import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Batch } from '../../batches/entities/batch.entity';

@Entity({ name: 'aspirant_profiles' })
export class AspirantProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Server-generated on create from the psc_id_seq sequence, never accepted
  // from the client. Plain unique, not a partial index: a number drawn from
  // the sequence is never reused, so a soft-deleted profile keeps its id
  // reserved for good.
  //
  // Nullable in the database so the column can be added to a table that
  // already holds rows; the service always populates it on create.
  @Column({
    name: 'psc_id',
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: true,
  })
  pscId: string | null;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'varchar', length: 20 })
  gender: string;

  @Column({ name: 'community_category', type: 'varchar', length: 30, nullable: true })
  communityCategory: string | null;

  @Column({ name: 'is_kerala_native', type: 'boolean', nullable: true })
  isKeralaNative: boolean | null;

  @Column({ name: 'malayalam_proficiency', type: 'varchar', length: 20, nullable: true })
  malayalamProficiency: string | null;

  @Column({ name: 'preferred_language', type: 'varchar', length: 10, default: 'ml' })
  preferredLanguage: string;

  // Nullable: an aspirant need not be assigned to a batch.
  // RESTRICT: a batch holding aspirants cannot be hard-deleted out from
  // under them. BatchesService.remove() enforces the same rule for soft
  // deletes, which the constraint does not cover.
  @Column({ name: 'batch_id', type: 'int', nullable: true })
  batchId: number | null;

  @ManyToOne(() => Batch, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch | null;

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
