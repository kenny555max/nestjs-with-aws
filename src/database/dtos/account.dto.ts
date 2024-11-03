import {
    IsString,
    IsInt,
    IsOptional,
    IsArray,
    IsUrl,
    IsIn,
    IsNumber,
    Min,
    IsPositive,
    IsBoolean,
    MaxLength, Matches, MinLength, IsNotEmpty, IsDate, IsPhoneNumber, IsEmail, IsEnum
} from 'class-validator';
import {ApiProperty, ApiPropertyOptional, OmitType, PartialType} from "@nestjs/swagger";
import {otpTypeStatusEnum} from "@/database/interfaces";

export class AccountDto {
    /**
     * The first name of the account holder.
     * @example "John"
     */
    @IsNotEmpty()
    @IsString()
    @ApiProperty({ example: 'John Doe' })
    firstName: string;

    /**
     * The username of the account holder.
     * @example "JohnCute"
     */
    @IsNotEmpty()
    @IsString()
    @ApiProperty({ example: 'JohnCute' })
    userName: string;

    /**
     * The first name of the account holder.
     * @example "John"
     */
    @IsNotEmpty()
    @IsString()
    @ApiProperty({ example: 'John Doe' })
    dateOfBirth: string;

    /**
     * The bio of the account holder.
     * @example "I'm an Entrepreneur"
     */
    @IsNotEmpty()
    @IsString()
    @ApiProperty({ example: 'Im an Entrepreneur' })
    bio: string;

    /**
     * The last name of the account holder.
     * @example "Doe"
     */
    @IsNotEmpty()
    @IsString()
    @ApiProperty({ example: 'Doe' })
    lastName: string;

    /**
     * The occupation of the account holder.
     * @example "Software Engineer"
     */
    @IsString()
    @ApiProperty({ example: 'Software Engineer' })
    occupation: string;

    /**
     * The email address of the account holder.
     * @type {string}
     */
    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Za-z]+$/, { message: 'Email must be a valid format' })
    @ApiProperty({ example: 'user@example.com' })
    email: string;

    /**
     * The age of the user.
     * @type {number}
     */
    @IsInt()
    @Min(0)
    @ApiProperty({ example: 30 })
    age: number;

    /**
     * The address of the user.
     * @type {string}
     */
    @IsString()
    @ApiProperty({ example: '123 Main St, Lagos, Nigeria' })
    address: string;

    /**
     * The profile picture URL of the user.
     * @type {string}
     */
    @IsUrl()
    @IsOptional()
    @ApiPropertyOptional({ example: 'http://example.com/profile.jpg' })
    picture?: string;

    /**
     * The gender of the user.
     * @type {string}
     */
    @IsString()
    @IsIn(['MALE', 'FEMALE'])
    @ApiProperty({ example: 'MALE', enum: ['MALE', 'FEMALE'] })
    gender: string;

    /**
     * Indicates if the user's email is verified.
     * @type {boolean}
     */
    @IsBoolean()
    @ApiProperty({ example: false })
    verificationStatus: boolean;

    /**
     * The password for the account.
     * @type {string}
     * @IsNotEmpty()
     * @IsString()
     * @IsStrongPassword()
     */
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    @MaxLength(30)
    @ApiProperty({ type: String })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%^&*?#])[A-Za-z\d@$!%^&*?#]{6,}$/,
        {
            message:
                'Password must be at least 6 characters long and contain a mix of uppercase and lowercase letters, numbers, and special characters.',
        },
    )
    password: string;

    /**
     * The interests of the user.
     * @type {string[]}
     */
    @IsArray()
    @IsString({ each: true })
    @ApiProperty({ type: [String], example: ['Coding', 'Hiking'] })
    interest: string[];

    /**
     * The height of the user.
     * @type {number}
     */
    @IsNumber()
    @IsPositive()
    @ApiProperty({ example: 175 })
    height: number;

    /**
     * The religion of the user.
     * @type {string}
     */
    @IsString()
    @ApiProperty({ example: 'Christianity' })
    religion: string;

    /**
     * The location of the user.
     * @type {string}
     */
    @IsString()
    @ApiProperty({ example: 'Asia/Singapore' })
    location: string;

    /**
     * The phone number of the account holder.
     * @type {string}
     */
    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber('NG', { message: 'Invalid phone number format' })
    @ApiProperty({ type: String, example: '+2348123456789' })
    phoneNumber: string;

    /**
     * The creation timestamp of the account.
     *
     * @example '2022-01-01T00:00:00Z'
     */
    @ApiProperty({ example: '2022-01-01T00:00:00Z' })
    @IsNotEmpty()
    @IsDate()
    created_at: Date;

    /**
     * The updated timestamp of the account.
     *
     * @example '2022-01-01T00:00:00Z'
     */
    @ApiProperty({ example: '2022-01-01T00:00:00Z' })
    @IsNotEmpty()
    @IsDate()
    updated_at: Date;
}

/**
 * CreateAccountDto is used for creating a new account.
 */
export class CreateAccountDto extends OmitType(AccountDto, [
    'created_at',
    'updated_at'
]) {}

export class LoginAccountDto {
    @IsString()
    @IsNotEmpty()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}

export class OtpVerificationDto {
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsNumber({ allowNaN: false })
    verificationCode: number;

    /**
     * The otp type.
     * @type {otpTypeStatusEnum}
     * @IsEnum(otpTypeStatusEnum)
     * @IsNotEmpty()
     */
    @IsEnum(otpTypeStatusEnum)
    @IsNotEmpty()
    @ApiProperty({
        enum: otpTypeStatusEnum,
        enumName: 'otpTypeStatusEnum',
    })
    otp_type: otpTypeStatusEnum;
}

export class ResetPasswordDto {
    @IsNotEmpty()
    @IsString()
    newPassword: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;
}

export class ChangePasswordDto {
    @IsNotEmpty()
    @IsString()
    currentPassword: string;

    @IsNotEmpty()
    @IsString()
    newPassword: string;

    @IsNotEmpty()
    @IsString()
    confirmNewPassword: string;
}

export class ForgotPasswordDto {
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    email: string;
}

export class UpdateAccountDto extends PartialType(
    OmitType(AccountDto, ['created_at', 'updated_at', 'password']),
) {}