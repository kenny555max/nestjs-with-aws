import { JwtPayload } from '@/auth/interfaces';
import configuration from '../../config/env.config';
import {
    createParamDecorator,
    ExecutionContext,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const GetCurrentUserId = createParamDecorator(
    (_: undefined, context: ExecutionContext): string => {
        const request = context?.switchToHttp()?.getRequest();

        const jwt = new JwtService();
        const config = configuration();
        const logger = new Logger();

        if (!request?.headers?.authorization) {
            throw new NotFoundException(
                'You are not logged in, Please login to proceed.',
            );
        }

        if (request.headers && request.headers.authorization) {
            const authorization = request.headers.authorization.split(' ')[1];
            if (!authorization) {
                throw new NotFoundException('You are not logged in');
            }
            let decoded: JwtPayload;
            try {
                decoded = jwt.verify(authorization, {
                    secret: config.jwt.access_token_secret,
                    ignoreExpiration: false,
                });

                return decoded.id;
            } catch (error) {
                logger.error(error?.message, error?.stackTrace, error?.name);
                if (error?.name?.toLocaleLowerCase().includes('token'))
                    throw new UnauthorizedException('Session Expired!');
                throw error;
            }
        }
        // else {
        //   throw new NotFoundException('Access Token not present');
        // }
    },
);