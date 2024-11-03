import {Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import {GenderTypeEnum, VerificationStatusEnum} from "@/database/interfaces";
import {AuthProviders} from "@/auth/interfaces";

@Entity()
@Unique(['email', 'phoneNumber'])
export class Account {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar' })
    userName: string;

    @Column({ type: 'int', nullable: true })
    assignedQuestionId: number;

    @Column({
        type: 'enum',
        enum: AuthProviders,
        default: AuthProviders.EMAIL_PASSWORD,
    })
    provider: AuthProviders;

    @Column({ type: 'varchar' })
    dateOfBirth: string;

    @Column({ type: 'varchar' })
    bio: string;

    @Column({ type: 'varchar' })
    email: string;

    @Column({ type: 'int' })
    phoneNumber: number;

    @Column({ type: 'varchar' })
    location: string;

    @Column({ type: 'varchar' })
    firstName: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    otpVerificationTime: string;

    @Column({ type: 'int', nullable: true })
    verificationCode: number;

    @Column({ type: 'varchar' })
    lastName: string;

    @Column({ type: 'varchar' })
    occupation: string;

    @Column({ type: 'int' })
    age: number;

    @Column({ type: 'varchar' })
    address: string;

    @Column({ nullable: true })
    picture?: string;

    @Column({
        type: 'enum',
        enum: GenderTypeEnum,
        default: GenderTypeEnum.MALE,
    })
    gender: string;

    @Column({ type: 'date', nullable: true })
    lastLoggedIn: Date;

    @Column({ type: 'text', nullable: true })
    refreshToken: string;

    @Column({ type: 'text', nullable: true })
    accessToken: string;

    @Column({
        type: 'enum',
        enum: VerificationStatusEnum,
        default: VerificationStatusEnum.UNVERIFIED,
        nullable: true
    })
    verificationStatus: VerificationStatusEnum;

    @Column({ type: 'varchar' })
    password: string;

    @Column("simple-array")
    interest: string[]; // TypeORM supports array storage

    @Column("decimal")
    height: number; // stored as decimal for precision

    @Column()
    religion: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

