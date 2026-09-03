import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';

// Partial unique index: an email may only be live once, but a soft-deleted
// row keeps its email so the address can be re-registered later. Matches the
// `{ email, deletedAt: IsNull() }` conflict check in UsersService.create().
@Index('UQ_users_email_active', ['email'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  firstName: string;

  @Column({ length: 50 })
  lastName: string;

  @Column({ length: 254 })
  email: string;

  @Column({ length: 15 })
  phone: string;

  @Column({ type: 'text', nullable: true })
  photoURL: string | null;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: Role.User })
  role: Role;

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

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
