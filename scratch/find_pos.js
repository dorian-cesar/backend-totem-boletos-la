const { POSAutoservicio } = require('transbank-pos-sdk');
const { SerialPort } = require('serialport');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function findPos() {
  console.log('Searching for PAX POS ports...');
  const ports = await SerialPort.list();
  
  // Filtro extendido igual al del adaptador principal
  const paxPorts = ports.filter(p => 
    (p.manufacturer && p.manufacturer.toLowerCase().includes('pax')) ||
    (p.friendlyName && p.friendlyName.toLowerCase().includes('pax')) ||
    (p.pnpId && p.pnpId.toLowerCase().includes('vid_2fb8'))
  ).map(p => p.path);
  
  if (paxPorts.length === 0) {
    console.log('No PAX ports found via manufacturer/ID filtering.');
    return;
  }

  console.log(`Found candidate ports: ${paxPorts.join(', ')}`);
  const speeds = [115200, 57600]; // En IM30 suelen ser estas dos

  for (const port of paxPorts) {
    for (const speed of speeds) {
      console.log(`\n[SAFE TEST] Testing ${port} @ ${speed} baud...`);
      const pos = new POSAutoservicio();
      
      try {
        // Conexión con tiempo de estabilización
        await Promise.race([
          pos.connect(port, speed),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 4000))
        ]);
        
        await delay(1000); // Retardo de estabilización crucial
        
        console.log(`Connected to ${port}. Sending poll...`);
        const response = await pos.poll();
        console.log(`Poll response from ${port}:`, response);
        
        if (response === true) {
          console.log(`\n>>> SUCCESS: POS confirmed on ${port} @ ${speed}`);
          await pos.disconnect().catch(() => {});
          return;
        }
        
        await pos.disconnect().catch(() => {});
      } catch (err) {
        console.log(`  - Port ${port} @ ${speed} failed: ${err.message}`);
        try { 
          if (pos.port) {
            pos.port.removeAllListeners();
            if (pos.port.isOpen) await new Promise(r => pos.port.close(r));
            if (pos.port.destroy) pos.port.destroy();
          }
        } catch (e) {}
      }
      
      await delay(800); // Retardo entre intentos de velocidad
    }
    await delay(1000); // Retardo entre intentos de puerto
  }
  console.log('\nCould not find responding POS on any candidate port.');
}

findPos();

