import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity({ name: 'course' })
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  courseName: string;

  @Column({ unique: true })
  courseId: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 100 })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ length: 100, nullable: true })
  updatedBy?: string;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @Column({ length: 100, nullable: true })
  deletedBy?: string;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
