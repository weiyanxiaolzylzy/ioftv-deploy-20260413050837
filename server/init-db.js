const dbApi = require('./database-entry');

async function main() {
    if (typeof dbApi.initDatabase !== 'function') {
        throw new Error('当前数据库模块不支持初始化');
    }
    await dbApi.initDatabase();
    console.log('[DB] init complete');
    if (dbApi.db && typeof dbApi.db.end === 'function') {
        await dbApi.db.end();
    }
}

main().catch(async (error) => {
    console.error('[DB] init failed:', error.message);
    if (dbApi.db && typeof dbApi.db.end === 'function') {
        try {
            await dbApi.db.end();
        } catch (closeError) {
            console.error('[DB] close failed:', closeError.message);
        }
    }
    process.exit(1);
});
