const { parseIfcProducts } = require('./ifc-parser');

process.on('message', async (payload) => {
    if (!payload || !payload.filePath) {
        process.send && process.send({ success: false, message: 'missing filePath' });
        process.exit(1);
        return;
    }

    try {
        const result = await parseIfcProducts(payload.filePath, payload.limit || 8000);
        process.send && process.send({ success: true, result });
        process.exit(0);
    } catch (error) {
        process.send && process.send({
            success: false,
            message: error && error.message ? String(error.message) : 'IFC 解析失败'
        });
        process.exit(1);
    }
});
