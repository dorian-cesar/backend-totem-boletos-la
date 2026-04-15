import { POSFactory, Payment, Status, TransactionControl } from '../interfaces';
import { MockPayment } from './MockPayment';
import { MockStatus } from './MockStatus';
import { MockTransactionControl } from './MockTransactionControl';

export class MockFactory implements POSFactory {
    createPayment(): Payment {
        return new MockPayment();
    }

    createStatus(): Status {
        return new MockStatus();
    }

    createTransactionControl(): TransactionControl {
        return new MockTransactionControl();
    }
}
