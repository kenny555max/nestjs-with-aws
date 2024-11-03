import {
  BadRequestException,
  ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';import {
  LoginAccountDto,
  OtpVerificationDto,
  CreateAccountDto, ResetPasswordDto, ForgotPasswordDto, ChangePasswordDto
} from "@/database/dtos";
import { IdentifierService } from '@/identifier/identifier.service';
import { emailTemplates } from '@/mailservice/emailTemplates';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ErrorHandler } from '@/utils';
import { PasswordManager } from '@/utils/password-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload, Tokens } from './interfaces';
import {Account} from "@/database/entities/Account.entity";
import {MailService} from "@/mailservice/mailservice.service";
import {otpTypeStatusEnum, VerificationStatusEnum} from "@/database/interfaces";

@Injectable()
export class AuthService {
  constructor(
      @InjectRepository(Account)
      private accountRepo: Repository<Account>,
      private identifierService: IdentifierService,
      private configService: ConfigService,
      private jwtService: JwtService,
      private mailService: MailService,
  ) {
  }

  /**
   * Log in to the user account.
   *
   * @param {LoginAccountDto} body - The body of the request containing the email and password.
   * @return {Promise<any>} A promise that resolves to an object with a message and user data.
   */
  async loginAccount(body: LoginAccountDto): Promise<any> {
    try {
      const { email, password } = body;

      const existingUser = await this.accountRepo.findOne({
        where: { email }
      });

      console.log(existingUser);

      if (!existingUser) {
        throw new ConflictException('Invalid credentials');
      }

      const passwordMatch = await PasswordManager.matchingPasswords(
          password,
          existingUser.password,
      );

      if (!passwordMatch) {
        throw new ConflictException('Invalid credentials');
      } else {
        const isUnverified =
            existingUser.verificationStatus === VerificationStatusEnum.UNVERIFIED;

        if (isUnverified) {
          this.sendOtp(email, 'account_verification');
        } else {
          existingUser.lastLoggedIn = new Date();
          await this.accountRepo.save(existingUser);
        }

        existingUser.lastLoggedIn = new Date();
        const { accessToken, refreshToken } = await this.getTokens({
          id: existingUser?.id.toString(),
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
        });
        const user = await this.sanitizeUser(existingUser);

        return {
          message: 'Welcome back!.',
          user: { ...user, accessToken, refreshToken },
        };
      }
    } catch (error) {
      ErrorHandler.handleError('AuthService.loginAccount', error);
    }
  }

  /**
   * Creates a new user account.
   *
   * @param {CreateAccountDto} payload - The payload containing the user's account information.
   * @return {Promise<{ message: string }>} - A promise that resolves to an object with the message "Verification Email sent!".
   */
  async createUser(payload: CreateAccountDto): Promise<{ message: string }> {
    try {
      const {
        email,
        firstName,
        lastName,
        occupation,
        age,
        address,
        picture,
        gender,
        interest,
        height,
        religion,
        password,
        userName,
        bio,
        dateOfBirth
      } = payload;

      const existingUser = await this.accountRepo.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use.');
      }

      // Hash the password if the password property is required in the payload
      const hashedPassword = await PasswordManager.hashPassword(password);

      const user = this.accountRepo.create({
        email,
        firstName,
        lastName,
        occupation,
        age,
        address,
        picture,
        gender,
        interest,
        height,
        religion,
        password: hashedPassword,
      });

      await this.accountRepo.save(user);

      return { message: 'Account registration successful!' };
    } catch (error) {
      ErrorHandler.handleError('AuthService.createUser', error);
      throw error;
    }
  }

  /**
   * Sends an OTP to the specified email address.
   *
   * @param {string} email - The email address to send the OTP to.
   * @param {'account_verification' | 'reset' | 'otp'} type - The type of OTP to send.
   * @return {Promise<{ data: Account }>} - A promise that resolves to an object with the sent account.
   */
  async sendOtp(email: string, type: 'account_verification' | 'reset' | 'otp') {
    try {
      const verificationCode = this.identifierService.generateOTP();

      const account = await this.accountRepo
          .createQueryBuilder('account')
          .where('account.email = :email', { email })
          .getOne();

      if (!account) {
        throw new BadRequestException('Email not found.');
      }
      const otpVerificationTime = new Date().toISOString();

      account.verificationCode = verificationCode;
      account.otpVerificationTime = otpVerificationTime;

      await this.accountRepo.save(account);

      const subject =
          type === 'account_verification'
              ? `Account Verification`
              : 'Password Reset';

      type === 'account_verification'
          ? await this.mailService.sendEmail({
            to: account?.email,
            subject,
            template: emailTemplates.emailVerification,
            data: { otp: verificationCode.toString() },
          })
          : type === 'otp'
              ? await this.mailService.sendEmail({
                to: account?.email,
                subject,
                template: emailTemplates.emailOTP,
                data: { otp: verificationCode.toString() },
              })
              : await this.mailService.sendEmail({
                to: account?.email,
                subject,
                template: emailTemplates.forgotPasswordEmail,
                data: { otp: verificationCode.toString() },
              });

      return {
        message: `OTP sent to ${account?.email}`,
        email: account?.email,
        // otp: verificationCode.toString()
      };
    } catch (error) {
      ErrorHandler.handleError('AuthService.sendOtp', error);
    }
  }

  /**
   * Verify the user's account using the provided OTP verification details.
   *
   * @param {OtpVerificationDto} paylload - The OTP verification details containing the email and verification code.
   * @return {Promise<User>} The user's account details after successful verification.
   */
  async verifyAccount(payload: OtpVerificationDto) {
    try {
      const { email, otp_type, verificationCode } = payload;

      const user = await this.accountRepo
          .createQueryBuilder('account')
          .where('account.email = :email', { email })
          .andWhere('account.verificationCode = :verificationCode', {
            verificationCode,
          })
          .getOne();


      if (!user) {
        throw new ConflictException('Incorrect verification details.');
      }

      const timeDifference =
          (new Date().getTime() - new Date(user.otpVerificationTime).getTime()) /
          1000 /
          60;

      if (timeDifference > 300) {
        throw new ConflictException('Verification code has expired.');
      } else if (otp_type === otpTypeStatusEnum.VERIFICATION) {
        user.verificationStatus = VerificationStatusEnum.VERIFIED;

        await this.accountRepo.save(user);

        // Generate jwt
        const { accessToken, refreshToken } = await this.getTokens({
          id: user?.id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });

        user.refreshToken = refreshToken;

        const response = await this.sanitizeUser(user);

        await this.accountRepo.save(user);

        response.accessToken = accessToken;

        return { message: 'OTP Verified', data: response };

      } else if (otp_type === otpTypeStatusEnum.RESET) {
        return { message: 'OTP Verified' };
      }
    } catch (error) {
      ErrorHandler.handleError('AuthService.verifyAccount', error);
    }
  }

  /**
   * Retrieves the access and refresh tokens for the given JWT payload.
   *
   * @param {JwtPayload} jwtPayload - The JWT payload containing user information.
   * @return {Promise<Tokens>} - A promise that resolves to an object with the access and refresh tokens.
   */
  async getTokens(jwtPayload: JwtPayload): Promise<Tokens> {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get('jwt.access_token_secret'),
        expiresIn: this.configService.get('jwt.access_token_expires'),
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get('jwt.refresh_token_secret'),
        expiresIn: this.configService.get('jwt.refresh_token_expires'),
      }),
    ]);

    return {
      accessToken: at,
      refreshToken: rt,
    };
  }

  /**
   * Logout a user.
   *
   * @param {number} userId - The ID of the user to logout.
   * @return {Promise<boolean>} A promise that resolves to true if the logout was successful.
   */
  async logout(userId: string): Promise<boolean> {
    try {
      await this.accountRepo.update(userId, { refreshToken: null });
      return true;
    } catch (error) {
      ErrorHandler.handleError('AuthService.logout', error);
    }
  }

  /**
   * Resets the user's password.
   *
   * @param {ResetPasswordDto} body - The object containing the email and newPassword.
   * @return {Promise<User>} A promise that resolves to the sanitized user object.
   */
  async resetPassword(body: ResetPasswordDto) {
    try {
      const { email, newPassword } = body;
      const user = await this.accountRepo
          .createQueryBuilder('account')
          .where('account.email = :email', { email })
          .getOne();
      if (!user) {
        throw new BadRequestException('Account does not exist.');
      }
      const hashedPassword = await PasswordManager.hashPassword(newPassword);

      user.password = hashedPassword;
      await this.accountRepo.save(user);
      return await this.sanitizeUser(user);
    } catch (error) {
      ErrorHandler.handleError('AuthService.resetPassword', error);
    }
  }

  /**
   * Retrieves new access and refresh tokens for a user.
   *
   * @param {number} userId - The ID of the user.
   * @param {string} rt - The refresh token.
   * @return {Promise<Tokens>} - A promise that resolves to an object containing the new access and refresh tokens.
   */
  async refreshTokens(userId: string, rt: string): Promise<Tokens> {
    try {
      const user = await this.accountRepo
          .createQueryBuilder('account')
          .where('account.id = :userId', { userId })
          .getOne();

      if (!user || !user.refreshToken)
        throw new ForbiddenException('Access Denied');
      const data = this.jwtService.verify(rt, {
        secret: this.configService.get('jwt.refresh_token_secret'),
      });

      if (!data) throw new ForbiddenException('Access Denied');

      const tokens = await this.getTokens({
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
      await this.updateAccountTokens(
          user.id,
          tokens.refreshToken,
          tokens.accessToken,
      );
      return tokens;
    } catch (error) {
      ErrorHandler.handleError('AuthService.refreshTokens', error);
    }
  }

  /**
   * Updates the refresh token for a given user ID.
   *
   * @param {number} userId - The ID of the user.
   * @param {string} rt - The new refresh token.
   * @return {Promise<void>} A promise that resolves when the refresh token is updated.
   */
  async updateAccountTokens(
      userId: number,
      rt: string,
      at: string,
  ): Promise<void> {
    await this.accountRepo.update(userId, {
      refreshToken: rt,
      accessToken: at,
    });
  }

  /**
   * Change password for a user.
   *
   * @param {ChangePasswordDto} payload - The payload containing the new password and the confirm new password.
   * @param {number} userId - The ID of the user whose password is being changed.
   * @return {Promise<any>} - Returns the updated user object if the password change is successful.
   */
  async changePassword(payload: ChangePasswordDto, userId: string) {
    try {
      if (payload?.newPassword != payload?.confirmNewPassword) {
        return {
          message: "New Password and Confirm New Password doesn't match",
        };
      }
      const existingUser = await this.accountRepo
          .createQueryBuilder('account')
          .where('account.id = :userId', { userId })
          .getOne();
      if (!existingUser) {
        throw new ConflictException('Invalid credentials');
      }
      const passwordMatch = await PasswordManager.matchingPasswords(
          payload.currentPassword,
          existingUser.password,
      );
      if (!passwordMatch) {
        throw new ConflictException('Invalid credentials');
      } else {
        const hashedPassword = await PasswordManager.hashPassword(
            payload?.newPassword,
        );

        existingUser.password = hashedPassword;
        await this.accountRepo.save(existingUser);
        return await this.sanitizeUser(existingUser);
      }
    } catch (error) {
      ErrorHandler.handleError('AuthService.changePassword', error);
    }
  }

  /**
   * Handles the forgot password functionality.
   *
   * @param {ForgotPasswordDto} body - The data for the forgot password request.
   * @return {Promise<void>} - A promise that resolves once the password reset email has been sent.
   */
  async forgotPassword(payload: ForgotPasswordDto) {
    try {
      const { email } = payload;
      const user = await this.accountRepo.findOne({ where: { email } });
      if (!user) {
        throw new ConflictException('Account with provided email not found!.');
      }
      const response = await this.sendOtp(email, 'reset');

      return response;
    } catch (error) {
      ErrorHandler.handleError('AuthService.forgotPassword', error);
    }
  }

  /**
   * Retrieves the current user with the specified user ID.
   *
   * @param {number} userId - The ID of the user.
   * @return {Promise<Account>} The sanitized user account.
   */
  async getCurrentUser(userId: string) {
    try {
      if (!userId) throw new BadRequestException('You are not authenticated!.');

      const user = await this.accountRepo
          .createQueryBuilder('account')
          .where('account.id = :userId', { userId })
          .getOne();

      if (!user) {
        throw new NotFoundException('You are not authenticated');
      }

      const account = this.sanitizeUser(user);
      return account;
    } catch (error) {
      ErrorHandler.handleError('AuthService.getCurrentUser', error);
    }
  }

  /**
   * Sends the OTP again to the user.
   *
   * @param {type} param - The parameter object that contains the user's email.
   * @return {Promise<{message: string; email: string;}>} The response from sending the OTP.
   */
  async sendOtpAgain(param: {
    email: string;
    otp_type: 'account_verification' | 'reset' | 'otp';
  }): Promise<{
    message: string;
    email: string;
  }> {
    try {
      const { email } = param;
      const existingUser = await this.accountRepo.findOne({
        where: { email },
      });
      if (!existingUser) {
        throw new ConflictException('Invalid credentials');
      }
      const response = await this.sendOtp(param.email, param.otp_type);
      return response;
    } catch (error) {
      ErrorHandler.handleError('AuthService.sendOtpAgain', error);
    }
  }

  /**
   * Sanitizes a user object by removing the password field.
   *
   * @param {Account} user - The user object to be sanitized.
   * @return {Account} The sanitized user object without the password field.
   */
  async sanitizeUser(user: Account) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...sanitizedAccount } = user;
    return sanitizedAccount;
  }
}
