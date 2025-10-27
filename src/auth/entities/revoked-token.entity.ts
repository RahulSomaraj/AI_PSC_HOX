import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('revoked-tokens')
export class RevokedToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  token: string;

  @Column()
  userId: number;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
