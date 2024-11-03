import { Logger } from '@nestjs/common';

export class ErrorManager {
    constructor(private readonly logger: Logger) {}

    handleError(service: string, error: Error): void {
        this.logger.error(
            `Error in ${service} service: ${error?.name} => ${error?.message}, ${error?.stack}`,
        );
        throw error;
    }

    // -> Create a static instance of ErrorManager
    private static instance: ErrorManager;

    // -> Static method to get the instance
    static getInstance(logger: Logger): ErrorManager {
        if (!this.instance) {
            this.instance = new ErrorManager(logger);
        }
        return this.instance;
    }
}

export const ErrorHandler = ErrorManager.getInstance(
    new Logger('Server-Error-Handler'),
);
