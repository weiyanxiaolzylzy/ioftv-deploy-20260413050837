const client = String(process.env.DB_CLIENT || '').trim().toLowerCase();

if (!client || client === 'postgres' || client === 'pgsql' || client === 'postgresql') {
    module.exports = require('./database-pg');
} else {
    module.exports = require('./database');
}
