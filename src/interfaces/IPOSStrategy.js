class IPOSStrategy {
  constructor() {
    if (this.constructor === IPOSStrategy) {
      throw new Error("Abstract classes can't be instantiated.");
    }
  }

  async connect() {
    throw new Error("Method 'connect()' must be implemented.");
  }

  async disconnect() {
    throw new Error("Method 'disconnect()' must be implemented.");
  }

  async loadKeys() {
    throw new Error("Method 'loadKeys()' must be implemented.");
  }

  async sale(amount, ticket) {
    throw new Error("Method 'sale(amount, ticket)' must be implemented.");
  }

  async getStatus() {
    throw new Error("Method 'getStatus()' must be implemented.");
  }
}

module.exports = IPOSStrategy;
