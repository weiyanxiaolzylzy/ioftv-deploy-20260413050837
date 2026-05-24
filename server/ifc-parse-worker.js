const { parseIfcProducts } = require('./ifc-parser');
const { computeFileHash, readCachedParseResult, writeCachedParseResult } = require('./ifc-parse-cache');

function sendAndExit(message, code = 0) {
    if (!process.send) {
        process.exit(code);
        return;
    }

    process.send(message, (error) => {
        if (error) {
            console.error('[IFC Parse Worker] IPC send failed:', error);
            process.exit(1);
            return;
        }
        process.exit(code);
    });
}

process.on('message', async (payload) => {
    if (!payload || !payload.filePath) {
        sendAndExit({ success: false, message: 'missing filePath' }, 1);
        return;
    }

    try {
        const limit = payload.limit || 8000;
        const fileHash = await computeFileHash(payload.filePath);
        const cached = await readCachedParseResult(fileHash, limit);
        if (cached) {
            sendAndExit({
                success: true,
                result: {
                    ...cached,
                    fromCache: true
                }
            }, 0);
            return;
        }

        const result = await parseIfcProducts(payload.filePath, limit);
        await writeCachedParseResult(fileHash, limit, result);
        sendAndExit({
            success: true,
            result: {
                ...result,
                fileHash,
                fromCache: false
            }
        }, 0);
    } catch (error) {
        sendAndExit({
            success: false,
            message: error && error.message ? String(error.message) : 'IFC 解析失败'
        }, 1);
    }
});
