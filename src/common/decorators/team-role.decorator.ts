import { Permissions } from '@/database/interfaces';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Permissions[]) => SetMetadata(ROLES_KEY, roles);