import * as bcrypt from 'bcryptjs';

export class PasswordManager {
    static async hashPassword(password: string) {
        return await bcrypt.hash(password, 10);
    }

    static async matchingPasswords(
        incomingPassword: string,
        currentPassword: string,
    ) {
        return await bcrypt.compare(incomingPassword, currentPassword);
    }
}