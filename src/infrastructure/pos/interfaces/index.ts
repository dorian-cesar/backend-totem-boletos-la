export interface PaymentResponse {
    success: boolean;
    orderId: string;
    amount: number;
    authorizationCode?: string;
    receipt?: string;
    errorType?: string;
    errorMessage?: string;
}

export interface StatusResponse {
    success: boolean;
    lastTransaction?: any;
    errorType?: string;
}

export interface TransactionControlResponse {
    success: boolean;
    message?: string;
    errorType?: string;
}

export interface Payment {
    sale(amount: number, orderId: string): Promise<PaymentResponse>;
}

export interface Status {
    getLastTransaction(): Promise<StatusResponse>;
}

export interface TransactionControl {
    cancel(orderId?: string): Promise<TransactionControlResponse>;
    closeDay(): Promise<TransactionControlResponse>;
}

export interface POSFactory {
    createPayment(): Payment;
    createStatus(): Status;
    createTransactionControl(): TransactionControl;
}
