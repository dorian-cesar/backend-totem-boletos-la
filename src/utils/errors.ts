export class AppError extends Error {
    constructor(public code: number, public type: string, message: string) {
        super(message);
        this.name = 'AppError';
    }
}
