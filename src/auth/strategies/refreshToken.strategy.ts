import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, JwtPayloadWithRt } from '../interfaces';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.get<string>('JWT_REFRESH_TOKEN_SECRET'),
            passReqToCallback: true,
        });
    }

    /**
     * Validates the request and payload to return the JwtPayloadWithRt.
     *
     * @param {Request} req - The request object.
     * @param {JwtPayload} payload - The JWT payload.
     * @returns {JwtPayloadWithRt} - The JWT payload with the refresh token.
     */
    validate(req: Request, payload: JwtPayload): JwtPayloadWithRt {
        const refreshToken = req
            ?.get('authorization')
            ?.replace('Bearer', '')
            .trim();

        if (!refreshToken) throw new ForbiddenException('Refresh token malformed');

        return {
            ...payload,
            refreshToken,
        };
    }
}
