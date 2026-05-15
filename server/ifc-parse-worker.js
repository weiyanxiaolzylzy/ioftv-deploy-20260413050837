const { parseIfcProducts } = require('./ifc-parser');
const { computeFileHash, readCachedParseResult, writeCachedParseResult } = require('./ifc-parse-cache');

process.on('message', async (payload) => {
    if (!payload || !payload.filePath) {
        process.send && process.send({ success: false, message: 'missing filePath' });
        process.exit(1);
        return;
    }

    try {
        const limit = payload.limit || 8000;
        const fileHash = await computeFileHash(payload.filePath);
        const cached = await readCachedParseResult(fileHash, limit);
        if (cached) {
            process.send && process.send({
                success: true,
                result: {
                    ...cached,
                    fromCache: true
                }
            });
            process.exit(0);
            return;
        }

        const result = await parseIfcProducts(payload.filePath, limit);
        await writeCachedParseResult(fileHash, limit, result);
        process.send && process.send({
            success: true,
            result: {
                ...result,
                fileHash,
                fromCache: false
            }
        });
        process.exit(0);
    } catch (error) {
        process.send && process.send({
            success: false,
            message: error && error.message ? String(error.message) : 'IFC 解析失败'
        });
        process.exit(1);
    }
});
