const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'uploads', 'ifc-cache');

function ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}

function getCacheFilePath(hash, limit) {
    ensureCacheDir();
    return path.join(CACHE_DIR, `${hash}_${limit}.json`);
}

async function computeFileHash(filePath) {
    const hash = crypto.createHash('sha1');
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

async function readCachedParseResult(hash, limit) {
    const cachePath = getCacheFilePath(hash, limit);
    try {
        const raw = await fs.promises.readFile(cachePath, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed && parsed.success ? parsed : null;
    } catch (error) {
        return null;
    }
}

async function writeCachedParseResult(hash, limit, result) {
    const cachePath = getCacheFilePath(hash, limit);
    const payload = {
        ...result,
        cacheHash: hash,
        cachedAt: new Date().toISOString()
    };
    await fs.promises.writeFile(cachePath, JSON.stringify(payload), 'utf8');
    return payload;
}

module.exports = {
    computeFileHash,
    readCachedParseResult,
    writeCachedParseResult
};
