const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
});

pool.on('error', (err) => {
    console.error('[DB] PostgreSQL pool error:', err.message);
});

async function query(sql, params = []) {
    try {
        const result = await pool.query(sql, params);
        return { success: true, data: result.rows };
    } catch (err) {
        console.error('[PG Query Error]', err.message);
        return { success: false, error: err.message };
    }
}

async function get(sql, params = []) {
    const result = await query(sql, params);
    if (!result.success) return result;
    return { success: true, data: result.data[0] || null };
}

async function run(sql, params = []) {
    try {
        const result = await pool.query(sql, params);
        return {
            success: true,
            changes: result.rowCount || 0,
            rows: result.rows || []
        };
    } catch (err) {
        console.error('[PG Run Error]', err.message);
        return { success: false, error: err.message };
    }
}

async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return { success: true, data: result };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[PG Transaction Error]', err.message);
        return { success: false, error: err.message };
    } finally {
        client.release();
    }
}

function mapComponentRow(component) {
    return {
        id: component.id,
        name: component.name || '',
        componentMark: component.component_mark || '',
        spec: component.spec || '',
        positionCode: component.position_code || '',
        bottomElevation: component.bottom_elevation || '',
        topElevation: component.top_elevation || '',
        length: component.length_value != null ? Number(component.length_value) : null,
        width: component.width_value != null ? Number(component.width_value) : null,
        area: component.area_value != null ? Number(component.area_value) : null,
        castUnitWeight: component.cast_unit_weight != null ? Number(component.cast_unit_weight) : null,
        weightNet: component.weight_net != null ? Number(component.weight_net) : null,
        weightGross: component.weight_gross != null ? Number(component.weight_gross) : null,
        material: component.material || '',
        mainReference: component.main_reference || '',
        teamId: component.team_id || '',
        teamName: component.team_name || '',
        teamLeader: component.team_leader || '',
        selfInspector: component.self_inspector || '',
        qualityInspector: component.quality_inspector || '',
        qualityManager: component.quality_manager || '',
        planDate: component.plan_date || '',
        status: component.status || '待检测',
        qcResult: component.qc_result || '',
        firstPassQualified: !!component.first_pass_qualified,
        qualifiedAt: component.qualified_at || '',
        outboundAt: component.outbound_at || '',
        reinspectionCount: component.reinspection_count != null ? Number(component.reinspection_count) : 0,
        qcLocked: !!component.qc_locked,
        ifcElementId: component.ifc_element_id || '',
        ifcGlobalId: component.ifc_global_id || '',
        ifcType: component.ifc_type || ''
    };
}

function mapProjectRow(project, components = []) {
    return {
        id: project.id,
        name: project.name,
        province: project.province || '',
        city: project.city || '',
        ifcUrl: project.ifc_url || '',
        ifcFilename: project.ifc_filename || '',
        ifcFileSize: project.ifc_file_size || 0,
        center: (project.center_lng != null && project.center_lat != null) ? [Number(project.center_lng), Number(project.center_lat)] : null,
        beamColumnCount: project.beam_column_count || 0,
        inspectedCount: project.inspected_count || 0,
        qualifiedCount: project.qualified_count || 0,
        qualifiedRate: project.qualified_rate || '0%',
        isActive: !!project.is_active,
        components
    };
}

async function initDatabase() {
    const statements = [
        `CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            province TEXT DEFAULT '',
            city TEXT DEFAULT '',
            ifc_url TEXT DEFAULT '',
            ifc_filename TEXT DEFAULT '',
            ifc_file_size BIGINT DEFAULT 0,
            center_lat DOUBLE PRECISION,
            center_lng DOUBLE PRECISION,
            beam_column_count INTEGER DEFAULT 0,
            inspected_count INTEGER DEFAULT 0,
            qualified_count INTEGER DEFAULT 0,
            qualified_rate TEXT DEFAULT '0%',
            is_active BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS components (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            name TEXT DEFAULT '',
            component_mark TEXT DEFAULT '',
            spec TEXT DEFAULT '',
            position_code TEXT DEFAULT '',
            bottom_elevation TEXT DEFAULT '',
            top_elevation TEXT DEFAULT '',
            length_value DOUBLE PRECISION,
            width_value DOUBLE PRECISION,
            area_value DOUBLE PRECISION,
            cast_unit_weight DOUBLE PRECISION,
            weight_net DOUBLE PRECISION,
            weight_gross DOUBLE PRECISION,
            material TEXT DEFAULT '',
            main_reference TEXT DEFAULT '',
            team_id TEXT DEFAULT '',
            team_name TEXT DEFAULT '',
            team_leader TEXT DEFAULT '',
            self_inspector TEXT DEFAULT '',
            quality_inspector TEXT DEFAULT '',
            quality_manager TEXT DEFAULT '',
            plan_date TEXT,
            status TEXT DEFAULT '待检测',
            qc_result TEXT DEFAULT '',
            first_pass_qualified BOOLEAN DEFAULT FALSE,
            qualified_at TEXT DEFAULT '',
            outbound_at TEXT DEFAULT '',
            reinspection_count INTEGER DEFAULT 0,
            qc_locked BOOLEAN DEFAULT FALSE,
            ifc_element_id TEXT DEFAULT '',
            ifc_global_id TEXT DEFAULT '',
            ifc_type TEXT DEFAULT '',
            child_ifc_element_ids TEXT DEFAULT '[]',
            parent_assembly_ifc_element_id TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS component_reinspection_tasks (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
            component_mark TEXT DEFAULT '',
            team_name TEXT DEFAULT '',
            inspection_date TEXT DEFAULT '',
            reinspection_date TEXT DEFAULT '',
            failed_items_json TEXT DEFAULT '[]',
            defect_types_json TEXT DEFAULT '[]',
            status TEXT DEFAULT '待复检',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS component_outbound_records (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
            component_mark TEXT DEFAULT '',
            team_name TEXT DEFAULT '',
            team_leader TEXT DEFAULT '',
            quality_inspector TEXT DEFAULT '',
            quality_manager TEXT DEFAULT '',
            inspection_date TEXT DEFAULT '',
            outbound_date TEXT DEFAULT '',
            report_snapshot_json TEXT DEFAULT '{}',
            status TEXT DEFAULT '已出库',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS component_qc_records (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
            component_mark TEXT DEFAULT '',
            template_id TEXT DEFAULT '',
            template_title TEXT DEFAULT '',
            inspection_date TEXT DEFAULT '',
            qc_result TEXT DEFAULT '',
            is_outbound BOOLEAN DEFAULT FALSE,
            outbound_date TEXT DEFAULT '',
            report_snapshot_json TEXT DEFAULT '{}',
            report_file_path TEXT DEFAULT '',
            report_file_name TEXT DEFAULT '',
            report_generated_at TEXT DEFAULT '',
            team_name TEXT DEFAULT '',
            team_leader TEXT DEFAULT '',
            quality_inspector TEXT DEFAULT '',
            quality_manager TEXT DEFAULT '',
            reinspection_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS component_qc_record_items (
            id TEXT PRIMARY KEY,
            record_id TEXT NOT NULL REFERENCES component_qc_records(id) ON DELETE CASCADE,
            seq INTEGER DEFAULT 0,
            item_name TEXT DEFAULT '',
            design_value TEXT DEFAULT '',
            tolerance_text TEXT DEFAULT '',
            measured_value TEXT DEFAULT '',
            verdict TEXT DEFAULT '',
            defect_type TEXT DEFAULT '',
            remark TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS project_statistics (
            project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
            component_count INTEGER DEFAULT 0,
            inspected_count INTEGER DEFAULT 0,
            qualified_count INTEGER DEFAULT 0,
            pending_count INTEGER DEFAULT 0,
            inspecting_count INTEGER DEFAULT 0,
            unqualified_count INTEGER DEFAULT 0,
            qualified_rate TEXT DEFAULT '0.0%',
            team_count INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            photo_url TEXT DEFAULT '/people.jpg',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS rankings (
            id BIGSERIAL PRIMARY KEY,
            group_id TEXT,
            group_name TEXT NOT NULL,
            qualified_rate DOUBLE PRECISION DEFAULT 0,
            total_count INTEGER DEFAULT 0,
            qualified_count INTEGER DEFAULT 0,
            period TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS star (
            id INTEGER PRIMARY KEY,
            group_id TEXT,
            group_name TEXT DEFAULT '',
            photo_url TEXT DEFAULT '/people.jpg',
            passing_rate DOUBLE PRECISION DEFAULT 0,
            first_pass_rate DOUBLE PRECISION DEFAULT 0,
            photo_updated_at TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT DEFAULT '',
            description TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `INSERT INTO star (id, group_name, photo_url, passing_rate, first_pass_rate)
         VALUES (1, '', '/people.jpg', 0, 0)
         ON CONFLICT (id) DO NOTHING`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS team_id TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS child_ifc_element_ids TEXT DEFAULT '[]'`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS parent_assembly_ifc_element_id TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS team_name TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS self_inspector TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS position_code TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS bottom_elevation TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS top_elevation TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS length_value DOUBLE PRECISION`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS width_value DOUBLE PRECISION`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS area_value DOUBLE PRECISION`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS cast_unit_weight DOUBLE PRECISION`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS weight_net DOUBLE PRECISION`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS weight_gross DOUBLE PRECISION`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS material TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS main_reference TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS qc_result TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS first_pass_qualified BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS qualified_at TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS outbound_at TEXT DEFAULT ''`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS reinspection_count INTEGER DEFAULT 0`,
        `ALTER TABLE components ADD COLUMN IF NOT EXISTS qc_locked BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE component_outbound_records ADD COLUMN IF NOT EXISTS report_file_path TEXT DEFAULT ''`,
        `ALTER TABLE component_outbound_records ADD COLUMN IF NOT EXISTS report_file_name TEXT DEFAULT ''`,
        `ALTER TABLE component_outbound_records ADD COLUMN IF NOT EXISTS report_generated_at TEXT DEFAULT ''`,
        `CREATE INDEX IF NOT EXISTS idx_project_statistics_updated ON project_statistics(updated_at)`,
        `CREATE INDEX IF NOT EXISTS idx_components_project ON components(project_id)`,
        `CREATE INDEX IF NOT EXISTS idx_components_mark ON components(component_mark)`,
        `CREATE INDEX IF NOT EXISTS idx_components_status ON components(status)`,
        `CREATE INDEX IF NOT EXISTS idx_component_reinspection_tasks_component ON component_reinspection_tasks(component_id)`,
        `CREATE INDEX IF NOT EXISTS idx_component_outbound_records_component ON component_outbound_records(component_id)`,
        `CREATE INDEX IF NOT EXISTS idx_component_qc_records_component ON component_qc_records(component_id)`,
        `CREATE INDEX IF NOT EXISTS idx_component_qc_records_project ON component_qc_records(project_id)`,
        `CREATE INDEX IF NOT EXISTS idx_component_qc_record_items_record ON component_qc_record_items(record_id)`
    ];
    for (const sql of statements) {
        const res = await run(sql);
        if (!res.success) throw new Error(res.error);
    }
    console.log('[DB] PostgreSQL 数据库初始化完成');
}

const data = {
    getAllGroups: () => query('SELECT * FROM groups ORDER BY created_at DESC'),
    createGroup: (group) => run(
        `INSERT INTO groups (id, name, photo_url, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
            group.id || `${Date.now()}`,
            group.name || '',
            group.photo_url || '/people.jpg'
        ]
    ),
    getStar: () => get('SELECT * FROM star WHERE id = 1'),
    updateGroup: (id, updates) => {
        const fields = Object.keys(updates || {});
        if (!fields.length) return Promise.resolve({ success: false, error: 'No fields to update' });
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const values = fields.map((field) => updates[field]);
        values.push(id);
        return run(`UPDATE groups SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1}`, values);
    },
    deleteGroup: (id) => run('DELETE FROM groups WHERE id = $1', [id]),
    updateStar: (updates) => run(
        `UPDATE star
         SET group_id = $1, group_name = $2, photo_url = $3,
             passing_rate = $4, first_pass_rate = $5,
             photo_updated_at = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [
            updates.group_id || null,
            updates.group_name || '',
            updates.photo_url || '/people.jpg',
            Number(updates.passing_rate || 0),
            Number(updates.first_pass_rate || 0),
            updates.photo_updated_at || null
        ]
    ),
    getRankings: async (period = null) => {
        if (period) {
            return query(
                'SELECT * FROM rankings WHERE period = $1 ORDER BY qualified_rate DESC, created_at ASC',
                [period]
            );
        }
        const latestRes = await get('SELECT period FROM rankings ORDER BY period DESC LIMIT 1');
        if (!latestRes.success) return latestRes;
        const latestPeriod = latestRes.data && latestRes.data.period ? latestRes.data.period : null;
        if (!latestPeriod) {
            return { success: true, data: [] };
        }
        return query(
            'SELECT * FROM rankings WHERE period = $1 ORDER BY qualified_rate DESC, created_at ASC',
            [latestPeriod]
        );
    },
    updateRankingsByPeriod: (period, rankings) => transaction(async (client) => {
        await client.query('DELETE FROM rankings WHERE period = $1', [period]);
        for (const ranking of (Array.isArray(rankings) ? rankings : [])) {
            await client.query(
                `INSERT INTO rankings (
                    group_id, group_name, qualified_rate, total_count, qualified_count, period, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
                [
                    ranking.group_id || null,
                    ranking.group_name || ranking.name || '',
                    Number(ranking.qualified_rate != null ? ranking.qualified_rate : ranking.value || 0),
                    Number(ranking.total_count || 0),
                    Number(ranking.qualified_count || 0),
                    period
                ]
            );
        }
    }),
    getSetting: (key) => get('SELECT * FROM settings WHERE key = $1', [key]),
    setSetting: (key, value, description = '') => run(
        `INSERT INTO settings (key, value, description, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET
             value = EXCLUDED.value,
             description = EXCLUDED.description,
             updated_at = CURRENT_TIMESTAMP`,
        [key, value, description]
    ),
    getProjectCount: () => get('SELECT COUNT(*)::int AS count FROM projects'),
    getProjectById: (id) => get('SELECT * FROM projects WHERE id = $1', [id]),
    getProjectStatisticsById: (projectId) => get('SELECT * FROM project_statistics WHERE project_id = $1', [projectId]),
    getActiveProject: () => get('SELECT * FROM projects WHERE is_active = TRUE LIMIT 1'),
    createProject: (project) => run(
        `INSERT INTO projects (
            id, name, province, city, ifc_url, ifc_filename, ifc_file_size,
            center_lat, center_lng, beam_column_count, inspected_count, qualified_count,
            qualified_rate, is_active, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [
            project.id,
            project.name || '',
            project.province || '',
            project.city || '',
            project.ifc_url || '',
            project.ifc_filename || '',
            Number(project.ifc_file_size || 0),
            project.center_lat != null ? Number(project.center_lat) : null,
            project.center_lng != null ? Number(project.center_lng) : null,
            Number(project.beam_column_count || 0),
            Number(project.inspected_count || 0),
            Number(project.qualified_count || 0),
            project.qualified_rate || '0%',
            !!project.is_active
        ]
    ),
    deleteProject: (id) => run('DELETE FROM projects WHERE id = $1', [id]),
    setActiveProject: (id) => transaction(async (client) => {
        await client.query('UPDATE projects SET is_active = FALSE');
        if (id) await client.query('UPDATE projects SET is_active = TRUE WHERE id = $1', [id]);
    }),
    getAllProjectsWithComponents: async () => {
        const projectsRes = await query('SELECT * FROM projects ORDER BY created_at DESC');
        if (!projectsRes.success) return projectsRes;
        const componentsRes = await query('SELECT * FROM components ORDER BY created_at DESC');
        if (!componentsRes.success) return componentsRes;
        const componentMap = new Map();
        for (const component of componentsRes.data) {
            const projectId = String(component.project_id || '');
            if (!componentMap.has(projectId)) componentMap.set(projectId, []);
            componentMap.get(projectId).push(mapComponentRow(component));
        }
        return {
            success: true,
            data: projectsRes.data.map((project) => mapProjectRow(project, componentMap.get(String(project.id)) || []))
        };
    },
    getProjectWithComponentsById: async (id) => {
        const projectRes = await get('SELECT * FROM projects WHERE id = $1', [id]);
        if (!projectRes.success || !projectRes.data) return projectRes;
        const componentsRes = await query('SELECT * FROM components WHERE project_id = $1 ORDER BY created_at DESC', [id]);
        return {
            success: true,
            data: mapProjectRow(projectRes.data, componentsRes.success ? componentsRes.data.map(mapComponentRow) : [])
        };
    },
    createComponent: (component) => run(
        `INSERT INTO components (
            id, project_id, name, component_mark, spec, position_code, bottom_elevation, top_elevation,
            length_value, width_value, area_value, cast_unit_weight, weight_net, weight_gross,
            material, main_reference, team_id, team_name, team_leader, self_inspector, quality_inspector,
            quality_manager, plan_date, status, ifc_element_id, ifc_global_id, ifc_type, child_ifc_element_ids, parent_assembly_ifc_element_id,
            created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [
            component.id,
            component.project_id,
            component.name || '',
            component.component_mark || '',
            component.spec || '',
            component.position_code || '',
            component.bottom_elevation || '',
            component.top_elevation || '',
            component.length_value != null ? Number(component.length_value) : null,
            component.width_value != null ? Number(component.width_value) : null,
            component.area_value != null ? Number(component.area_value) : null,
            component.cast_unit_weight != null ? Number(component.cast_unit_weight) : null,
            component.weight_net != null ? Number(component.weight_net) : null,
            component.weight_gross != null ? Number(component.weight_gross) : null,
            component.material || '',
            component.main_reference || '',
            component.team_id || '',
            component.team_name || '',
            component.team_leader || '',
            component.self_inspector || '',
            component.quality_inspector || '',
            component.quality_manager || '',
            component.plan_date || null,
            component.status || '待检测',
            component.ifc_element_id || '',
            component.ifc_global_id || '',
            component.ifc_type || '',
            component.child_ifc_element_ids || '[]',
            component.parent_assembly_ifc_element_id || ''
        ]
    ),
    getComponentsByProject: (projectId) => query(
        'SELECT * FROM components WHERE project_id = $1 ORDER BY created_at DESC',
        [projectId]
    ),
    getComponentById: (id) => get('SELECT * FROM components WHERE id = $1', [id]),
    deleteComponentsByProject: (projectId) => run('DELETE FROM components WHERE project_id = $1', [projectId]),
    getComponentByProjectAndIfcElementId: (projectId, ifcElementId) => get(
        `SELECT * FROM components
         WHERE project_id = $1 AND ifc_element_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [projectId, ifcElementId]
    ),
    getComponentMarksByProject: (projectId) => query(
        `SELECT
            ifc_element_id,
            component_mark,
            name,
            ifc_type,
            child_ifc_element_ids,
            parent_assembly_ifc_element_id,
            material,
            spec,
            main_reference,
            position_code,
            bottom_elevation,
            top_elevation,
            length_value,
            width_value,
            area_value,
            cast_unit_weight,
            weight_net,
            weight_gross
         FROM components
         WHERE project_id = $1
           AND COALESCE(ifc_element_id, '') <> ''
         ORDER BY created_at DESC`,
        [projectId]
    ),
    getComponentByProjectAndMark: (projectId, componentMark) => get(
        `SELECT * FROM components
         WHERE project_id = $1 AND component_mark = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [projectId, componentMark]
    ),
    createReinspectionTask: (task) => run(
        `INSERT INTO component_reinspection_tasks (
            id, project_id, component_id, component_mark, team_name, inspection_date, reinspection_date,
            failed_items_json, defect_types_json, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [
            task.id,
            task.project_id,
            task.component_id,
            task.component_mark || '',
            task.team_name || '',
            task.inspection_date || '',
            task.reinspection_date || '',
            task.failed_items_json || '[]',
            task.defect_types_json || '[]',
            task.status || '待复检'
        ]
    ),
    createOutboundRecord: (record) => run(
        `INSERT INTO component_outbound_records (
            id, project_id, component_id, component_mark, team_name, team_leader, quality_inspector,
            quality_manager, inspection_date, outbound_date, report_snapshot_json, report_file_path,
            report_file_name, report_generated_at, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        [
            record.id,
            record.project_id,
            record.component_id,
            record.component_mark || '',
            record.team_name || '',
            record.team_leader || '',
            record.quality_inspector || '',
            record.quality_manager || '',
            record.inspection_date || '',
            record.outbound_date || '',
            record.report_snapshot_json || '{}',
            record.report_file_path || '',
            record.report_file_name || '',
            record.report_generated_at || '',
            record.status || '已出库'
        ]
    ),
    createQcRecordWithItems: (record, items = []) => transaction(async (client) => {
        await client.query(
            `INSERT INTO component_qc_records (
                id, project_id, component_id, component_mark, template_id, template_title, inspection_date,
                qc_result, is_outbound, outbound_date, report_snapshot_json, report_file_path, report_file_name,
                report_generated_at, team_name, team_leader, quality_inspector, quality_manager, reinspection_count,
                created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
            [
                record.id,
                record.project_id,
                record.component_id,
                record.component_mark || '',
                record.template_id || '',
                record.template_title || '',
                record.inspection_date || '',
                record.qc_result || '',
                !!record.is_outbound,
                record.outbound_date || '',
                record.report_snapshot_json || '{}',
                record.report_file_path || '',
                record.report_file_name || '',
                record.report_generated_at || '',
                record.team_name || '',
                record.team_leader || '',
                record.quality_inspector || '',
                record.quality_manager || '',
                Number(record.reinspection_count || 0)
            ]
        );

        for (const item of Array.isArray(items) ? items : []) {
            await client.query(
                `INSERT INTO component_qc_record_items (
                    id, record_id, seq, item_name, design_value, tolerance_text, measured_value,
                    verdict, defect_type, remark, created_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP)`,
                [
                    item.id,
                    record.id,
                    Number(item.seq || 0),
                    item.item_name || '',
                    item.design_value || '',
                    item.tolerance_text || '',
                    item.measured_value || '',
                    item.verdict || '',
                    item.defect_type || '',
                    item.remark || ''
                ]
            );
        }
    }),
    getQcRecords: ({ projectId = null, componentId = null, isOutbound = null, keyword = '' } = {}) => {
        const params = [];
        const conditions = [];
        if (projectId) {
            params.push(projectId);
            conditions.push(`r.project_id = $${params.length}`);
        }
        if (componentId) {
            params.push(componentId);
            conditions.push(`r.component_id = $${params.length}`);
        }
        if (isOutbound !== null && isOutbound !== undefined && isOutbound !== '') {
            params.push(!!isOutbound);
            conditions.push(`r.is_outbound = $${params.length}`);
        }
        if (keyword) {
            params.push(`%${keyword}%`);
            conditions.push(`(r.component_mark ILIKE $${params.length} OR p.name ILIKE $${params.length})`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        return query(
            `SELECT
                r.*,
                p.name AS project_name
             FROM component_qc_records r
             JOIN projects p ON p.id = r.project_id
             ${where}
             ORDER BY r.created_at DESC`,
            params
        );
    },
    getQcRecordById: (id) => get(
        `SELECT
            r.*,
            p.name AS project_name
         FROM component_qc_records r
         JOIN projects p ON p.id = r.project_id
         WHERE r.id = $1`,
        [id]
    ),
    getQcRecordItemsByRecordId: (recordId) => query(
        `SELECT *
         FROM component_qc_record_items
         WHERE record_id = $1
         ORDER BY seq ASC, created_at ASC`,
        [recordId]
    ),
    getDetectedComponents: ({ projectId = null, keyword = '' } = {}) => {
        const params = [];
        const conditions = [
            `(
                COALESCE(c.qc_locked, FALSE) = TRUE
                OR COALESCE(c.qc_result, '') <> ''
                OR COALESCE(c.qualified_at, '') <> ''
                OR COALESCE(c.outbound_at, '') <> ''
                OR COALESCE(c.reinspection_count, 0) > 0
            )`
        ];
        if (projectId) {
            params.push(projectId);
            conditions.push(`c.project_id = $${params.length}`);
        }
        if (keyword) {
            params.push(`%${keyword}%`);
            conditions.push(`(c.component_mark ILIKE $${params.length} OR p.name ILIKE $${params.length})`);
        }
        return query(
            `SELECT
                c.id,
                c.project_id,
                p.name AS project_name,
                c.component_mark,
                c.status,
                c.qc_result,
                c.reinspection_count,
                c.qualified_at,
                c.outbound_at,
                c.team_name,
                c.team_leader,
                c.quality_inspector,
                c.quality_manager,
                c.qc_locked,
                c.updated_at,
                c.created_at
             FROM components c
             JOIN projects p ON p.id = c.project_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY c.updated_at DESC, c.created_at DESC`,
            params
        );
    },
    getLatestOutboundRecordByComponentId: (componentId) => get(
        `SELECT *
         FROM component_outbound_records
         WHERE component_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [componentId]
    ),
    deleteReinspectionTasksByComponentId: (componentId) => run(
        `DELETE FROM component_reinspection_tasks WHERE component_id = $1`,
        [componentId]
    ),
    getReinspectionTasks: ({ projectId = null } = {}) => {
        const params = [];
        let where = '';
        if (projectId) {
            params.push(projectId);
            where = `WHERE project_id = $${params.length}`;
        }
        return query(
            `SELECT * FROM component_reinspection_tasks
             ${where}
             ORDER BY created_at DESC`,
            params
        );
    },
    getReinspectionTasksByComponentId: (componentId) => query(
        `SELECT * FROM component_reinspection_tasks
         WHERE component_id = $1
         ORDER BY created_at DESC`,
        [componentId]
    ),
    completeReinspectionTasksByComponentId: (componentId) => run(
        `UPDATE component_reinspection_tasks
         SET status = '复检完成', updated_at = CURRENT_TIMESTAMP
         WHERE component_id = $1 AND status = '待复检'`,
        [componentId]
    ),
    getComponentsForDefectStatistics: ({ projectId = null } = {}) => {
        const params = [];
        let where = '';
        if (projectId) {
            params.push(projectId);
            where = `WHERE project_id = $${params.length}`;
        }
        return query(
            `SELECT
                id,
                project_id,
                component_mark,
                qc_result,
                first_pass_qualified,
                qualified_at,
                outbound_at,
                reinspection_count,
                qc_locked
             FROM components
             ${where}
             ORDER BY created_at DESC`,
            params
        );
    },
    getReinspectionTasksForDefectStatistics: ({ projectId = null } = {}) => {
        const params = [];
        let where = '';
        if (projectId) {
            params.push(projectId);
            where = `WHERE project_id = $${params.length}`;
        }
        return query(
            `SELECT
                id,
                project_id,
                component_id,
                reinspection_date,
                inspection_date,
                defect_types_json,
                created_at
             FROM component_reinspection_tasks
             ${where}
             ORDER BY created_at DESC`,
            params
        );
    },
    updateComponent: (id, updates) => {
        const entries = Object.entries(updates || {}).filter(([key]) => key !== 'id');
        if (!entries.length) return Promise.resolve({ success: false, error: 'No fields to update' });
        const setClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
        const values = entries.map(([, value]) => value);
        values.push(id);
        return run(
            `UPDATE components SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${entries.length + 1}`,
            values
        );
    },
    deleteComponent: (id) => run('DELETE FROM components WHERE id = $1', [id]),
    updateProject: (id, updates) => {
        const entries = Object.entries(updates || {}).filter(([key]) => key !== 'id');
        if (!entries.length) return Promise.resolve({ success: false, error: 'No fields to update' });
        const setClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
        const values = entries.map(([, value]) => value);
        values.push(id);
        return run(
            `UPDATE projects SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${entries.length + 1}`,
            values
        );
    },
    upsertProjectStatistics: (stats) => run(
        `INSERT INTO project_statistics (
            project_id, component_count, inspected_count, qualified_count, pending_count,
            inspecting_count, unqualified_count, qualified_rate, team_count, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)
        ON CONFLICT (project_id) DO UPDATE SET
            component_count = EXCLUDED.component_count,
            inspected_count = EXCLUDED.inspected_count,
            qualified_count = EXCLUDED.qualified_count,
            pending_count = EXCLUDED.pending_count,
            inspecting_count = EXCLUDED.inspecting_count,
            unqualified_count = EXCLUDED.unqualified_count,
            qualified_rate = EXCLUDED.qualified_rate,
            team_count = EXCLUDED.team_count,
            updated_at = CURRENT_TIMESTAMP`,
        [
            stats.project_id,
            Number(stats.component_count || 0),
            Number(stats.inspected_count || 0),
            Number(stats.qualified_count || 0),
            Number(stats.pending_count || 0),
            Number(stats.inspecting_count || 0),
            Number(stats.unqualified_count || 0),
            stats.qualified_rate || '0.0%',
            Number(stats.team_count || 0)
        ]
    ),
    getTodayPlanRows: ({ startDate = null, endDate = null, projectId = null, today = null } = {}) => {
        const conditions = [];
        const params = [];
        conditions.push(`COALESCE(c.status, '待检测') <> '已出库'`);
        if (projectId) {
            params.push(projectId);
            conditions.push(`p.id = $${params.length}`);
        }
        if (startDate && endDate) {
            params.push(startDate);
            params.push(endDate);
            conditions.push(`COALESCE(c.plan_date, '') >= $${params.length - 1} AND COALESCE(c.plan_date, '') <= $${params.length}`);
        } else if (today) {
            params.push(today);
            conditions.push(`COALESCE(c.plan_date, '') = $${params.length}`);
        }
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        return query(
            `SELECT
                p.id AS project_id,
                p.name AS project_name,
                p.province,
                p.city,
                p.ifc_url,
                p.is_active,
                c.id AS component_id,
                c.name AS component_name,
                c.component_mark,
                c.spec,
                c.team_id,
                c.team_name,
                c.team_leader,
                c.self_inspector,
                c.quality_inspector,
                c.quality_manager,
                c.plan_date,
                c.status,
                c.qc_result,
                c.qualified_at,
                c.outbound_at,
                c.qc_locked,
                c.ifc_element_id,
                c.ifc_global_id,
                c.ifc_type
             FROM components c
             JOIN projects p ON p.id = c.project_id
             ${whereClause}
             ORDER BY p.name ASC, c.name ASC`,
            params
        );
    },
    getInspectionHistoryRows: (today) => query(
        `SELECT
            p.name AS project_name,
            c.ifc_type,
            c.component_mark,
            c.name AS component_name,
            c.id AS component_id,
            c.plan_date,
            c.status
         FROM components c
         JOIN projects p ON p.id = c.project_id
         WHERE
            (COALESCE(c.plan_date, '') <> '' AND c.plan_date < $1)
            OR c.status IN ('已完成', '不合格')
         ORDER BY c.plan_date DESC NULLS LAST, p.name ASC`,
        [today]
    ),
};

module.exports = {
    db: pool,
    query,
    run,
    get,
    transaction,
    data,
    initDatabase,
};
