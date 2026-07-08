const http = require("http");

const endpoints = [
    "/api/admin/reports/daily-sales",
    "/api/admin/reports/monthly-sales",
    "/api/admin/reports/stock-levels",
    "/api/admin/reports/supplier-products",
    "/api/admin/reports/customers-per-day"
];

function testEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: "localhost",
            port: 3000,
            path: path,
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`[PASS] ${path} returned status ${res.statusCode} and ${json.length} records.`);
                        resolve(true);
                    } catch (e) {
                        console.log(`[FAIL] ${path} returned valid status but invalid JSON: ${e.message}`);
                        resolve(false);
                    }
                } else {
                    console.log(`[FAIL] ${path} returned status ${res.statusCode}: ${data}`);
                    resolve(false);
                }
            });
        });

        req.on("error", (e) => {
            console.log(`[FAIL] ${path} error: ${e.message}`);
            resolve(false);
        });

        req.end();
    });
}

async function runTests() {
    console.log("Starting report API validation tests...");
    let allPassed = true;
    for (const endpoint of endpoints) {
        const passed = await testEndpoint(endpoint);
        if (!passed) allPassed = false;
    }
    if (allPassed) {
        console.log("All API endpoints validated successfully!");
        process.exit(0);
    } else {
        console.log("Some API endpoints failed validation.");
        process.exit(1);
    }
}

runTests();
