export type JwtPayload = {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: number;
};

export enum AuthProviders {
    GOOGLE = 'GOOGLE',
    FACEBOOK = 'FACEBOOK',
    EMAIL_PASSWORD = 'EMAIL_PASSWORD',
}

export type JwtPayloadWithRt = JwtPayload & { refreshToken: string };

export type Tokens = {
    accessToken: string;
    refreshToken: string;
};