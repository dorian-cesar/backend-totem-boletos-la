import logger from '../../utils/logger';

export type JobFunction<T> = () => Promise<T>;

/**
 * A FIFO Queue that enforces STRICT 1-concurrency for hardware resources.
 */
class PaymentQueue {
    private static instance: PaymentQueue;
    private queue: { job: JobFunction<any>; resolve: (v: any) => void; reject: (e: any) => void }[] = [];
    private isExecuting: boolean = false;

    private constructor() {}

    public static getInstance(): PaymentQueue {
        if (!PaymentQueue.instance) {
            PaymentQueue.instance = new PaymentQueue();
        }
        return PaymentQueue.instance;
    }

    /**
     * Enqueue a job and return a promise that resolves when the job is fully done.
     */
    public enqueue<T>(job: JobFunction<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ job, resolve, reject });
            logger.info("Nuevo trabajo encolado", { queueSize: this.queue.length });
            this.executeNext();
        });
    }

    private async executeNext() {
        if (this.isExecuting || this.queue.length === 0) {
            return;
        }

        this.isExecuting = true;
        const currentItem = this.queue.shift();

        if (currentItem) {
            try {
                // Execute the job wrapped in try-catch so it doesn't block the queue forever
                const result = await currentItem.job();
                currentItem.resolve(result);
            } catch (error) {
                logger.error("Falló la ejecución del trabajo en la cola", { error });
                currentItem.reject(error);
            }
        }

        this.isExecuting = false;
        // Schedule next execution immediately
        setImmediate(() => {
            this.executeNext();
        });
    }
}

export default PaymentQueue;
