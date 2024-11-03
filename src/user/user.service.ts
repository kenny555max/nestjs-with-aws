import { Account } from '@/database/entities';
import { ErrorHandler } from '@/utils';
import { paginateQuery } from '@/utils/pagination';
import { QueryDto, SortOrderEnum } from '@/utils/query';
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {UpdateAccountDto} from "@/database/dtos";

@Injectable()
export class UserService {
  constructor(
      @InjectRepository(Account)
      private accountRepo: Repository<Account>,
  ) {}

  async findAll(query: QueryDto) {
    try {
      const {
        limit,
        page,
        search,
        sort = 'created_at',
        sortOrder = SortOrderEnum.DESC,
        status,
      } = query;

      let queryBuilder = this.accountRepo.createQueryBuilder('user');

      // Apply search filtering
      if (search) {
        queryBuilder = queryBuilder.where(
            'user.firstname LIKE :searchQuery OR user.lastname LIKE :searchQuery OR user.email LIKE :searchQuery OR user.fullname LIKE :searchQuery OR user.phone LIKE :searchQuery',
            {
              searchQuery: `%${search}%`,
            },
        );
      }

      // Apply status filtering
      if (status) {
        queryBuilder = queryBuilder.andWhere('user.status = :status', {
          status,
        });
      }

      // Apply sorting
      const validSortColumns = ['id', 'name', 'created_at', 'updated_at']; // Define valid columns for sorting
      if (validSortColumns.includes(sort)) {
        const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        queryBuilder = queryBuilder.orderBy(`user.${sort}`, order);
      } else {
        throw new NotFoundException(`Invalid sort column: ${sort}`);
      }

      // Apply pagination

      const response = await paginateQuery(queryBuilder, page, limit);

      return response;
    } catch (error) {
      ErrorHandler.handleError('UserService.findAll', error);
    }
  }

  async findOne(id: number) {
    try {
      const account = await this.accountRepo
          .createQueryBuilder('user')
          .where('user.id = :id', { id })
          .getOne();

      if (!account) {
        throw new NotFoundException('Account not found!.');
      }

      return { message: 'success', data: account };
    } catch (error) {
      ErrorHandler.handleError('UserService.findOne', error);
    }
  }

  async updateUser(payload: UpdateAccountDto, userId: string) {
    try {
      const { location, email, firstName, lastName, occupation, age, address, picture, gender, interest, height, religion } = payload;

      const account = await this.accountRepo
          .createQueryBuilder('account')
          .where('account.id = :userId', { userId })
          .getOne();

      if (!account) {
        throw new NotFoundException('You are not logged in.');
      }

      await this.accountRepo.update(userId, {
        location,
        email,
        firstName,
        lastName,
        occupation,
        age,
        address,
        gender,
        picture,
        interest,
        height,
        religion
      });

      return { message: 'Profile updated successfully!.' };
    } catch (error) {
      ErrorHandler.handleError('UserService.updateUser', error);
    }
  }
}
