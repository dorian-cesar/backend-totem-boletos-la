import { POSFactory, Payment, Status, TransactionControl } from '../interfaces';
import { TransbankPayment } from './TransbankPayment';
import { TransbankStatus } from './TransbankStatus';
import { TransbankTransactionControl } from './TransbankTransactionControl';

export class TransbankFactory implements POSFactory {
    createPayment(): Payment {
        return new TransbankPayment();
    }

    createStatus(): Status {
        return new TransbankStatus();
    }

    createTransactionControl(): TransactionControl {
        return new TransbankTransactionControl();
    }
}
