const { POSAutoservicio } = require('transbank-pos-sdk');

async function testPorts() {
  const ports = ['COM27', 'COM28', 'COM29'];
  const baudRate = 115200;

  for (const port of ports) {
    console.log(`\nTesting ${port}...`);
    const pos = new POSAutoservicio();
    try {
      await pos.connect(port, baudRate);
      console.log(`Connected to ${port}. Sending poll...`);
      const response = await pos.poll();
      console.log(`Poll response from ${port}:`, response);
      await pos.disconnect();
      console.log(`Found it! Port ${port} responded.`);
      return;
    } catch (err) {
      console.log(`Port ${port} failed: ${err.message}`);
      try { await pos.disconnect(); } catch (e) {}
    }
  }
}

testPorts();
