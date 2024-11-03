import { Injectable } from '@nestjs/common';

@Injectable()
export class IdentifierService {
    /**
     * Generates a random identifier of specified length.
     *
     * @param {number} [length=4] - The length of the identifier. Defaults to 4.
     * @return {string} The generated random identifier.
     */
    generateRandomIdentifier = (length = 4): string => {
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters.charAt(randomIndex);
        }
        return result;
    };

    /**
     * Generates a one-time password (OTP) between 100000 and 999999.
     *
     * @return {number} The generated OTP.
     */
    generateOTP(): number {
        const minm = 100000;
        const maxm = 999999;
        return Math.floor(Math.random() * (maxm - minm + 1)) + minm;
    }
}
