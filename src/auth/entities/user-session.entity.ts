import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  refreshToken: string;

  @Column({ default: false })
  revoked: boolean;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  deviceInfo: string;

  @CreateDateColumn()
  createdAt: Date;
}
