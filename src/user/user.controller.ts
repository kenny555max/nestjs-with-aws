import { GetCurrentUserId } from '@/common/decorators';
import {UpdateAccountDto} from '@/database/dtos';
import { QueryDto } from '@/utils/query';
import {
  Body,
  Controller,
  Get,
    Post,
  Param,
  Put,
  Query, UploadedFile, UseInterceptors,
  ValidationPipe,
  Version,
} from '@nestjs/common';
import { UserService } from './user.service';
import {AwsS3Service} from "@/aws-s3 service/aws.s3.service";
import {FileInterceptor} from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';

@ApiTags('User Management')
@Controller('user')
export class UserController {
  constructor(
      private readonly userService: UserService,
      private readonly awsS3Service: AwsS3Service,
  ) {}

  /**
   * Get a list of all users based on the provided query parameters.
   *
   * @param {QueryDto} query - The query parameters for filtering users.
   * @returns A list of users matching the query.
   */
  @Version('1')
  @ApiOperation({ summary: 'Retrieve all users' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved users.' })
  @Get()
  findAll(@Query(new ValidationPipe({ transform: true })) query: QueryDto) {
    return this.userService.findAll(query);
  }

  /**
   * Retrieve a specific user by ID.
   *
   * @param {string} id - The ID of the user.
   * @returns The user object if found.
   */
  @Version('1')
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  /**
   * Update the profile of the currently authenticated user.
   *
   * @param {string} userId - The ID of the user to update.
   * @param {UpdateAccountDto} payload - The data to update in the user profile.
   * @returns The updated user profile.
   */
  @Version('1')
  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully.' })
  updateProfile(
      @GetCurrentUserId() userId: string,
      @Body() payload: UpdateAccountDto,
  ) {
    return this.userService.updateUser(payload, userId);
  }

  /**
   * Uploads a user profile image to the AWS S3 bucket and returns the CloudFront URL of the image.
   *
   * @param {Express.Multer.File} image - The profile image file to upload.
   * @returns {Promise<{ message: string; imageUrl: string }>} The URL of the uploaded image accessible via CloudFront and a message.
   */
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Upload a user profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'User profile image to upload',
    required: true,
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary'
        }
      }
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully.' })
  async uploadUserImage(
      @UploadedFile() image: Express.Multer.File,
  ): Promise<{ message: string; imageUrl: string; }> {
    const imageUrl =  await this.awsS3Service.uploadImage(image);
    return { message: "Image uploaded successfully", imageUrl };
  }
}

