const path = require('path');
const { parseIfcProducts } = require('./ifc-parser');

async function main() {
    const input = process.argv[2];
    if (!input) {
        console.error('Usage: node server/inspect-ifc.js <ifc-file>');
        process.exit(1);
        return;
    }

    const filePath = path.resolve(process.cwd(), input);
    const result = await parseIfcProducts(filePath, 500);
    console.log(JSON.stringify({
        filePath,
        total: result.total,
        assemblySummaries: result.assemblySummaries
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
