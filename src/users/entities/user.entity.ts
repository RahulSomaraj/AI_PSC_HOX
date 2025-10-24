import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";


@Entity({name:'users'})
export class User {
    @PrimaryGeneratedColumn()
    id:number

    @Column({ length: 50 })
    firstName: string;

    @Column({ length: 50 })
    lastName: string;

    @Column({ length: 254 })
    email: string;

    @Column({ length: 15})
    phone: string;

    @Column({ type: 'text', nullable: true })
    photoURL: string | null;
    
    @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
    passwordHash: string;

    @Column({ type: 'varchar', length: 20, default: 'user' })
    role: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    deletedAt: Date | null;
    
}
