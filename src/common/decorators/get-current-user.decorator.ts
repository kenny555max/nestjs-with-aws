import { JwtPayload, JwtPayloadWithRt } from '@/auth/interfaces';
import configuration from '@/config/env.config';
import {
    ExecutionContext,
    Logger,
    UnauthorizedException,
    createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const GetCurrentUser = createParamDecorator(
    (data: keyof JwtPayloadWithRt | undefined, context: ExecutionContext) => {
        const request = context?.switchToHttp()?.getRequest();

        const jwt = new JwtService();
        const config = configuration();
        const logger = new Logger();

        if (request.headers && request.headers.authorization) {
            const authorization = request.headers.authorization.split(' ')[1];
            let decoded: JwtPayload;

            try {
                decoded = jwt.verify(authorization, {
                    secret: config.jwt.access_token_secret,
                    ignoreExpiration: false,
                });
                // returns currently logged in user object
                return decoded;
            } catch (error) {
                logger.error(error?.message, error?.stackTrace, error?.name);
                if (error?.name?.toLocaleLowerCase().includes('token'))
                    throw new UnauthorizedException('Session Expired!');
                throw error;
            }
        }
    },
);
