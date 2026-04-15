declare module 'transbank-pos-sdk' {
    export class POSAutoservicio {
        constructor();
        ackTimeout: number;   // ms para recibir ACK del POS (default: 2000)
        posTimeout: number;   // ms para recibir respuesta final del POS (default: 150000)
        setDebug(debug: boolean): void;
        autoconnect(): Promise<string | false>;
        connect(portName: string): Promise<any>;
        disconnect(): Promise<any>;
        isConnected(): boolean;
        getConnectedPort(): string | false;
        poll(): Promise<any>;
        loadKeys(): Promise<any>;
        closeDay(): Promise<any>;
        getLastSale(): Promise<any>;
        refund(operationId: string): Promise<any>;
        sale(amount: number, ticket: string, sendVoucher?: boolean, useId?: boolean, intermediateResponseCallback?: (resp: any) => void): Promise<any>;
        raw_parser(): any;
        raw_serial_port(): any;
    }
    
    export class POSIntegrado extends POSAutoservicio {
        constructor();
    }
}
