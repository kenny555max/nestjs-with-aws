import {GetCurrentUser, GetCurrentUserId, Public} from '@/common/decorators';
import {
  Body,
  Controller, Get,
  HttpCode,
  HttpStatus,
  Post, UseGuards,
  Version,
  Query
} from '@nestjs/common';
import { RtGuard } from '@/common/guards';
import {
  ApiBearerAuth,
  ApiBody, ApiOkResponse,
  ApiOperation, ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  AccountDto, ChangePasswordDto,
  CreateAccountDto, ForgotPasswordDto,
  LoginAccountDto, OtpVerificationDto, ResetPasswordDto
} from "@/database/dtos";
import {Tokens} from "@/auth/interfaces";
import {otpTypeStatusEnum} from "@/database/interfaces";

@ApiTags('auth-controller')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {
  }

  @Public()
  @Version('1')
  @ApiOperation({summary: 'Create Account'}) // Add a summary for the endpoint
  @ApiBody({type: CreateAccountDto}) // Add a request body definition
  @ApiResponse({status: 200, description: 'Success'}) // Add a response definition
  @ApiResponse({status: 201, description: 'Created'}) // Add a response definition
  @ApiResponse({status: 400, description: 'Bad Request'}) // Add additional response definitions if needed
  @ApiResponse({status: 500, description: 'Internal Server Error'})
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  createAccount(@Body() payload: CreateAccountDto) {
    return this.authService.createUser(payload);
  }

  @Post('login')
  @Version('1')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'signinLocal()' })
  @ApiOkResponse({ type: AccountDto })
  signinLocal(@Body() payload: LoginAccountDto): Promise<any> {
    return this.authService.loginAccount(payload);
  }

  @Public()
  @ApiResponse({ status: 200, description: 'OTP Verified' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'User Not Found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @Version('1')
  @Post('verify-otp')
  @ApiOperation({ summary: 'verifyAccount()' })
  verifyAccount(@Body() otpVerificationDto: OtpVerificationDto) {
    return this.authService.verifyAccount(otpVerificationDto);
  }

  @Version('1')
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AccountDto })
  @ApiOperation({ summary: 'resetPassword()' })
  resetPassword(@Body() payload: ResetPasswordDto): Promise<any> {
    return this.authService.resetPassword(payload);
  }

  @Version('1')
  @Public()
  @Post('resend-otp')
  @ApiOperation({ summary: 'sendOtpAgain()' })
  @ApiQuery({ name: 'email', required: true, type: String })
  @ApiQuery({ name: 'otp_type', required: true, enum: otpTypeStatusEnum })
  sendOtpAgain(
      @Query('email') email: string,
      @Query('otp_type') otp_type: otpTypeStatusEnum,
  ) {
    return this.authService.sendOtpAgain({ email, otp_type });
  }

  @Version('1')
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ForgotPasswordDto })
  @ApiOperation({ summary: 'forgotPassword()' })
  forgotPassword(@Body() payload: ForgotPasswordDto) {
    return this.authService.forgotPassword(payload);
  }

  @Version('1')
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'changePassword()' })
  changePassword(
      @GetCurrentUserId() userId: string,
      @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(changePasswordDto, userId);
  }

  @Version('1')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'logout()' })
  @ApiBearerAuth()
  logout(@GetCurrentUserId() userId: string): Promise<boolean> {
    return this.authService.logout(userId);
  }

  @Version('1')
  @Public()
  @UseGuards(RtGuard)
  @Get('refresh-token')
  @HttpCode(HttpStatus.OK)
  refreshTokens(
      @GetCurrentUserId() userId: string,
      @GetCurrentUser('refreshToken') refreshToken: string,
  ): Promise<Tokens> {
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Version('1')
  @Get('user')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
        'getLoggedInUser() =>  returns the currently logged in user object',
  })
  getLoggedInUser(@GetCurrentUserId() user_id: string) {
    return this.authService.getCurrentUser(user_id);
  }
}