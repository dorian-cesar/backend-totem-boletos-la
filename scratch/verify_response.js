const { POSAutoservicio } = require('transbank-pos-sdk');
const pos = new POSAutoservicio();

// Raw response string reported by user
const rawResponse = "0210|01|597053020512|SIA01983";

console.log("--- Testing Sale Response Parsing ---");
const parsedResponse = pos.saleResponse(rawResponse);
console.log("Parsed Response Object:", JSON.stringify(parsedResponse, null, 2));

console.log("\n--- Verification of Success Logic ---");
const isSuccessful = parsedResponse.successful || parsedResponse.responseCode === 0;
console.log(`Response Code: ${parsedResponse.responseCode}`);
console.log(`Calculated Success: ${isSuccessful}`);

if (isSuccessful === false) {
    console.log("\n✅ VERIFICATION PASSED: The rejected response (01) is correctly interpreted as success: false.");
} else {
    console.log("\n❌ VERIFICATION FAILED: The rejected response (01) was interpreted as success: true.");
}
