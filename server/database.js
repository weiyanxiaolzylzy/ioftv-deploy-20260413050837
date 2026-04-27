/**
 * SQLite 数据库连接层
 * 山西钢构科工智能检测系统
 * 替代 server/data.json 的 SQLite 版本
 *
 * 使用方法：
 *   const db = require('./database');         // 获取数据库实例
 *   db.get('projects')                        // 获取所有项目
 *   db.get('projects', { id: 'xxx' })         // 按条件查询
 *   db.run('INSERT INTO projects ...')        // 执行 SQL
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '..', 'storage');
const DB_PATH = path.join(STORAGE_PATH, 'database', 'system.db');

// 确保目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 连接数据库
let db;
try {
    db = new Database(DB_PATH, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : null,
        fileMustExist: false
    });
    // WAL 模式：读写并发性能更好
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    console.log(`[DB] SQLite 数据库已连接: ${DB_PATH}`);
} catch (err) {
    console.error('[DB] 数据库连接失败:', err.message);
    process.exit(1);
}

/**
 * 执行带参数的查询
 * @param {string} sql - SQL 语句
 * @param {object} params - 参数
 */
function query(sql, params = {}) {
    try {
        const stmt = db.prepare(sql);
        const rows = stmt.all(params);
        return { success: true, data: rows };
    } catch (err) {
        console.error('[DB Query Error]', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 执行带参数的增删改
 * @param {string} sql - SQL 语句
 * @param {object} params - 参数
 */
function run(sql, params = {}) {
    try {
        const stmt = db.prepare(sql);
        const result = stmt.run(params);
        return {
            success: true,
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid
        };
    } catch (err) {
        console.error('[DB Run Error]', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 获取单条记录
 * @param {string} sql - SQL 语句
 * @param {object} params - 参数
 */
function get(sql, params = {}) {
    try {
        const stmt = db.prepare(sql);
        const row = stmt.get(params);
        return { success: true, data: row };
    } catch (err) {
        console.error('[DB Get Error]', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 事务执行（多条 SQL 原子操作）
 * @param {function} callback - 回调函数，接收 db 对象
 */
function transaction(callback) {
    try {
        const result = db.transaction(callback)();
        return { success: true, data: result };
    } catch (err) {
        console.error('[DB Transaction Error]', err.message);
        return { success: false, error: err.message };
    }
}

// =============================================
// 业务数据操作层（替代原 data.json 的 API）
// =============================================

const data = {
    // -------- 活跃项目 --------
    getActiveProjectId: () => {
        const r = get("SELECT value FROM settings WHERE key = 'activeProjectId'");
        return r.success ? r.data?.value : null;
    },
    setActiveProjectId: (id) => {
        return run(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('activeProjectId', ?, datetime('now', '+8 hours'))",
            { id }
        );
    },

    // -------- 项目 --------
    getAllProjects: () => {
        return query("SELECT * FROM projects ORDER BY created_at DESC");
    },
    getProjectById: (id) => {
        return get("SELECT * FROM projects WHERE id = @id", { id });
    },
    getActiveProject: () => {
        return get("SELECT * FROM projects WHERE is_active = 1 LIMIT 1");
    },
    createProject: (project) => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return run(
            `INSERT INTO projects (id, name, province, city, ifc_url, ifc_filename, ifc_file_size,
              center_lat, center_lng, beam_column_count, inspected_count, qualified_count,
              qualified_rate, is_active, created_at, updated_at)
             VALUES (@id, @name, @province, @city, @ifc_url, @ifc_filename, @ifc_file_size,
              @center_lat, @center_lng, @beam_column_count, @inspected_count, @qualified_count,
              @qualified_rate, @is_active, @created_at, @updated_at)`,
            {
                id: project.id || `p${Date.now()}`,
                name: project.name || '',
                province: project.province || '',
                city: project.city || '',
                ifc_url: project.ifc_url || '',
                ifc_filename: project.ifc_filename || '',
                ifc_file_size: project.ifc_file_size || 0,
                center_lat: project.center_lat || null,
                center_lng: project.center_lng || null,
                beam_column_count: project.beam_column_count || 0,
                inspected_count: project.inspected_count || 0,
                qualified_count: project.qualified_count || 0,
                qualified_rate: project.qualified_rate || '0%',
                is_active: project.is_active || 0,
                created_at: now,
                updated_at: now
            }
        );
    },
    updateProject: (id, updates) => {
        const fields = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => `${k} = @${k}`)
            .join(', ');
        if (!fields) return { success: false, error: 'No fields to update' };
        return run(
            `UPDATE projects SET ${fields}, updated_at = datetime('now', '+8 hours') WHERE id = @id`,
            { ...updates, id }
        );
    },
    deleteProject: (id) => {
        return run("DELETE FROM projects WHERE id = @id", { id });
    },
    setActiveProject: (id) => {
        return transaction(() => {
            db.prepare("UPDATE projects SET is_active = 0").run();
            if (id) {
                db.prepare("UPDATE projects SET is_active = 1 WHERE id = ?").run(id);
            }
        });
    },

    // -------- 构件 --------
    getComponentsByProject: (projectId) => {
        return query(
            "SELECT * FROM components WHERE project_id = @projectId ORDER BY created_at DESC",
            { projectId }
        );
    },
    getComponentById: (id) => {
        return get("SELECT * FROM components WHERE id = @id", { id });
    },
    createComponent: (component) => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return run(
            `INSERT INTO components (id, project_id, name, spec, team_leader, quality_inspector,
              quality_manager, plan_date, status, ifc_element_id, ifc_global_id, ifc_type,
              created_at, updated_at)
             VALUES (@id, @project_id, @name, @spec, @team_leader, @quality_inspector,
              @quality_manager, @plan_date, @status, @ifc_element_id, @ifc_global_id, @ifc_type,
              @created_at, @updated_at)`,
            {
                id: component.id || `GJ-${Date.now()}`,
                project_id: component.project_id,
                name: component.name || '',
                spec: component.spec || '',
                team_leader: component.team_leader || '',
                quality_inspector: component.quality_inspector || '',
                quality_manager: component.quality_manager || '',
                plan_date: component.plan_date || null,
                status: component.status || '待检测',
                ifc_element_id: component.ifc_element_id || '',
                ifc_global_id: component.ifc_global_id || '',
                ifc_type: component.ifc_type || '',
                created_at: now,
                updated_at: now
            }
        );
    },
    updateComponent: (id, updates) => {
        const fields = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => `${k} = @${k}`)
            .join(', ');
        if (!fields) return { success: false, error: 'No fields to update' };
        return run(
            `UPDATE components SET ${fields}, updated_at = datetime('now', '+8 hours') WHERE id = @id`,
            { ...updates, id }
        );
    },
    deleteComponent: (id) => {
        return run("DELETE FROM components WHERE id = @id", { id });
    },

    // -------- 班组 --------
    getAllGroups: () => {
        return query("SELECT * FROM groups ORDER BY created_at DESC");
    },
    createGroup: (group) => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return run(
            "INSERT INTO groups (id, name, photo_url, created_at, updated_at) VALUES (@id, @name, @photo_url, @created_at, @updated_at)",
            {
                id: group.id || `${Date.now()}`,
                name: group.name,
                photo_url: group.photo_url || '/people.jpg',
                created_at: now,
                updated_at: now
            }
        );
    },
    updateGroup: (id, updates) => {
        const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = @${k}`).join(', ');
        if (!fields) return { success: false, error: 'No fields to update' };
        return run(
            `UPDATE groups SET ${fields}, updated_at = datetime('now', '+8 hours') WHERE id = @id`,
            { ...updates, id }
        );
    },
    deleteGroup: (id) => {
        return run("DELETE FROM groups WHERE id = @id", { id });
    },

    // -------- 排名 --------
    getRankings: (period = null) => {
        if (period) {
            return query("SELECT * FROM rankings WHERE period = @period ORDER BY qualified_rate DESC", { period });
        }
        // 返回最新月份的排名
        const latest = get("SELECT period FROM rankings ORDER BY period DESC LIMIT 1");
        const p = latest.success && latest.data ? latest.data.period : null;
        if (!p) return { success: true, data: [] };
        return query("SELECT * FROM rankings WHERE period = @period ORDER BY qualified_rate DESC", { period: p });
    },
    createRanking: (ranking) => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return run(
            "INSERT INTO rankings (group_id, group_name, qualified_rate, total_count, qualified_count, period, created_at) VALUES (@group_id, @group_name, @qualified_rate, @total_count, @qualified_count, @period, @created_at)",
            {
                group_id: ranking.group_id || null,
                group_name: ranking.group_name || ranking.name || '',
                qualified_rate: ranking.qualified_rate || ranking.value || 0,
                total_count: ranking.total_count || 0,
                qualified_count: ranking.qualified_count || 0,
                period: ranking.period || new Date().toISOString().substring(0, 7),
                created_at: now
            }
        );
    },
    updateRankingsByPeriod: (period, rankings) => {
        return transaction(() => {
            db.prepare("DELETE FROM rankings WHERE period = ?").run(period);
            for (const r of rankings) {
                db.prepare(
                    "INSERT INTO rankings (group_id, group_name, qualified_rate, total_count, qualified_count, period, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
                ).run(r.group_id || null, r.group_name || r.name, r.qualified_rate || r.value || 0, r.total_count || 0, r.qualified_count || 0, period, new Date().toISOString().replace('T', ' ').substring(0, 19));
            }
        });
    },

    // -------- 标兵 --------
    getStar: () => {
        return get("SELECT * FROM star WHERE id = 1");
    },
    updateStar: (updates) => {
        return run(
            `UPDATE star SET group_name = @group_name, photo_url = @photo_url,
              passing_rate = @passing_rate, first_pass_rate = @first_pass_rate,
              photo_updated_at = @photo_updated_at, updated_at = datetime('now', '+8 hours')
             WHERE id = 1`,
            {
                group_name: updates.group_name || '',
                photo_url: updates.photo_url || '/people.jpg',
                passing_rate: updates.passing_rate || 0,
                first_pass_rate: updates.first_pass_rate || 0,
                photo_updated_at: updates.photo_updated_at || null
            }
        );
    },

    // -------- 今日计划 --------
    getTodayPlan: (date = null) => {
        const d = date || new Date().toISOString().substring(0, 10);
        return query("SELECT * FROM today_plan WHERE date = @date ORDER BY created_at", { date: d });
    },
    createTodayPlan: (item) => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return run(
            "INSERT INTO today_plan (id, date, project_id, component_id, component_name, team_leader, quality_inspector, quality_manager, plan_date, status, created_at) VALUES (@id, @date, @project_id, @component_id, @component_name, @team_leader, @quality_inspector, @quality_manager, @plan_date, @status, @created_at)",
            {
                id: item.id || `${Date.now()}`,
                date: item.date || new Date().toISOString().substring(0, 10),
                project_id: item.project_id || null,
                component_id: item.component_id || null,
                component_name: item.component_name || '',
                team_leader: item.team_leader || '',
                quality_inspector: item.quality_inspector || '',
                quality_manager: item.quality_manager || '',
                plan_date: item.plan_date || null,
                status: item.status || '待检测',
                created_at: now
            }
        );
    },

    // -------- 检测记录 --------
    createInspectionLog: (log) => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return run(
            `INSERT INTO inspection_logs (project_id, project_name, component_id, component_name,
              component_spec, group_id, group_name, inspection_date, result, inspector,
              template_id, template_title, qualified_rate, notes, created_at)
             VALUES (@project_id, @project_name, @component_id, @component_name,
              @component_spec, @group_id, @group_name, @inspection_date, @result, @inspector,
              @template_id, @template_title, @qualified_rate, @notes, @created_at)`,
            {
                project_id: log.project_id || null,
                project_name: log.project_name || '',
                component_id: log.component_id || null,
                component_name: log.component_name || '',
                component_spec: log.component_spec || '',
                group_id: log.group_id || null,
                group_name: log.group_name || '',
                inspection_date: log.inspection_date || new Date().toISOString().substring(0, 10),
                result: log.result || '',
                inspector: log.inspector || '',
                template_id: log.template_id || '',
                template_title: log.template_title || '',
                qualified_rate: log.qualified_rate || 0,
                notes: log.notes || '',
                created_at: now
            }
        );
    },
    getInspectionLogs: (filters = {}) => {
        let sql = "SELECT * FROM inspection_logs WHERE 1=1";
        const params = {};
        if (filters.project_id) { sql += " AND project_id = @project_id"; params.project_id = filters.project_id; }
        if (filters.start_date) { sql += " AND inspection_date >= @start_date"; params.start_date = filters.start_date; }
        if (filters.end_date) { sql += " AND inspection_date <= @end_date"; params.end_date = filters.end_date; }
        if (filters.group_name) { sql += " AND group_name LIKE @group_name"; params.group_name = `%${filters.group_name}%`; }
        sql += " ORDER BY inspection_date DESC, created_at DESC";
        if (filters.limit) { sql += " LIMIT @limit"; params.limit = filters.limit; }
        return query(sql, params);
    },

    // -------- 质检模板 --------
    getTemplates: () => {
        return query("SELECT * FROM qc_templates ORDER BY created_at DESC");
    },
    getTemplateById: (id) => {
        return get("SELECT * FROM qc_templates WHERE id = @id", { id });
    },
    upsertTemplate: (template) => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return run(
            `INSERT OR REPLACE INTO qc_templates
              (id, title, sheet_name, file_path, file_size, item_count, item_headers, created_at, updated_at)
             VALUES (@id, @title, @sheet_name, @file_path, @file_size, @item_count, @item_headers, @created_at, @updated_at)`,
            {
                id: template.id,
                title: template.title || template.id,
                sheet_name: template.sheet_name || 'Sheet1',
                file_path: template.file_path,
                file_size: template.file_size || 0,
                item_count: template.item_count || 0,
                item_headers: JSON.stringify(template.item_headers || []),
                created_at: now,
                updated_at: now
            }
        );
    },
    deleteTemplate: (id) => {
        return run("DELETE FROM qc_templates WHERE id = @id", { id });
    },

    // -------- 系统设置 --------
    getSetting: (key) => {
        return get("SELECT * FROM settings WHERE key = @key", { key });
    },
    getAllSettings: () => {
        return query("SELECT * FROM settings");
    },
    setSetting: (key, value, description = '') => {
        return run(
            "INSERT OR REPLACE INTO settings (key, value, description, updated_at) VALUES (@key, @value, @description, datetime('now', '+8 hours'))",
            { key, value, description }
        );
    },

    // -------- 用户 --------
    getUserByUsername: (username) => {
        return get("SELECT * FROM users WHERE username = @username", { username });
    },
    getUserById: (id) => {
        return get("SELECT * FROM users WHERE id = @id", { id });
    },
    createUser: (user) => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return run(
            "INSERT INTO users (id, username, password_hash, role, created_at, updated_at) VALUES (@id, @username, @password_hash, @role, @created_at, @updated_at)",
            {
                id: user.id || `${Date.now()}`,
                username: user.username,
                password_hash: user.password_hash,
                role: user.role || 'viewer',
                created_at: now,
                updated_at: now
            }
        );
    },

    // -------- 操作日志 --------
    createAuditLog: (log) => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return run(
            "INSERT INTO audit_log (action, entity_type, entity_id, operator, operator_role, detail, ip_address, created_at) VALUES (@action, @entity_type, @entity_id, @operator, @operator_role, @detail, @ip_address, @created_at)",
            {
                action: log.action || 'UNKNOWN',
                entity_type: log.entity_type || '',
                entity_id: log.entity_id || null,
                operator: log.operator || '',
                operator_role: log.operator_role || '',
                detail: typeof log.detail === 'object' ? JSON.stringify(log.detail) : (log.detail || ''),
                ip_address: log.ip_address || '',
                created_at: now
            }
        );
    },
    getAuditLogs: (filters = {}) => {
        let sql = "SELECT * FROM audit_log WHERE 1=1";
        const params = {};
        if (filters.entity_type) { sql += " AND entity_type = @entity_type"; params.entity_type = filters.entity_type; }
        if (filters.action) { sql += " AND action = @action"; params.action = filters.action; }
        if (filters.operator) { sql += " AND operator LIKE @operator"; params.operator = `%${filters.operator}%`; }
        if (filters.start_date) { sql += " AND created_at >= @start_date"; params.start_date = filters.start_date; }
        if (filters.end_date) { sql += " AND created_at <= @end_date"; params.end_date = filters.end_date; }
        sql += " ORDER BY created_at DESC LIMIT 100";
        return query(sql, params);
    },

    // -------- 统计数据 --------
    getStatistics: (period = null) => {
        const p = period || new Date().toISOString().substring(0, 7);
        const rankingsData = data.getRankings(p);
        const logsData = data.getInspectionLogs({ start_date: `${p}-01`, end_date: `${p}-31` });
        const projectData = data.getAllProjects();
        return {
            success: true,
            data: {
                rankings: rankingsData.success ? rankingsData.data : [],
                inspectionLogs: logsData.success ? logsData.data : [],
                projectCount: projectData.success ? projectData.data.length : 0,
                period: p
            }
        };
    }
};

// =============================================
// 数据库初始化
// =============================================

function initDatabase() {
    console.log('[DB] 初始化数据库...');

    const migrations = [
        // 1. 用户表
        `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','operator','viewer')),
            created_at TEXT DEFAULT (datetime('now', '+8 hours')),
            updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )`,

        // 2. 项目表
        `CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            province TEXT DEFAULT '',
            city TEXT DEFAULT '',
            ifc_url TEXT DEFAULT '',
            ifc_filename TEXT DEFAULT '',
            ifc_file_size INTEGER DEFAULT 0,
            center_lat REAL,
            center_lng REAL,
            beam_column_count INTEGER DEFAULT 0,
            inspected_count INTEGER DEFAULT 0,
            qualified_count INTEGER DEFAULT 0,
            qualified_rate TEXT DEFAULT '0%',
            is_active INTEGER DEFAULT 0 CHECK(is_active IN (0,1)),
            created_at TEXT DEFAULT (datetime('now', '+8 hours')),
            updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )`,

        // 3. 构件表
        `CREATE TABLE IF NOT EXISTS components (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT DEFAULT '',
            spec TEXT DEFAULT '',
            team_leader TEXT DEFAULT '',
            quality_inspector TEXT DEFAULT '',
            quality_manager TEXT DEFAULT '',
            plan_date TEXT,
            status TEXT DEFAULT '待检测' CHECK(status IN ('待检测','检测中','已完成','不合格')),
            ifc_element_id TEXT DEFAULT '',
            ifc_global_id TEXT DEFAULT '',
            ifc_type TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now', '+8 hours')),
            updated_at TEXT DEFAULT (datetime('now', '+8 hours')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )`,

        // 4. 班组表
        `CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            photo_url TEXT DEFAULT '/people.jpg',
            created_at TEXT DEFAULT (datetime('now', '+8 hours')),
            updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )`,

        // 5. 排名表
        `CREATE TABLE IF NOT EXISTS rankings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id TEXT,
            group_name TEXT NOT NULL,
            qualified_rate REAL DEFAULT 0,
            total_count INTEGER DEFAULT 0,
            qualified_count INTEGER DEFAULT 0,
            period TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', '+8 hours')),
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
        )`,

        // 6. 标兵表
        `CREATE TABLE IF NOT EXISTS star (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            group_id TEXT,
            group_name TEXT DEFAULT '',
            photo_url TEXT DEFAULT '/people.jpg',
            passing_rate REAL DEFAULT 0,
            first_pass_rate REAL DEFAULT 0,
            photo_updated_at TEXT,
            updated_at TEXT DEFAULT (datetime('now', '+8 hours')),
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
        )`,

        // 7. 检测记录表
        `CREATE TABLE IF NOT EXISTS inspection_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT,
            project_name TEXT,
            component_id TEXT,
            component_name TEXT,
            component_spec TEXT DEFAULT '',
            group_id TEXT,
            group_name TEXT,
            inspection_date TEXT NOT NULL,
            result TEXT CHECK(result IN ('合格','不合格','')),
            inspector TEXT DEFAULT '',
            template_id TEXT,
            template_title TEXT DEFAULT '',
            qualified_rate REAL DEFAULT 0,
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )`,

        // 8. 质检模板表
        `CREATE TABLE IF NOT EXISTS qc_templates (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            sheet_name TEXT DEFAULT 'Sheet1',
            file_path TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            item_count INTEGER DEFAULT 0,
            item_headers TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now', '+8 hours')),
            updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )`,

        // 9. 今日计划表
        `CREATE TABLE IF NOT EXISTS today_plan (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            project_id TEXT,
            component_id TEXT,
            component_name TEXT,
            team_leader TEXT DEFAULT '',
            quality_inspector TEXT DEFAULT '',
            quality_manager TEXT DEFAULT '',
            plan_date TEXT,
            status TEXT DEFAULT '待检测',
            created_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )`,

        // 10. 系统设置表
        `CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT DEFAULT '',
            description TEXT DEFAULT '',
            updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )`,

        // 11. 操作日志表
        `CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL CHECK(action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','UPLOAD','EXPORT')),
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            operator TEXT DEFAULT '',
            operator_role TEXT DEFAULT '',
            detail TEXT DEFAULT '',
            ip_address TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )`,

        // 索引
        `CREATE INDEX IF NOT EXISTS idx_components_project ON components(project_id)`,
        `CREATE INDEX IF NOT EXISTS idx_components_status ON components(status)`,
        `CREATE INDEX IF NOT EXISTS idx_inspection_project ON inspection_logs(project_id)`,
        `CREATE INDEX IF NOT EXISTS idx_inspection_date ON inspection_logs(inspection_date)`,
        `CREATE INDEX IF NOT EXISTS idx_rankings_period ON rankings(period)`,
        `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)`
    ];

    for (const sql of migrations) {
        try {
            db.exec(sql);
        } catch (err) {
            console.error('[DB Init Error]', err.message, 'SQL:', sql.substring(0, 50));
        }
    }

    // 插入默认数据
    const defaultUsers = [
        { id: 'admin', username: 'admin', password_hash: 'admin123', role: 'admin' },
        { id: 'operator', username: 'operator', password_hash: 'operator123', role: 'operator' },
        { id: 'viewer', username: 'viewer', password_hash: 'viewer123', role: 'viewer' }
    ];
    const insertUser = db.prepare(
        "INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)"
    );
    for (const u of defaultUsers) {
        insertUser.run(u.id, u.username, u.password_hash, u.role);
    }

    // 默认设置
    const defaultSettings = [
        { key: 'workshopFirstPassRate', value: '97.5', description: '车间一次通过率（默认值）' },
        { key: 'systemName', value: '山西钢构科工钢结构数字孪生智能检测系统', description: '系统名称' },
        { key: 'version', value: '1.0.0', description: '系统版本号' }
    ];
    const insertSetting = db.prepare(
        "INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)"
    );
    for (const s of defaultSettings) {
        insertSetting.run(s.key, s.value, s.description);
    }

    // 默认标兵
    db.prepare("INSERT OR IGNORE INTO star (id, group_name, photo_url, passing_rate, first_pass_rate) VALUES (1, '', '/people.jpg', 0, 0)").run();

    console.log('[DB] 数据库初始化完成 ✓');
}

/**
 * 从旧 data.json 导入数据到 SQLite
 * 仅在数据库为空时调用
 */
function migrateFromJson(jsonData) {
    console.log('[DB] 从 data.json 迁移数据...');

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const period = new Date().toISOString().substring(0, 7);

    // 迁移项目
    if (jsonData.projects) {
        for (const p of jsonData.projects) {
            db.prepare(`
                INSERT OR IGNORE INTO projects
                (id, name, province, city, ifc_url, beam_column_count, inspected_count, qualified_count, qualified_rate, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(p.id, p.name, p.province || '', p.city || '', p.ifcUrl || '',
                p.beamColumnCount || 0, p.inspectedCount || 0, p.qualifiedCount || 0,
                p.qualifiedRate || '0%', 0, now, now);

            // 迁移构件
            if (p.components) {
                for (const c of p.components) {
                    db.prepare(`
                        INSERT OR IGNORE INTO components
                        (id, project_id, name, spec, team_leader, quality_inspector, quality_manager,
                         plan_date, status, ifc_element_id, ifc_global_id, ifc_type, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        c.id, p.id, c.name || '', c.spec || '', c.teamLeader || '',
                        c.qualityInspector || '', c.qualityManager || '',
                        c.planDate || null, c.status || '待检测',
                        c.ifcElementId || '', c.ifcGlobalId || '', c.ifcType || '',
                        now, now
                    );
                }
            }
        }

        // 设置活跃项目
        if (jsonData.activeProjectId) {
            data.setActiveProjectId(jsonData.activeProjectId);
            db.prepare("UPDATE projects SET is_active = 1 WHERE id = ?").run(jsonData.activeProjectId);
        }
    }

    // 迁移班组
    if (jsonData.groups) {
        for (const g of jsonData.groups) {
            db.prepare(`
                INSERT OR IGNORE INTO groups (id, name, photo_url, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(g.id, g.name, g.photoUrl || '/people.jpg', now, now);
        }
    }

    // 迁移排名
    if (jsonData.ranking) {
        for (const r of jsonData.ranking) {
            db.prepare(`
                INSERT INTO rankings (group_name, qualified_rate, total_count, qualified_count, period, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(r.name, r.value || 0, 0, 0, period, now);
        }
    }

    // 迁移标兵
    if (jsonData.star) {
        db.prepare(`
            UPDATE star SET group_name = ?, photo_url = ?, passing_rate = ?, first_pass_rate = ?, updated_at = ?
            WHERE id = 1
        `).run(
            jsonData.star.groupName || '',
            jsonData.star.photoUrl || '/people.jpg',
            jsonData.star.passingRate || 0,
            jsonData.star.firstPassRate || 0,
            now
        );
    }

    // 迁移车间一次通过率
    if (jsonData.workshopFirstPassRate !== undefined) {
        data.setSetting('workshopFirstPassRate', String(jsonData.workshopFirstPassRate), '车间一次通过率');
    }

    console.log('[DB] 数据迁移完成 ✓');
}

// =============================================
// 初始化
// =============================================

// 检查是否需要初始化
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
if (userCount.count === 0) {
    initDatabase();

    // 如果存在旧的 data.json，自动迁移
    const oldJsonPath = path.join(__dirname, 'data.json');
    if (fs.existsSync(oldJsonPath)) {
        try {
            const oldData = JSON.parse(fs.readFileSync(oldJsonPath, 'utf-8'));
            migrateFromJson(oldData);
            console.log('[DB] 已自动从 data.json 迁移数据');
        } catch (err) {
            console.warn('[DB] 读取 data.json 失败:', err.message);
        }
    }
}

module.exports = {
    db,
    query,
    run,
    get,
    transaction,
    data,
    initDatabase,
    migrateFromJson
};
