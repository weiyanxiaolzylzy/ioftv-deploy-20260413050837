const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const XLSX = require('xlsx');
const { fork } = require('child_process');
const dbApi = require('./database-entry');

const app = express();
const PORT = Number(process.env.PORT) || 8890;

// 健康检查端点（Docker healthcheck 用）
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ioftv-api', port: PORT, timestamp: Date.now() });
});

app.use(cors());
app.use(express.json());
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const QC_TEMPLATE_DIR = path.resolve(__dirname, '..', '单个构件质检表');
const IFC_UPLOAD_DIR = path.join(UPLOAD_DIR, 'ifc');
const WASM_DIR = path.join(__dirname, '../public/static/js/wasm');
const STEEL_QC_DIST_DIR = path.join(__dirname, '../dist-steel-qc');
const IFC_DIST_DIR = path.join(__dirname, '../ifc/dist');
const IFC_WASM_DIR = path.join(IFC_DIST_DIR, 'wasm');
const BANZU_DIR = path.join(__dirname, '..', 'banzu');

// node_modules/web-ifc/ 目录已包含 web-ifc-node.wasm，无需额外 SetWasmPath

ensureDir(IFC_UPLOAD_DIR);
ensureDir(WASM_DIR);
const IFC_PARSE_JOBS = new Map();
const IFC_PARSE_JOB_TTL_MS = 6 * 60 * 60 * 1000;

function normalizeComponentStatus(status) {
    const raw = String(status || '').trim();
    if (!raw) return '待检测';
    if (raw === '已完成') return '合格';
    if (raw === '待检测' || raw === '检测中' || raw === '合格' || raw === '不合格') return raw;
    return raw;
}

function findBanzuPhotoUrlByGroupName(groupName) {
    if (!groupName || !fs.existsSync(BANZU_DIR)) return '';
    const normalizedName = String(groupName).trim().toLowerCase();
    const files = fs.readdirSync(BANZU_DIR);
    const matched = files.find((file) => {
        const ext = path.extname(file);
        const base = path.basename(file, ext).trim().toLowerCase();
        return base === normalizedName;
    });
    return matched ? `/banzu/${encodeURIComponent(matched)}` : '';
}

async function syncBanzuPhotoMappings() {
    try {
        const groupsRes = await dbApi.data.getAllGroups();
        const groups = groupsRes && groupsRes.success && Array.isArray(groupsRes.data) ? groupsRes.data : [];
        for (const group of groups) {
            const mapped = findBanzuPhotoUrlByGroupName(group.name);
            if (mapped && group.photo_url !== mapped) {
                await dbApi.data.updateGroup(group.id, { photo_url: mapped });
            }
        }
        const starRes = await dbApi.data.getStar();
        const star = starRes && starRes.success && starRes.data ? starRes.data : null;
        if (star && star.group_name) {
            const mapped = findBanzuPhotoUrlByGroupName(star.group_name);
            if (mapped && star.photo_url !== mapped) {
                await dbApi.data.updateStar({
                    group_id: star.group_id || null,
                    group_name: star.group_name,
                    photo_url: mapped,
                    passing_rate: star.passing_rate != null ? Number(star.passing_rate) : 0,
                    first_pass_rate: star.first_pass_rate != null ? Number(star.first_pass_rate) : 0,
                    photo_updated_at: star.photo_updated_at || null
                });
            }
        }
    } catch (error) {
        console.warn('[banzu] 班组照片路径同步失败:', error.message);
    }
}

function buildBanzuFilename(groupName, originalName = '') {
    const ext = path.extname(originalName || '') || '.jpg';
    const rawName = groupName || path.basename(originalName || '', ext) || `banzu_${Date.now()}`;
    const safeName = String(rawName)
        .trim()
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, '');
    return `${safeName}${ext}`;
}

function finalizeBanzuUpload(file, groupName) {
    if (!file) return '';
    ensureDir(BANZU_DIR);
    const targetName = buildBanzuFilename(groupName, file.originalname || file.filename || '');
    let finalName = targetName;
    let targetPath = path.join(BANZU_DIR, finalName);
    if (file.path && path.resolve(file.path) !== path.resolve(targetPath)) {
        const fileBuffer = fs.readFileSync(file.path);
        try {
            fs.writeFileSync(targetPath, fileBuffer);
        } catch (error) {
            if (error && (error.code === 'EBUSY' || error.code === 'EPERM')) {
                const ext = path.extname(targetName);
                const base = path.basename(targetName, ext);
                finalName = `${base}_${Date.now()}${ext}`;
                targetPath = path.join(BANZU_DIR, finalName);
                fs.writeFileSync(targetPath, fileBuffer);
            } else {
                throw error;
            }
        } finally {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
    }
    return `/banzu/${encodeURIComponent(finalName)}`;
}

const createIfcParseJob = (filePath, limit = 8000) => {
    const jobId = `ifcjob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    IFC_PARSE_JOBS.set(jobId, {
        jobId,
        status: 'processing',
        filePath,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        parse: null,
        error: null
    });

    const worker = fork(path.join(__dirname, 'ifc-parse-worker.js'), [], {
        stdio: ['ignore', 'ignore', 'ignore', 'ipc']
    });

    const finishJob = (patch) => {
        const current = IFC_PARSE_JOBS.get(jobId);
        if (!current) return;
        IFC_PARSE_JOBS.set(jobId, {
            ...current,
            ...patch,
            updatedAt: Date.now()
        });
    };

    worker.on('message', (message) => {
        if (message && message.success) {
            const parseResult = message.result || null;
            if (parseResult) {
                console.log(`[IFC Parse] ${path.basename(filePath)} parsed: total=${parseResult.total || 0}, fromCache=${parseResult.fromCache === true}`);
            }
            finishJob({ status: 'done', parse: parseResult, error: null });
        } else {
            finishJob({
                status: 'failed',
                parse: null,
                error: message && message.message ? String(message.message) : 'IFC 解析失败'
            });
        }
    });

    worker.on('exit', (code) => {
        const job = IFC_PARSE_JOBS.get(jobId);
        if (!job || job.status !== 'processing') return;
        finishJob({
            status: code === 0 ? 'done' : 'failed',
            parse: job.parse,
            error: code === 0 ? null : (job.error || `IFC 解析进程异常退出（code=${code}）`)
        });
    });

    worker.on('error', (error) => {
        finishJob({
            status: 'failed',
            parse: null,
            error: error && error.message ? String(error.message) : 'IFC 解析进程启动失败'
        });
    });

    worker.send({ filePath, limit });

    const timer = setTimeout(() => {
        IFC_PARSE_JOBS.delete(jobId);
    }, IFC_PARSE_JOB_TTL_MS);
    if (timer && typeof timer.unref === 'function') timer.unref();

    return jobId;
};

function buildImportElementsFromParse(parseResult) {
    const parse = parseResult || {};
    const elements = Array.isArray(parse.elements) ? parse.elements : [];
    const assemblySummaries = Array.isArray(parse.assemblySummaries) ? parse.assemblySummaries : [];
    const summaryByAssemblyExpressId = new Map();
    const summaryByAssemblyGlobalId = new Map();

    for (const summary of assemblySummaries) {
        const assemblyExpressID = summary && summary.expressID != null ? String(summary.expressID).trim() : '';
        const assemblyGlobalId = summary && summary.globalId ? String(summary.globalId).trim() : '';
        if (assemblyExpressID) summaryByAssemblyExpressId.set(assemblyExpressID, summary);
        if (assemblyGlobalId) summaryByAssemblyGlobalId.set(assemblyGlobalId, summary);
    }

    return elements.map((el) => {
        const parentAssemblyExpressID = el && el.parentAssemblyExpressID != null ? String(el.parentAssemblyExpressID).trim() : '';
        const elExpressID = el && el.expressID != null ? String(el.expressID).trim() : '';
        const elGlobalId = el && el.globalId ? String(el.globalId).trim() : '';
        const summary = (
            (parentAssemblyExpressID && summaryByAssemblyExpressId.get(parentAssemblyExpressID)) ||
            (elExpressID && summaryByAssemblyExpressId.get(elExpressID)) ||
            (elGlobalId && summaryByAssemblyGlobalId.get(elGlobalId)) ||
            null
        );
        return {
            ...(el || {}),
            mainSpec: summary && summary.mainSpec != null ? summary.mainSpec : '',
            positionCode: summary && summary.positionCode != null ? summary.positionCode : '',
            bottomElevation: summary && summary.bottomElevation != null ? summary.bottomElevation : '',
            topElevation: summary && summary.topElevation != null ? summary.topElevation : '',
            length: summary && summary.length != null ? summary.length : null,
            width: summary && summary.width != null ? summary.width : null,
            area: summary && summary.area != null ? summary.area : null,
            castUnitWeight: summary && summary.castUnitWeight != null ? summary.castUnitWeight : null,
            weightNet: summary && summary.weightNet != null ? summary.weightNet : null,
            weightGross: summary && summary.weightGross != null ? summary.weightGross : null,
            material: summary && summary.material != null ? summary.material : '',
            mainReference: summary && summary.mainReference != null ? summary.mainReference : ''
        };
    });
}

function buildStableIfcComponentId(projectId, element) {
    const rawProjectId = String(projectId || '').trim();
    const globalId = element && element.globalId ? String(element.globalId).trim() : '';
    const expressId = element && element.expressID != null ? String(element.expressID).trim() : '';
    const stableKey = globalId || expressId;
    if (!rawProjectId || !stableKey) return genCompId();
    return `ifc_${rawProjectId}_${stableKey}`;
}

async function importIfcElementsToProject(projectId, elements = []) {
    const projectRes = await dbApi.data.getProjectWithComponentsById(projectId);
    if (!projectRes.success || !projectRes.data) {
        return { success: false, status: 404, message: '项目不存在' };
    }

    const existingByIfcElementId = new Map(
        (projectRes.data.components || [])
            .filter((c) => c && c.ifcElementId != null && String(c.ifcElementId).trim() !== '')
            .map((c) => [String(c.ifcElementId), c])
    );

    let added = 0;
    let updated = 0;
    const seenExpressIds = new Set();

    for (const el of elements) {
        const expressId = String(el && el.expressID != null ? el.expressID : '');
        if (!expressId || seenExpressIds.has(expressId)) continue;
        seenExpressIds.add(expressId);

        const basePayload = {
            name: (el && (el.componentMark || el.name)) ? String(el.componentMark || el.name) : `构件-${expressId}`,
            component_mark: el && el.componentMark ? String(el.componentMark) : '',
            spec: el && el.mainSpec ? String(el.mainSpec) : '',
            position_code: el && el.positionCode ? String(el.positionCode) : '',
            bottom_elevation: el && el.bottomElevation ? String(el.bottomElevation) : '',
            top_elevation: el && el.topElevation ? String(el.topElevation) : '',
            length_value: el && el.length != null ? Number(el.length) : null,
            width_value: el && el.width != null ? Number(el.width) : null,
            area_value: el && el.area != null ? Number(el.area) : null,
            cast_unit_weight: el && el.castUnitWeight != null ? Number(el.castUnitWeight) : null,
            weight_net: el && el.weightNet != null ? Number(el.weightNet) : null,
            weight_gross: el && el.weightGross != null ? Number(el.weightGross) : null,
            material: el && el.material ? String(el.material) : '',
            main_reference: el && el.mainReference ? String(el.mainReference) : '',
            ifc_element_id: expressId,
            ifc_global_id: el && el.globalId ? String(el.globalId) : '',
            ifc_type: el && el.type ? String(el.type) : ''
        };

        const existing = existingByIfcElementId.get(expressId);
        if (existing && existing.id) {
            const updateRes = await dbApi.data.updateComponent(String(existing.id), basePayload);
            if (!updateRes.success) {
                return { success: false, status: 500, message: updateRes.error || '更新 IFC 构件失败' };
            }
            updated++;
            continue;
        }

        const createRes = await dbApi.data.createComponent({
            id: buildStableIfcComponentId(projectId, el),
            project_id: projectId,
            ...basePayload,
            team_id: '',
            team_name: '',
            team_leader: '',
            self_inspector: '',
            quality_inspector: '',
            quality_manager: '',
            plan_date: '',
            status: '待检测'
        });
        if (!createRes.success) {
            return { success: false, status: 500, message: createRes.error || '导入 IFC 构件失败' };
        }
        existingByIfcElementId.set(expressId, { id: buildStableIfcComponentId(projectId, el) });
        added++;
    }

    const statsRes = await recalcProjectStats(projectId);
    if (!statsRes.success) {
        return { success: false, status: 500, message: statsRes.error || '项目统计更新失败' };
    }

    const refreshedRes = await dbApi.data.getProjectWithComponentsById(projectId);
    return {
        success: true,
        added,
        updated,
        total: refreshedRes.success && refreshedRes.data ? (refreshedRes.data.components || []).length : 0,
        project: refreshedRes.success ? refreshedRes.data : projectRes.data
    };
}

app.use('/uploads', express.static(UPLOAD_DIR));
if (fs.existsSync(BANZU_DIR)) {
    app.use('/banzu', express.static(BANZU_DIR));
}
syncBanzuPhotoMappings();
app.use('/wasm', express.static(WASM_DIR));
if (fs.existsSync(STEEL_QC_DIST_DIR)) {
    app.use('/steel-qc', express.static(STEEL_QC_DIST_DIR));
}
if (fs.existsSync(IFC_DIST_DIR)) {
  app.use('/ifc', express.static(IFC_DIST_DIR));
  // 独立 IFC 查看器优先使用自己构建产物里的 wasm，避免与主工程 /wasm 的版本串用
  if (fs.existsSync(IFC_WASM_DIR)) {
    app.use('/ifc/wasm', express.static(IFC_WASM_DIR));
  }
}

// 中间地图接口必须放在静态托管前面，避免被首页 index.html 吞掉
app.get('/bigscreen/centermap', (req, res) => {
    const { regionCode } = req.query;
    if (regionCode && regionCode !== 'china') {
        res.json({
            success: true,
            data: {
                dataList: [],
                regionCode: regionCode
            }
        });
    } else {
        res.json({
            success: true,
            data: {
                dataList: [
                    { name: '山西', value: 100 },
                    { name: '北京', value: 200 }
                ],
                regionCode: 'china'
            }
        });
    }
});

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '../dist')));

const getUserRole = (req) => {
    const raw = req.headers['x-user-role'];
    const role = Array.isArray(raw) ? raw[0] : raw;
    if (!role) return 'viewer';
    return String(role);
};

const requireRole = (allowedRoles) => (req, res, next) => {
    const role = getUserRole(req);
    if (allowedRoles.includes(role)) return next();
    return res.status(403).json({ success: false, message: '无权限' });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB
});

const banzuStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDir(BANZU_DIR);
        cb(null, BANZU_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '') || '.jpg';
        cb(null, `__upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
    }
});

const banzuUpload = multer({
    storage: banzuStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
});

const ifcStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, IFC_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const safeBaseName = path
            .basename(file.originalname, path.extname(file.originalname))
            .replace(/[^\w\u4e00-\u9fa5\-. ]/g, '_')
            .slice(0, 80);
        cb(null, `${Date.now()}_${safeBaseName}${path.extname(file.originalname) || '.ifc'}`);
    }
});

const ifcUpload = multer({
    storage: ifcStorage,
    limits: { fileSize: 500 * 1024 * 1024 }
});

// Wrap upload middleware to catch errors
const uploadMiddleware = (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            console.error('Multer error:', err);
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading.
            console.error('Unknown upload error:', err);
            return res.status(500).json({ success: false, message: `Server error: ${err.message}` });
        }
        // Everything went fine.
        next();
    });
};

const banzuUploadMiddleware = (req, res, next) => {
    banzuUpload.single('photo')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Banzu multer error:', err);
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        } else if (err) {
            console.error('Unknown banzu upload error:', err);
            return res.status(500).json({ success: false, message: `Server error: ${err.message}` });
        }
        next();
    });
};

// 获取汇总数据（测试阶段默认走 PostgreSQL，无数据时返回空结构）
app.get('/api/all-data', async (req, res) => {
    try {
        const [starRes, rankingRes, workshopRateRes] = await Promise.all([
            dbApi.data.getStar(),
            dbApi.data.getRankings(),
            dbApi.data.getSetting('workshopFirstPassRate')
        ]);

        const star = starRes && starRes.success && starRes.data ? starRes.data : null;
        const rankings = rankingRes && rankingRes.success && Array.isArray(rankingRes.data) ? rankingRes.data : [];
        const workshopRate = workshopRateRes && workshopRateRes.success && workshopRateRes.data
            ? Number(workshopRateRes.data.value || 0)
            : 0;

        res.json({
            star: {
                groupId: star && star.group_id ? star.group_id : '',
                groupName: star && star.group_name ? star.group_name : '一班组',
                passingRate: star && star.passing_rate != null ? Number(star.passing_rate) : 0,
                firstPassRate: star && star.first_pass_rate != null ? Number(star.first_pass_rate) : 0,
                photoUrl: star && star.photo_url ? star.photo_url : '/people.jpg'
            },
            ranking: rankings.map((item) => ({
                id: item.id,
                groupId: item.group_id || '',
                name: item.group_name || '',
                value: item.qualified_rate != null ? Number(item.qualified_rate) : 0,
                totalCount: item.total_count != null ? Number(item.total_count) : 0,
                qualifiedCount: item.qualified_count != null ? Number(item.qualified_count) : 0,
                period: item.period || ''
            })),
            workshopFirstPassRate: workshopRate
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const parseQcTemplate = (filePath) => {
    const workbook = XLSX.readFile(filePath, { cellText: false, cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, blankrows: false });

    const safeCellText = (v) => (v == null ? '' : String(v).trim());

    const fillMergedCells = (sheetObj, inputAoa) => {
        const merges = Array.isArray(sheetObj && sheetObj['!merges']) ? sheetObj['!merges'] : [];
        const out = Array.isArray(inputAoa) ? inputAoa.map((r) => (Array.isArray(r) ? r.slice() : [])) : [];

        const getAoaValue = (r, c) => (out[r] && out[r][c] != null ? out[r][c] : undefined);

        const setAoaValueIfEmpty = (r, c, v) => {
            while (out.length <= r) out.push([]);
            const row = out[r];
            while (row.length <= c) row.push(undefined);
            const cur = row[c];
            if (cur == null || String(cur).trim() === '') row[c] = v;
        };

        for (const m of merges) {
            if (!m || !m.s || !m.e) continue;
            const sr = m.s.r;
            const sc = m.s.c;
            const er = m.e.r;
            const ec = m.e.c;
            let topLeft = getAoaValue(sr, sc);
            if (topLeft == null || String(topLeft).trim() === '') {
                const addr = XLSX.utils.encode_cell({ r: sr, c: sc });
                topLeft = sheetObj && sheetObj[addr] ? sheetObj[addr].v : topLeft;
            }
            if (topLeft == null || String(topLeft).trim() === '') continue;
            for (let r = sr; r <= er; r++) {
                for (let c = sc; c <= ec; c++) {
                    setAoaValueIfEmpty(r, c, topLeft);
                }
            }
        }

        return out;
    };

    const mergedAoa = fillMergedCells(sheet, aoa);

    const normalized = (mergedAoa || []).map((row) =>
        (row || []).map((cell) => (typeof cell === 'string' ? cell.trim() : cell))
    );

    const headerRowIndex = normalized.findIndex((row) => {
        const joined = row.filter(Boolean).join('|');
        return joined.includes('序号') && joined.includes('项目') && joined.includes('允许偏差');
    });

    const title = (normalized[0] && normalized[0].find(Boolean)) || path.basename(filePath);

    if (headerRowIndex === -1) {
        return {
            id: path.basename(filePath),
            fileName: path.basename(filePath),
            title,
            sheetName,
            items: []
        };
    }

    const items = [];
    let current = null;

    const headerRow = normalized[headerRowIndex] || [];

    const findCol = (row, predicate) => {
        if (!row) return -1;
        for (let i = 0; i < row.length; i++) {
            const v = row[i];
            if (predicate(v == null ? '' : String(v))) return i;
        }
        return -1;
    };

    const seqCol = (() => {
        const idx = findCol(headerRow, (t) => safeCellText(t).includes('序号'));
        return idx >= 0 ? idx : 0;
    })();
    const itemCol = (() => {
        const idx = findCol(headerRow, (t) => safeCellText(t).includes('项目'));
        return idx >= 0 ? idx : 1;
    })();
    const toleranceCol = (() => {
        const idx = findCol(headerRow, (t) => {
            const s = safeCellText(t);
            return s.includes('允许') && s.includes('偏差');
        });
        return idx >= 0 ? idx : 2;
    })();

    for (let i = headerRowIndex + 1; i < normalized.length; i++) {
        const row = normalized[i] || [];
        const seq = row[seqCol];
        const itemName = row[itemCol];
        const toleranceText = row[toleranceCol];

        const hasAny = [seq, itemName, toleranceText].some((v) => v !== undefined && v !== null && String(v).trim() !== '');
        if (!hasAny) continue;

        const seqText = safeCellText(seq);
        const isSeq = /^[0-9]+$/.test(seqText);

        if (isSeq) {
            current = {
                seq: Number(seqText),
                name: safeCellText(itemName),
                toleranceTexts: []
            };
            if (safeCellText(toleranceText) !== '') {
                current.toleranceTexts.push(safeCellText(toleranceText));
            }
            items.push(current);
            continue;
        }

        if (!current) continue;

        if (safeCellText(toleranceText) !== '') {
            current.toleranceTexts.push(safeCellText(toleranceText));
        } else if (safeCellText(itemName) !== '') {
            current.toleranceTexts.push(safeCellText(itemName));
        }
    }

    return {
        id: path.basename(filePath),
        fileName: path.basename(filePath),
        title,
        sheetName,
        items
    };
};

let qcTemplateCache = null;
let qcTemplateCacheMtime = 0;

const loadQcTemplates = () => {
    try {
        const dirStat = fs.statSync(QC_TEMPLATE_DIR);
        if (qcTemplateCache && dirStat.mtimeMs === qcTemplateCacheMtime) {
            return qcTemplateCache;
        }

        const files = fs
            .readdirSync(QC_TEMPLATE_DIR)
            .filter((f) => f.toLowerCase().endsWith('.xlsx'))
            .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

        const templates = files.map((fileName) => {
            const fullPath = path.join(QC_TEMPLATE_DIR, fileName);
            return parseQcTemplate(fullPath);
        });

        qcTemplateCache = templates;
        qcTemplateCacheMtime = dirStat.mtimeMs;
        return templates;
    } catch (e) {
        return [];
    }
};

app.get('/api/qc-templates', (req, res) => {
    const templates = loadQcTemplates();
    res.json({ success: true, data: templates });
});

const resolveQcTemplatePath = (templateId) => {
    if (!templateId) return null;
    const safeName = path.basename(String(templateId));
    const fullPath = path.join(QC_TEMPLATE_DIR, safeName);
    if (!fullPath.startsWith(QC_TEMPLATE_DIR)) return null;
    if (!fs.existsSync(fullPath)) return null;
    return fullPath;
};

const normalizeAoa = (aoa) =>
    (aoa || []).map((row) => (row || []).map((cell) => (typeof cell === 'string' ? cell.trim() : cell)));

const findHeaderRowIndex = (normalized) =>
    normalized.findIndex((row) => {
        const joined = (row || []).filter(Boolean).join('|');
        return joined.includes('序号') && joined.includes('项目') && joined.includes('允许偏差');
    });

const findCol = (row, predicate) => {
    if (!row) return -1;
    for (let i = 0; i < row.length; i++) {
        const v = row[i];
        if (predicate(v == null ? '' : String(v))) return i;
    }
    return -1;
};

const safeCellText = (v) => (v == null ? '' : String(v).trim());

const mapComponentDetailPayload = (component) => {
    if (!component) return null;
    return {
        id: component.id || '',
        name: component.name || '',
        componentMark: component.componentMark || component.component_mark || '',
        spec: component.spec || '',
        positionCode: component.positionCode || component.position_code || '',
        bottomElevation: component.bottomElevation || component.bottom_elevation || '',
        topElevation: component.topElevation || component.top_elevation || '',
        length: component.length != null ? Number(component.length) : (component.length_value != null ? Number(component.length_value) : null),
        width: component.width != null ? Number(component.width) : (component.width_value != null ? Number(component.width_value) : null),
        area: component.area != null ? Number(component.area) : (component.area_value != null ? Number(component.area_value) : null),
        castUnitWeight: component.castUnitWeight != null ? Number(component.castUnitWeight) : (component.cast_unit_weight != null ? Number(component.cast_unit_weight) : null),
        weightNet: component.weightNet != null ? Number(component.weightNet) : (component.weight_net != null ? Number(component.weight_net) : null),
        weightGross: component.weightGross != null ? Number(component.weightGross) : (component.weight_gross != null ? Number(component.weight_gross) : null),
        material: component.material || '',
        mainReference: component.mainReference || component.main_reference || '',
        mainSpec: component.spec || '',
        teamId: component.teamId || component.team_id || '',
        teamName: component.teamName || component.team_name || '',
        teamLeader: component.teamLeader || component.team_leader || '',
        qualityInspector: component.qualityInspector || component.quality_inspector || '',
        qualityManager: component.qualityManager || component.quality_manager || '',
        planDate: component.planDate || component.plan_date || '',
        status: component.status || '待检测',
        ifcElementId: component.ifcElementId || component.ifc_element_id || '',
        ifcGlobalId: component.ifcGlobalId || component.ifc_global_id || '',
        ifcType: component.ifcType || component.ifc_type || ''
    };
};

app.get('/api/qc-templates/:id/download', (req, res) => {
    try {
        const fullPath = resolveQcTemplatePath(req.params.id);
        if (!fullPath) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }
        const filename = path.basename(fullPath);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        return res.sendFile(fullPath);
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/upload-ifc', requireRole(['admin', 'operator']), (req, res) => {
    ifcUpload.single('ifc')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: '未上传文件' });
        }
        const url = `/uploads/ifc/${req.file.filename}`;
        const fullPath = path.join(IFC_UPLOAD_DIR, req.file.filename);
        const jobId = createIfcParseJob(fullPath);
        const job = IFC_PARSE_JOBS.get(jobId);
        if (job) {
            job.url = url;
            job.filename = req.file.originalname;
            job.storedFilename = req.file.filename;
        }
        res.json({
            success: true,
            url,
            filename: req.file.originalname,
            storedFilename: req.file.filename,
            jobId,
            parse: {
                success: true,
                status: 'processing'
            }
        });
    });
});

app.get('/api/upload-ifc-status/:jobId', requireRole(['admin', 'operator']), (req, res) => {
    const job = IFC_PARSE_JOBS.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ success: false, message: '解析任务不存在或已过期' });
    }

    res.json({
        success: true,
        jobId: job.jobId,
        status: job.status,
        url: job.url || '',
        filename: job.filename || '',
        storedFilename: job.storedFilename || '',
        parse: job.parse || null,
        error: job.error || null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
    });
});

app.post('/api/ifc/batch', requireRole(['admin']), (req, res) => {
    ifcUpload.array('files', 50)(req, res, (err) => {
        if (err) {
            console.error('IFC upload error:', err);
            // Return detailed error message for debugging
            return res.status(400).json({ 
                success: false, 
                message: err.code ? `Upload error (${err.code}): ${err.message}` : err.message 
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files were uploaded' });
        }

        try {
            const files = req.files.map((f) => ({
                originalName: f.originalname,
                filename: f.filename,
                size: f.size,
                url: `/uploads/ifc/${f.filename}`
            }));

            res.json({ success: true, data: files });
        } catch (mapError) {
            console.error('Error processing uploaded files:', mapError);
            res.status(500).json({ success: false, message: 'Server error processing files' });
        }
    });
});

app.get('/api/ifc/list', (req, res) => {
    try {
        if (!fs.existsSync(IFC_UPLOAD_DIR)) {
            return res.json({ success: true, data: [] });
        }
        
        const files = fs.readdirSync(IFC_UPLOAD_DIR)
            .filter(file => file.endsWith('.ifc'))
            .map(file => {
                const stat = fs.statSync(path.join(IFC_UPLOAD_DIR, file));
                // Try to extract original name from timestamp_name format
                let originalName = file;
                const parts = file.split('_');
                if (parts.length > 1 && !isNaN(parts[0])) {
                    originalName = file.substring(parts[0].length + 1);
                }
                
                return {
                    originalName: originalName,
                    filename: file,
                    size: stat.size,
                    url: `/uploads/ifc/${file}`,
                    uploadTime: stat.birthtime
                };
            })
            .sort((a, b) => b.uploadTime - a.uploadTime); // Newest first

        res.json({ success: true, data: files });
    } catch (err) {
        console.error('Error listing IFC files:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/ifc/:filename', requireRole(['admin']), (req, res) => {
    try {
        const raw = req.params && req.params.filename ? String(req.params.filename) : '';
        const safeName = path.basename(raw);
        if (!safeName || safeName !== raw) {
            return res.status(400).json({ success: false, message: 'Invalid filename' });
        }

        const fullPath = path.join(IFC_UPLOAD_DIR, safeName);
        if (!fullPath.startsWith(IFC_UPLOAD_DIR)) {
            return res.status(400).json({ success: false, message: 'Invalid filename' });
        }

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        fs.unlinkSync(fullPath);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting IFC file:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取单个 IFC 构件的网格数据（用于大屏「构件模型」小窗纯前端渲染）
// GET /api/ifc/element?ifcFile=xxx.ifc&expressID=123
app.get('/api/ifc/element', async (req, res) => {
    try {
        const { ifcFile, expressID } = req.query;
        if (!ifcFile || expressID == null) {
            return res.status(400).json({ success: false, message: '缺少 ifcFile 或 expressID 参数' });
        }
        const safeName = path.basename(ifcFile);
        const fullPath = path.join(IFC_UPLOAD_DIR, safeName);
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ success: false, message: 'IFC 文件不存在' });
        }
        const buf = await fs.promises.readFile(fullPath);
        const api = new WebIFC.IfcAPI();
        await api.Init();
        const modelID = api.OpenModel(new Uint8Array(buf));

        const eid = Number(expressID);
        if (!Number.isFinite(eid)) {
            return res.status(400).json({ success: false, message: 'expressID 无效' });
        }

        const reverseTypeName = {};
        for (const k of Object.keys(WebIFC)) {
            const v = WebIFC[k];
            if (typeof v === 'number') reverseTypeName[v] = k;
        }

        const relDefines = api.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES);
        let name = '';
        let type = '';
        let globalId = '';

        const line = api.GetLine(modelID, eid, true);
        if (line) {
            const t = line.type;
            type = reverseTypeName[t] || String(t);
            if (line.GlobalId && line.GlobalId.value) {
                globalId = String(line.GlobalId.value);
            }
            if (line.Name && line.Name.value) {
                name = String(line.Name.value);
            } else if (line.Tag && line.Tag.value) {
                name = String(line.Tag.value);
            } else if (line.ObjectType && line.ObjectType.value) {
                name = String(line.ObjectType.value);
            }
        }

        // 从 IfcGeometricRepresentationContext 获取 geometry blob
        // web-ifc 的 GetVertexPositions / GetVertexDataIfcCount 没有 node API，直接返回构件基本信息
        // 前端会根据 expressID 在自己的 ifc viewer 里调用 buildGreenMesh
        res.json({
            success: true,
            data: {
                expressID: eid,
                globalId,
                name,
                type,
                ifcFile: safeName,
                url: `/uploads/ifc/${safeName}`
            }
        });
    } catch (error) {
        console.error('Error in GET /api/ifc/element:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取标兵信息
app.get('/api/star', async (req, res) => {
    try {
        const summaryRes = await buildComponentDrivenTeamSummary(req.query.projectId || null);
        if (summaryRes.success && summaryRes.data && summaryRes.data.star) {
            const star = summaryRes.data.star;
            return res.json({
                groupId: star.groupId || '',
                groupName: star.groupName || '未分配班组',
                passingRate: Number(star.qualifiedRate || 0),
                firstPassRate: Number(summaryRes.data.workshopFirstPassRate || 0),
                photoUrl: star.photoUrl || '/people.jpg',
                teamLeader: star.teamLeader || '',
                qualityInspector: star.qualityInspector || '',
                qualityManager: star.qualityManager || '',
                componentCount: Number(star.componentCount || 0)
            });
        }

        const starRes = await dbApi.data.getStar();
        const star = starRes && starRes.success && starRes.data ? starRes.data : null;
        res.json({
            groupId: star && star.group_id ? star.group_id : '',
            groupName: star && star.group_name ? star.group_name : '一班组',
            passingRate: star && star.passing_rate != null ? Number(star.passing_rate) : 98,
            firstPassRate: star && star.first_pass_rate != null ? Number(star.first_pass_rate) : 95,
            photoUrl: star && star.photo_url ? star.photo_url : '/people.jpg'
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 更新标兵信息
app.post('/api/star', requireRole(['admin', 'operator']), banzuUploadMiddleware, async (req, res) => {
    try {
        const currentStarRes = await dbApi.data.getStar();
        const currentStar = currentStarRes && currentStarRes.success && currentStarRes.data ? currentStarRes.data : null;
        const groupsRes = await dbApi.data.getAllGroups();
        const groups = groupsRes && groupsRes.success && Array.isArray(groupsRes.data) ? groupsRes.data : [];
        const rawGroupName = req.body.groupName;
        const rawPhotoUrl = req.body.photoUrl;
        const groupName = rawGroupName && rawGroupName !== 'undefined' && rawGroupName !== 'null'
            ? String(rawGroupName).trim()
            : (currentStar && currentStar.group_name ? currentStar.group_name : '一班组');
        const group = groups.find((g) => String(g.name).trim() === groupName);

        let photoUrl = currentStar && currentStar.photo_url ? currentStar.photo_url : '/people.jpg';
        if (req.file) {
            photoUrl = finalizeBanzuUpload(req.file, groupName);
        } else if (rawPhotoUrl && rawPhotoUrl !== 'undefined' && rawPhotoUrl !== 'null') {
            photoUrl = String(rawPhotoUrl).trim();
        } else if (group && group.photo_url) {
            photoUrl = group.photo_url;
        }

        let passingRate = currentStar && currentStar.passing_rate != null ? Number(currentStar.passing_rate) : 98;
        if (req.body.passingRate != null && req.body.passingRate !== 'undefined' && req.body.passingRate !== 'null') {
            const rate = Number(req.body.passingRate);
            if (!Number.isNaN(rate)) {
                passingRate = rate;
            }
        }

        const updateStarRes = await dbApi.data.updateStar({
            group_name: groupName,
            group_id: group ? group.id : (currentStar && currentStar.group_id ? currentStar.group_id : null),
            photo_url: photoUrl,
            passing_rate: passingRate,
            first_pass_rate: currentStar && currentStar.first_pass_rate != null ? Number(currentStar.first_pass_rate) : 95,
            photo_updated_at: new Date().toISOString()
        });
        if (!updateStarRes.success) throw new Error(updateStarRes.error || '更新标兵失败');

        const period = new Date().toISOString().substring(0, 7);
        const rankingRes = await dbApi.data.getRankings(period);
        const rankingRows = rankingRes && rankingRes.success && Array.isArray(rankingRes.data) ? rankingRes.data : [];
        const ranking = rankingRows.map((row) => ({
            group_id: row.group_id || null,
            group_name: row.group_name || '',
            qualified_rate: row.qualified_rate != null ? Number(row.qualified_rate) : 0
        }));
        const existingIndex = ranking.findIndex((item) => String(item.group_name).trim() === groupName);
        if (existingIndex >= 0) {
            ranking[existingIndex] = {
                ...ranking[existingIndex],
                group_id: group ? group.id : ranking[existingIndex].group_id,
                group_name: groupName,
                qualified_rate: passingRate
            };
        } else {
            ranking.push({
                group_id: group ? group.id : null,
                group_name: groupName,
                qualified_rate: passingRate
            });
        }
        ranking.sort((a, b) => Number(b.qualified_rate || 0) - Number(a.qualified_rate || 0));
        const rankingUpdateRes = await dbApi.data.updateRankingsByPeriod(period, ranking);
        if (!rankingUpdateRes.success) throw new Error(rankingUpdateRes.error || '更新排名失败');

        res.json({
            success: true,
            data: {
                groupId: group ? group.id : '',
                groupName,
                passingRate,
                firstPassRate: currentStar && currentStar.first_pass_rate != null ? Number(currentStar.first_pass_rate) : 95,
                photoUrl
            }
        });
    } catch (error) {
        console.error('Error in POST /api/star:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取排名信息
app.get('/api/ranking', async (req, res) => {
    try {
        const summaryRes = await buildComponentDrivenTeamSummary(req.query.projectId || null);
        if (summaryRes.success && summaryRes.data) {
            return res.json({
                success: true,
                data: (summaryRes.data.ranking || []).map((item) => ({
                    groupId: item.groupId || '',
                    name: item.groupName || '',
                    value: Number(item.qualifiedRate || 0),
                    teamLeader: item.teamLeader || '',
                    qualityInspector: item.qualityInspector || '',
                    qualityManager: item.qualityManager || '',
                    componentCount: Number(item.componentCount || 0)
                })),
                workshopFirstPassRate: Number(summaryRes.data.workshopFirstPassRate || 0)
            });
        }

        const rankingRes = await dbApi.data.getRankings();
        const workshopRateRes = await dbApi.data.getSetting('workshopFirstPassRate');
        const ranking = rankingRes && rankingRes.success && Array.isArray(rankingRes.data)
            ? rankingRes.data.map((row) => ({
                id: row.id,
                groupId: row.group_id || '',
                name: row.group_name || '',
                value: row.qualified_rate != null ? Number(row.qualified_rate) : 0
            }))
            : [];
        const workshopFirstPassRate = workshopRateRes && workshopRateRes.success && workshopRateRes.data
            ? Number(workshopRateRes.data.value || 0)
            : 97.5;
        res.json({ success: true, data: ranking, workshopFirstPassRate });
    } catch (error) {
        console.error('Error in GET /api/ranking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/projects/:id/team-summary', async (req, res) => {
    try {
        const summaryRes = await buildComponentDrivenTeamSummary(req.params.id);
        if (!summaryRes.success) {
            return res.status(500).json({ success: false, message: summaryRes.error || '获取班组汇总失败' });
        }
        res.json({ success: true, data: summaryRes.data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/ranking', requireRole(['admin', 'operator']), async (req, res) => {
    try {
        const incoming = req.body && (req.body.ranking || req.body.data || req.body);
        const ranking = (Array.isArray(incoming) ? incoming : []).map((it) => ({
            name: it && it.name != null ? String(it.name).trim() : '',
            value: it && it.value != null ? Number(it.value) : 0
        })).filter((it) => it.name);
        const groupsRes = await dbApi.data.getAllGroups();
        const groups = groupsRes && groupsRes.success && Array.isArray(groupsRes.data) ? groupsRes.data : [];
        const period = new Date().toISOString().substring(0, 7);
        const normalized = ranking
            .map((it) => {
                const group = groups.find((g) => String(g.name).trim() === it.name);
                return {
                    group_id: group ? group.id : null,
                    group_name: it.name,
                    qualified_rate: Number.isFinite(it.value) ? it.value : 0
                };
            })
            .sort((a, b) => Number(b.qualified_rate || 0) - Number(a.qualified_rate || 0));
        const updateRankingsRes = await dbApi.data.updateRankingsByPeriod(period, normalized);
        if (!updateRankingsRes.success) throw new Error(updateRankingsRes.error || '更新排名失败');
        if (req.body && req.body.workshopFirstPassRate != null) {
            const rate = Number(req.body.workshopFirstPassRate);
            if (!Number.isNaN(rate)) {
                const settingRes = await dbApi.data.setSetting('workshopFirstPassRate', String(rate), '车间一次通过率');
                if (!settingRes.success) throw new Error(settingRes.error || '更新车间一次通过率失败');
            }
        }

        const topOne = normalized[0] || null;
        const currentStarRes = await dbApi.data.getStar();
        const currentStar = currentStarRes && currentStarRes.success && currentStarRes.data ? currentStarRes.data : null;
        if (topOne) {
            const topGroup = groups.find((g) => g.id === topOne.group_id) || groups.find((g) => String(g.name).trim() === topOne.group_name);
            const starUpdateRes = await dbApi.data.updateStar({
                group_name: topOne.group_name,
                group_id: topGroup ? topGroup.id : null,
                photo_url: topGroup && topGroup.photo_url ? topGroup.photo_url : (currentStar && currentStar.photo_url ? currentStar.photo_url : '/people.jpg'),
                passing_rate: Number(topOne.qualified_rate || 0),
                first_pass_rate: currentStar && currentStar.first_pass_rate != null ? Number(currentStar.first_pass_rate) : 95,
                photo_updated_at: currentStar && currentStar.photo_updated_at ? currentStar.photo_updated_at : null
            });
            if (!starUpdateRes.success) throw new Error(starUpdateRes.error || '更新标兵失败');
        }

        const workshopRateRes = await dbApi.data.getSetting('workshopFirstPassRate');
        res.json({
            success: true,
            data: normalized.map((it) => ({ name: it.group_name, value: it.qualified_rate })),
            workshopFirstPassRate: workshopRateRes && workshopRateRes.success && workshopRateRes.data
                ? Number(workshopRateRes.data.value || 0)
                : 97.5
        });
    } catch (error) {
        console.error('Error in POST /api/ranking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/today-plan', async (req, res) => {
    try {
        const today = getTodayStr();
        const { startDate, endDate, projectId } = req.query;
        const rowsRes = await dbApi.data.getTodayPlanRows({ startDate, endDate, projectId, today });
        if (!rowsRes.success) {
            console.error('GET /api/today-plan query failed:', rowsRes.error || 'unknown error');
            return res.status(500).json({ success: false, message: rowsRes.error || '获取今日计划失败' });
        }
        const activeRes = await dbApi.data.getActiveProject();
        const activeId = activeRes.success && activeRes.data ? activeRes.data.id : null;
        const planItems = (rowsRes.data || []).map((row) => ({
            project: row.project_name,
            projectId: row.project_id,
            componentId: row.component_id,
            componentName: row.component_mark || row.component_name,
            componentMark: row.component_mark || '',
            spec: row.spec || '',
            team: row.team_leader || '',
            teamName: row.team_name || '',
            inspector: row.quality_inspector || '',
            manager: row.quality_manager || '',
            selfInspector: row.self_inspector || '',
            location: `${row.province || ''}${row.city || ''}`,
            type: row.ifc_type || (row.component_name || '').split(' ')[0],
            status: normalizeComponentStatus(row.status),
            planDate: row.plan_date || '',
            count: 1,
            ifcUrl: row.ifc_url || '',
            ifcElementId: row.ifc_element_id || '',
            ifcGlobalId: row.ifc_global_id || '',
            teamId: row.team_id || ''
        }));
        res.json({ success: true, data: planItems, activeProjectId: activeId });
    } catch (error) {
        console.error('Error in GET /api/today-plan:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/** 历史检测记录：来自各项目构件，计划日期早于今天，或状态为合格/不合格 */
app.get('/api/inspection-history', async (req, res) => {
    try {
        const today = getTodayStr();
        const rowsRes = await dbApi.data.getInspectionHistoryRows(today);
        if (!rowsRes.success) {
            return res.status(500).json({ success: false, message: rowsRes.error || '获取历史检测记录失败' });
        }
        const rows = (rowsRes.data || []).map((row) => ({
            projectName: row.project_name || '—',
            componentType: row.ifc_type || '—',
            componentNumber: row.component_mark || row.component_name || row.component_id || '—',
            inspectionDate: row.plan_date || today
        }));
        res.json({ success: true, data: rows });
    } catch (e) {
        console.error('GET /api/inspection-history', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/today-plan', requireRole(['admin', 'operator']), async (req, res) => {
    try {
        const incoming = req.body && (req.body.todayPlan || req.body.planItems || req.body.data || req.body.list || req.body);
        const items = Array.isArray(incoming) ? incoming : [];
        const grouped = new Map();
        for (const item of items) {
            const projectId = String(item.projectId || '');
            if (!projectId || !item.componentId) continue;
            if (!grouped.has(projectId)) grouped.set(projectId, []);
            grouped.get(projectId).push(item);
        }
        for (const [projectId, rows] of grouped.entries()) {
            for (const item of rows) {
                const updates = {};
                if (item.teamId !== undefined) updates.team_id = item.teamId || '';
                if (item.teamName !== undefined) updates.team_name = item.teamName || '';
                if (item.team !== undefined) updates.team_leader = item.team || '';
                if (item.teamLeader !== undefined) updates.team_leader = item.teamLeader || '';
                if (item.selfInspector !== undefined) updates.self_inspector = item.selfInspector || '';
                if (item.inspector !== undefined) updates.quality_inspector = item.inspector || '';
                if (item.qualityInspector !== undefined) updates.quality_inspector = item.qualityInspector || '';
                if (item.manager !== undefined) updates.quality_manager = item.manager || '';
                if (item.qualityManager !== undefined) updates.quality_manager = item.qualityManager || '';
                if (item.planDate !== undefined) updates.plan_date = item.planDate || '';
                if (item.status !== undefined) updates.status = normalizeComponentStatus(item.status);
                const updateRes = await dbApi.data.updateComponent(item.componentId, updates);
                if (!updateRes.success) {
                    return res.status(500).json({ success: false, message: updateRes.error || '保存今日计划失败' });
                }
            }
            const statsRes = await recalcProjectStats(projectId);
            if (!statsRes.success) {
                return res.status(500).json({ success: false, message: statsRes.error || '项目统计更新失败' });
            }
        }
        const today = getTodayStr();
        const rowsRes = await dbApi.data.getTodayPlanRows({ today });
        if (!rowsRes.success) {
            return res.status(500).json({ success: false, message: rowsRes.error || '读取今日计划失败' });
        }
        const data = (rowsRes.data || []).map((row) => ({
            project: row.project_name,
            projectId: row.project_id,
            componentId: row.component_id,
            componentName: row.component_mark || row.component_name,
            componentMark: row.component_mark || '',
            spec: row.spec || '',
            team: row.team_leader || '',
            teamName: row.team_name || '',
            inspector: row.quality_inspector || '',
            manager: row.quality_manager || '',
            selfInspector: row.self_inspector || '',
            location: `${row.province || ''}${row.city || ''}`,
            type: row.ifc_type || (row.component_name || '').split(' ')[0],
            status: normalizeComponentStatus(row.status),
            planDate: row.plan_date || '',
            count: 1,
            ifcUrl: row.ifc_url || '',
            ifcElementId: row.ifc_element_id || '',
            ifcGlobalId: row.ifc_global_id || '',
            teamId: row.team_id || ''
        }));
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error in POST /api/today-plan:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取班组列表
app.get('/api/groups', async (req, res) => {
    try {
        const result = await dbApi.data.getAllGroups();
        if (!result.success) throw new Error(result.error || '获取班组失败');
        res.json((result.data || []).map((g) => ({
            id: g.id,
            name: g.name,
            photoUrl: g.photo_url || '/people.jpg'
        })));
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 添加班组
app.post('/api/groups', requireRole(['admin', 'operator']), banzuUploadMiddleware, async (req, res) => {
    try {
        const name = req.body && req.body.name ? String(req.body.name).trim() : '';
        if (!name) {
            return res.status(400).json({ success: false, message: '班组名称不能为空' });
        }
        const photoUrl = req.file
            ? finalizeBanzuUpload(req.file, name)
            : (req.body && req.body.photoUrl ? String(req.body.photoUrl).trim() : `/banzu/${encodeURIComponent(`${name}.jpg`)}`);
        const newGroup = {
            id: Date.now().toString(),
            name,
            photo_url: photoUrl || '/people.jpg'
        };
        const createRes = await dbApi.data.createGroup(newGroup);
        if (!createRes.success) throw new Error(createRes.error || '新增班组失败');
        const listRes = await dbApi.data.getAllGroups();
        if (!listRes.success) throw new Error(listRes.error || '获取班组失败');
        res.json({
            success: true,
            data: (listRes.data || []).map((g) => ({
                id: g.id,
                name: g.name,
                photoUrl: g.photo_url || '/people.jpg'
            }))
        });
    } catch (error) {
        console.error('Error in POST /api/groups:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 删除班组
app.delete('/api/groups/:id', requireRole(['admin', 'operator']), async (req, res) => {
    try {
        const delRes = await dbApi.data.deleteGroup(req.params.id);
        if (!delRes.success) throw new Error(delRes.error || '删除班组失败');
        const listRes = await dbApi.data.getAllGroups();
        if (!listRes.success) throw new Error(listRes.error || '获取班组失败');
        res.json({
            success: true,
            data: (listRes.data || []).map((g) => ({
                id: g.id,
                name: g.name,
                photoUrl: g.photo_url || '/people.jpg'
            }))
        });
    } catch (error) {
        console.error('Error in DELETE /api/groups:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 更新班组
app.put('/api/groups/:id', requireRole(['admin', 'operator']), banzuUploadMiddleware, async (req, res) => {
    try {
        const currentRes = await dbApi.data.getAllGroups();
        if (!currentRes.success) throw new Error(currentRes.error || '获取班组失败');
        const current = (currentRes.data || []).find((g) => String(g.id) === String(req.params.id));
        if (!current) {
            return res.status(404).json({ success: false, message: '班组不存在' });
        }
        const updates = {};
        if (req.body.name) updates.name = String(req.body.name).trim();
        if (req.file) updates.photo_url = finalizeBanzuUpload(req.file, updates.name || current.name);
        else if (req.body.photoUrl) updates.photo_url = String(req.body.photoUrl).trim();
        const updateRes = await dbApi.data.updateGroup(req.params.id, updates);
        if (!updateRes.success) throw new Error(updateRes.error || '更新班组失败');
        const refreshedRes = await dbApi.data.getAllGroups();
        if (!refreshedRes.success) throw new Error(refreshedRes.error || '获取班组失败');
        const refreshed = (refreshedRes.data || []).find((g) => String(g.id) === String(req.params.id));
        res.json({
            success: true,
            data: refreshed ? {
                id: refreshed.id,
                name: refreshed.name,
                photoUrl: refreshed.photo_url || '/people.jpg'
            } : null
        });
    } catch (error) {
        console.error('Error in PUT /api/groups:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── 辅助函数 ────────────────────────────────────────────────────────────────
function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}
function getTomorrowStr() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}
function genId() { return 'p' + Date.now(); }
function genCompId() { return `GJ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function mapDbComponentToApi(component) {
    if (!component) return null;
    return {
        id: component.id,
        name: component.name || '',
        componentMark: component.componentMark || component.component_mark || '',
        spec: component.spec || '',
        teamId: component.teamId || component.team_id || '',
        teamName: component.teamName || component.team_name || '',
        teamLeader: component.teamLeader || component.team_leader || '',
        selfInspector: component.selfInspector || component.self_inspector || '',
        qualityInspector: component.qualityInspector || component.quality_inspector || '',
        qualityManager: component.qualityManager || component.quality_manager || '',
        planDate: component.planDate || component.plan_date || '',
        status: normalizeComponentStatus(component.status),
        ifcElementId: component.ifcElementId || component.ifc_element_id || '',
        ifcGlobalId: component.ifcGlobalId || component.ifc_global_id || '',
        ifcType: component.ifcType || component.ifc_type || ''
    };
}

async function recalcProjectStats(projectId) {
    const projectRes = await dbApi.data.getProjectById(projectId);
    if (!projectRes.success) return projectRes;
    if (!projectRes.data) {
        return { success: false, status: 404, error: '项目不存在' };
    }
    const componentsRes = await dbApi.data.getComponentsByProject(projectId);
    if (!componentsRes.success) return componentsRes;
    const components = (componentsRes.data || []).map(mapDbComponentToApi);
    const beamColumnCount = components.length;
    const pendingCount = components.filter((c) => c.status === '待检测').length;
    const inspectingCount = components.filter((c) => c.status === '检测中').length;
    const qualifiedCount = components.filter((c) => c.status === '合格').length;
    const unqualifiedCount = components.filter((c) => c.status === '不合格').length;
    const inspectedCount = qualifiedCount + unqualifiedCount;
    const qualifiedRate = inspectedCount > 0 ? `${((qualifiedCount / inspectedCount) * 100).toFixed(1)}%` : '0.0%';
    const teamCount = new Set(
        components
            .map((c) => (c.teamName || c.teamLeader || '').trim())
            .filter(Boolean)
    ).size;
    const updateRes = await dbApi.data.updateProject(projectId, {
        beam_column_count: beamColumnCount,
        inspected_count: inspectedCount,
        qualified_count: qualifiedCount,
        qualified_rate: qualifiedRate
    });
    if (!updateRes.success) return updateRes;
    if (typeof dbApi.data.upsertProjectStatistics === 'function') {
        const statsRes = await dbApi.data.upsertProjectStatistics({
            project_id: projectId,
            component_count: beamColumnCount,
            inspected_count: inspectedCount,
            qualified_count: qualifiedCount,
            pending_count: pendingCount,
            inspecting_count: inspectingCount,
            unqualified_count: unqualifiedCount,
            qualified_rate: qualifiedRate,
            team_count: teamCount
        });
        if (!statsRes.success) return statsRes;
    }
    return {
        success: true,
        data: {
            beamColumnCount,
            componentCount: beamColumnCount,
            inspectedCount,
            qualifiedCount,
            pendingCount,
            inspectingCount,
            unqualifiedCount,
            qualifiedRate,
            teamCount
        }
    };
}

async function buildComponentDrivenTeamSummary(projectId = null) {
    let projectIds = [];
    if (projectId) {
        projectIds = [String(projectId)];
    } else {
        const activeRes = await dbApi.data.getActiveProject();
        if (activeRes && activeRes.success && activeRes.data && activeRes.data.id) {
            projectIds = [String(activeRes.data.id)];
        } else {
            const projectsRes = await dbApi.data.getAllProjectsWithComponents();
            if (!projectsRes.success) {
                return { success: false, error: projectsRes.error || '获取项目列表失败' };
            }
            projectIds = (projectsRes.data || []).map((item) => String(item.id || '')).filter(Boolean);
        }
    }

    const groupsRes = await dbApi.data.getAllGroups();
    const groups = groupsRes && groupsRes.success && Array.isArray(groupsRes.data) ? groupsRes.data : [];
    const photoByName = new Map(groups.map((group) => [
        String(group.name || '').trim(),
        group.photo_url || group.photoUrl || ''
    ]));

    const teamMap = new Map();
    let totalQualified = 0;
    let totalReviewed = 0;

    for (const pid of projectIds) {
        const componentsRes = await dbApi.data.getComponentsByProject(pid);
        if (!componentsRes.success) {
            return { success: false, error: componentsRes.error || '获取构件失败' };
        }
        const components = (componentsRes.data || []).map(mapDbComponentToApi);
        for (const component of components) {
            const teamName = String(component.teamName || component.teamLeader || '').trim();
            if (!teamName) continue;
            if (!teamMap.has(teamName)) {
                teamMap.set(teamName, {
                    groupId: String(component.teamId || '').trim(),
                    groupName: teamName,
                    photoUrl: photoByName.get(teamName) || '',
                    teamLeader: String(component.teamLeader || '').trim(),
                    selfInspector: String(component.selfInspector || '').trim(),
                    qualityInspector: String(component.qualityInspector || '').trim(),
                    qualityManager: String(component.qualityManager || '').trim(),
                    componentCount: 0,
                    qualifiedCount: 0,
                    unqualifiedCount: 0,
                    inspectingCount: 0,
                    pendingCount: 0,
                });
            }

            const bucket = teamMap.get(teamName);
            bucket.componentCount += 1;
            if (!bucket.groupId && component.teamId) bucket.groupId = String(component.teamId).trim();
            if (!bucket.teamLeader && component.teamLeader) bucket.teamLeader = String(component.teamLeader).trim();
            if (!bucket.selfInspector && component.selfInspector) bucket.selfInspector = String(component.selfInspector).trim();
            if (!bucket.qualityInspector && component.qualityInspector) bucket.qualityInspector = String(component.qualityInspector).trim();
            if (!bucket.qualityManager && component.qualityManager) bucket.qualityManager = String(component.qualityManager).trim();

            if (component.status === '合格') {
                bucket.qualifiedCount += 1;
                totalQualified += 1;
                totalReviewed += 1;
            } else if (component.status === '不合格') {
                bucket.unqualifiedCount += 1;
                totalReviewed += 1;
            } else if (component.status === '检测中') {
                bucket.inspectingCount += 1;
            } else {
                bucket.pendingCount += 1;
            }
        }
    }

    const ranking = Array.from(teamMap.values()).map((item) => {
        const reviewedCount = item.qualifiedCount + item.unqualifiedCount;
        const qualifiedRate = reviewedCount > 0 ? Number(((item.qualifiedCount / reviewedCount) * 100).toFixed(1)) : 0;
        return {
            ...item,
            reviewedCount,
            qualifiedRate,
        };
    }).sort((a, b) => {
        if (b.qualifiedRate !== a.qualifiedRate) return b.qualifiedRate - a.qualifiedRate;
        if (b.reviewedCount !== a.reviewedCount) return b.reviewedCount - a.reviewedCount;
        return a.groupName.localeCompare(b.groupName, 'zh-Hans-CN');
    });

    const star = ranking[0] || null;
    const workshopFirstPassRate = totalReviewed > 0 ? Number(((totalQualified / totalReviewed) * 100).toFixed(1)) : 0;

    return {
        success: true,
        data: {
            ranking,
            star,
            workshopFirstPassRate,
        }
    };
}

// 获取项目列表（带当前激活 ID）
app.get('/api/projects', async (req, res) => {
    const projectsRes = await dbApi.data.getAllProjectsWithComponents();
    if (!projectsRes.success) {
        return res.status(500).json({ success: false, message: projectsRes.error || '获取项目列表失败' });
    }
    const activeProject = projectsRes.data.find((project) => project.isActive) || projectsRes.data[0] || null;
    res.json({
        success: true,
        data: projectsRes.data,
        activeProjectId: activeProject ? activeProject.id : null
    });
});

// 获取项目详情（含构件列表）
app.get('/api/projects/:id', async (req, res) => {
    const projectRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
    if (!projectRes.success || !projectRes.data) {
        return res.status(404).json({ success: false, message: '项目不存在' });
    }
    res.json({ success: true, data: projectRes.data });
});

// 获取项目统计
app.get('/api/projects/:id/statistics', async (req, res) => {
    const projectRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
    if (!projectRes.success || !projectRes.data) return res.status(404).json({ success: false, message: '项目不存在' });
    const project = projectRes.data;
    const components = project.components || [];
    const stats = {
        total: components.length,
        pending: components.filter(c => c.status === '待检测').length,
        inspecting: components.filter(c => c.status === '检测中').length,
        completed: components.filter(c => c.status === '合格').length,
        unqualified: components.filter(c => c.status === '不合格').length,
        inspected: components.filter(c => c.status === '合格' || c.status === '不合格').length,
        qualified: components.filter(c => c.status === '合格').length,
        rate: project.inspectedCount > 0 ? ((project.qualifiedCount / project.inspectedCount) * 100).toFixed(1) + '%' : '0.0%',
        byType: {},
        byTeam: {},
        byPlanDate: {}
    };
    components.forEach(c => {
        if (c.ifcType) {
            stats.byType[c.ifcType] = (stats.byType[c.ifcType] || 0) + 1;
        }
        if (c.teamName || c.teamLeader) {
            const team = c.teamName || c.teamLeader;
            stats.byTeam[team] = (stats.byTeam[team] || 0) + 1;
        }
        if (c.planDate) {
            stats.byPlanDate[c.planDate] = (stats.byPlanDate[c.planDate] || 0) + 1;
        }
    });
    res.json({ success: true, data: stats });
});

app.get('/api/projects/:id/statistics-summary', async (req, res) => {
    try {
        if (typeof dbApi.data.getProjectStatisticsById !== 'function') {
            return res.status(501).json({ success: false, message: '统计摘要接口未启用' });
        }
        const projectRes = await dbApi.data.getProjectById(req.params.id);
        if (!projectRes.success) {
            return res.status(500).json({ success: false, message: projectRes.error || '读取项目失败' });
        }
        if (!projectRes.data) {
            return res.status(404).json({ success: false, message: '项目不存在' });
        }
        const summaryRes = await dbApi.data.getProjectStatisticsById(req.params.id);
        if (!summaryRes.success) {
            return res.status(500).json({ success: false, message: summaryRes.error || '获取统计摘要失败' });
        }
        if (!summaryRes.data) {
            const rebuildRes = await recalcProjectStats(req.params.id);
            if (!rebuildRes.success) {
                return res.status(rebuildRes.status || 500).json({ success: false, message: rebuildRes.error || '统计重建失败' });
            }
            const retryRes = await dbApi.data.getProjectStatisticsById(req.params.id);
            if (!retryRes.success) {
                return res.status(500).json({ success: false, message: retryRes.error || '获取统计摘要失败' });
            }
            return res.json({ success: true, data: retryRes.data || null });
        }
        return res.json({ success: true, data: summaryRes.data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/projects/:id/components/detail', async (req, res) => {
    try {
        const projectId = String(req.params.id || '');
        const expressID = req.query.expressID != null ? String(req.query.expressID) : '';

        if (!projectId) {
            return res.status(400).json({ success: false, message: '缺少项目 ID' });
        }
        if (!expressID) {
            return res.status(400).json({ success: false, message: '缺少 expressID 参数' });
        }

        let detailRes = null;
        if (expressID && typeof dbApi.data.getComponentByProjectAndIfcElementId === 'function') {
            detailRes = await dbApi.data.getComponentByProjectAndIfcElementId(projectId, expressID);
        }

        if (!detailRes || !detailRes.success) {
            return res.status(500).json({ success: false, message: (detailRes && detailRes.error) || '查询构件详情失败' });
        }
        if (!detailRes.data) {
            return res.status(404).json({ success: false, message: '未找到构件详情' });
        }

        return res.json({ success: true, data: mapComponentDetailPayload(detailRes.data) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/projects/:id/components/marks', async (req, res) => {
    try {
        const projectId = String(req.params.id || '');
        if (!projectId) {
            return res.status(400).json({ success: false, message: '缺少项目 ID' });
        }
        if (typeof dbApi.data.getComponentMarksByProject !== 'function') {
            return res.status(501).json({ success: false, message: '构件索引接口未启用' });
        }
        const marksRes = await dbApi.data.getComponentMarksByProject(projectId);
        if (!marksRes || !marksRes.success) {
            return res.status(500).json({ success: false, message: (marksRes && marksRes.error) || '查询构件索引失败' });
        }
        const seen = new Set();
        const items = (Array.isArray(marksRes.data) ? marksRes.data : [])
            .map((row) => ({
                expressID: row && row.ifc_element_id != null ? String(row.ifc_element_id) : '',
                componentMark: row && row.component_mark ? String(row.component_mark) : '',
                name: row && row.name ? String(row.name) : '',
                ifcType: row && row.ifc_type ? String(row.ifc_type) : '',
                material: row && row.material ? String(row.material) : '',
                spec: row && row.spec ? String(row.spec) : '',
                mainReference: row && row.main_reference ? String(row.main_reference) : '',
                positionCode: row && row.position_code ? String(row.position_code) : '',
                bottomElevation: row && row.bottom_elevation ? String(row.bottom_elevation) : '',
                topElevation: row && row.top_elevation ? String(row.top_elevation) : '',
                length: row && row.length_value != null ? Number(row.length_value) : null,
                width: row && row.width_value != null ? Number(row.width_value) : null,
                area: row && row.area_value != null ? Number(row.area_value) : null,
                castUnitWeight: row && row.cast_unit_weight != null ? Number(row.cast_unit_weight) : null,
                weightNet: row && row.weight_net != null ? Number(row.weight_net) : null,
                weightGross: row && row.weight_gross != null ? Number(row.weight_gross) : null
            }))
            .filter((row) => row.expressID && !seen.has(row.expressID) && seen.add(row.expressID));

        return res.json({ success: true, data: items });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// 批量导入 IFC 构件到项目（从 IFC 解析结果批量创建）
app.post('/api/projects/:id/components/import-ifc', requireRole(['admin', 'operator']), async (req, res) => {
    try {
        const result = await importIfcElementsToProject(req.params.id, Array.isArray(req.body.elements) ? req.body.elements : []);
        if (!result.success) {
            return res.status(result.status || 500).json({ success: false, message: result.message || '导入 IFC 构件失败' });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/projects/:id/components/sync-ifc', requireRole(['admin', 'operator']), async (req, res) => {
    try {
        const projectRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
        if (!projectRes.success || !projectRes.data) {
            return res.status(404).json({ success: false, message: '项目不存在' });
        }

        const project = projectRes.data;
        const ifcUrl = String(project.ifcUrl || '').trim();
        if (!ifcUrl) {
            return res.status(400).json({ success: false, message: '项目未绑定 IFC 文件' });
        }

        const storedFilename = path.basename(ifcUrl);
        const fullPath = path.join(IFC_UPLOAD_DIR, storedFilename);
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ success: false, message: '项目 IFC 文件不存在' });
        }

        const parseJobId = createIfcParseJob(fullPath);
        const startedAt = Date.now();
        let job = IFC_PARSE_JOBS.get(parseJobId);

        while (job && job.status === 'processing' && Date.now() - startedAt < 10 * 60 * 1000) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            job = IFC_PARSE_JOBS.get(parseJobId);
        }

        if (!job) {
            return res.status(500).json({ success: false, message: 'IFC 解析任务丢失' });
        }
        if (job.status === 'failed') {
            return res.status(500).json({ success: false, message: job.error || 'IFC 解析失败' });
        }
        if (job.status !== 'done' || !job.parse) {
            return res.status(500).json({ success: false, message: 'IFC 解析未完成' });
        }

        const importElements = buildImportElementsFromParse(job.parse);
        const result = await importIfcElementsToProject(req.params.id, importElements);
        if (!result.success) {
            return res.status(result.status || 500).json({ success: false, message: result.message || '同步 IFC 失败' });
        }

        return res.json({
            ...result,
            parseTotal: Number(job.parse.total || 0),
            parseFromCache: job.parse.fromCache === true
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// 添加项目
app.post('/api/projects', requireRole(['admin']), async (req, res) => {
    try {
        const { name, province, city, center, ifcUrl, beamColumnCount, ifcFileName, ifcFileSize } = req.body;
        if (!name) return res.status(400).json({ success: false, message: '项目名称不能为空' });

        const countRes = await dbApi.data.getProjectCount();
        const projectId = genId();
        const createRes = await dbApi.data.createProject({
            id: projectId,
            name,
            province: province || '',
            city: city || '',
            ifc_url: ifcUrl || '',
            ifc_filename: ifcFileName || '',
            ifc_file_size: Number(ifcFileSize) || 0,
            center_lng: Array.isArray(center) ? Number(center[0]) : null,
            center_lat: Array.isArray(center) ? Number(center[1]) : null,
            beam_column_count: Number(beamColumnCount) || 0,
            inspected_count: 0,
            qualified_count: 0,
            qualified_rate: '0.0%',
            is_active: countRes.success && countRes.data && Number(countRes.data.count) === 0 ? 1 : 0
        });
        if (!createRes.success) {
            return res.status(500).json({ success: false, message: createRes.error || '项目创建失败' });
        }
        if (countRes.success && countRes.data && Number(countRes.data.count) === 0) {
            await dbApi.data.setActiveProject(projectId);
        }
        const projectsRes = await dbApi.data.getAllProjectsWithComponents();
        const activeProject = projectsRes.success ? (projectsRes.data.find((project) => project.isActive) || projectsRes.data[0] || null) : null;
        res.json({
            success: true,
            data: projectsRes.success ? projectsRes.data : [],
            activeProjectId: activeProject ? activeProject.id : null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 删除项目
app.delete('/api/projects/:id', requireRole(['admin']), async (req, res) => {
    try {
        const targetRes = await dbApi.data.getProjectById(req.params.id);
        if (!targetRes.success || !targetRes.data) {
            return res.status(404).json({ success: false, message: '项目不存在' });
        }
        const activeRes = await dbApi.data.getActiveProject();
        const deleteRes = await dbApi.data.deleteProject(req.params.id);
        if (!deleteRes.success) {
            return res.status(500).json({ success: false, message: deleteRes.error || '删除项目失败' });
        }
        const projectsRes = await dbApi.data.getAllProjectsWithComponents();
        const nextActive = projectsRes.success ? (projectsRes.data[0] || null) : null;
        if (activeRes.success && activeRes.data && String(activeRes.data.id) === String(req.params.id)) {
            await dbApi.data.setActiveProject(nextActive ? nextActive.id : null);
        }
        res.json({
            success: true,
            data: projectsRes.success ? projectsRes.data : [],
            activeProjectId: nextActive ? nextActive.id : null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 设为当前检测项目
app.post('/api/projects/:id/active', requireRole(['admin']), async (req, res) => {
    const projectRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
    if (!projectRes.success || !projectRes.data) {
        return res.status(404).json({ success: false, message: '项目不存在' });
    }
    const activeRes = await dbApi.data.setActiveProject(req.params.id);
    if (!activeRes.success) {
        return res.status(500).json({ success: false, message: activeRes.error || '设置当前项目失败' });
    }
    res.json({ success: true, activeProjectId: req.params.id, project: projectRes.data });
});

// 获取当前激活项目
app.get('/api/active-project', async (req, res) => {
    const activeRes = await dbApi.data.getActiveProject();
    if (activeRes.success && activeRes.data && activeRes.data.id) {
        const projectRes = await dbApi.data.getProjectWithComponentsById(activeRes.data.id);
        if (projectRes.success && projectRes.data) {
            return res.json({ success: true, data: projectRes.data });
        }
    }
    const projectsRes = await dbApi.data.getAllProjectsWithComponents();
    if (!projectsRes.success) {
        return res.status(500).json({ success: false, message: projectsRes.error || '获取当前项目失败' });
    }
    res.json({ success: true, data: projectsRes.data[0] || null });
});

// 批量更新构件
app.put('/api/projects/:id/components', requireRole(['admin', 'operator']), async (req, res) => {
    try {
        const projectRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
        if (!projectRes.success || !projectRes.data) return res.status(404).json({ success: false, message: '项目不存在' });

        const { batch, components } = req.body;

        if (batch && Array.isArray(batch.ids)) {
            const ids = batch.ids.map((id) => String(id));
            for (const cid of ids) {
                const updates = {};
                if (batch.teamId !== undefined) updates.team_id = batch.teamId;
                if (batch.teamName !== undefined) updates.team_name = batch.teamName;
                if (batch.teamLeader !== undefined) updates.team_leader = batch.teamLeader;
                if (batch.selfInspector !== undefined) updates.self_inspector = batch.selfInspector;
                if (batch.qualityInspector !== undefined) updates.quality_inspector = batch.qualityInspector;
                if (batch.qualityManager !== undefined) updates.quality_manager = batch.qualityManager;
                if (batch.planDate !== undefined) updates.plan_date = batch.planDate;
                if (batch.status !== undefined) updates.status = batch.status;
                if (batch.ifcType !== undefined) updates.ifc_type = batch.ifcType;
                if (batch.componentMark !== undefined) updates.component_mark = batch.componentMark;
                if (Object.keys(updates).length) {
                    const updateRes = await dbApi.data.updateComponent(cid, updates);
                    if (!updateRes.success) {
                        return res.status(500).json({ success: false, message: updateRes.error || '批量更新构件失败' });
                    }
                }
            }
        } else if (Array.isArray(components)) {
            const existingRes = await dbApi.data.getComponentsByProject(req.params.id);
            if (!existingRes.success) {
                return res.status(500).json({ success: false, message: existingRes.error || '读取构件失败' });
            }
            const existingIds = new Set((existingRes.data || []).map((item) => String(item.id)));
            const incomingIds = new Set();
            for (const item of components) {
                const cid = String(item.id || '');
                if (!cid) continue;
                incomingIds.add(cid);
                const payload = {
                    name: item.name || '',
                    component_mark: item.componentMark || '',
                    spec: item.spec || '',
                    team_id: item.teamId || '',
                    team_name: item.teamName || '',
                    team_leader: item.teamLeader || '',
                    self_inspector: item.selfInspector || '',
                    quality_inspector: item.qualityInspector || '',
                    quality_manager: item.qualityManager || '',
                    plan_date: item.planDate || '',
                    status: item.status || '待检测',
                    ifc_element_id: item.ifcElementId || '',
                    ifc_global_id: item.ifcGlobalId || '',
                    ifc_type: item.ifcType || ''
                };
                if (existingIds.has(cid)) {
                    const updateRes = await dbApi.data.updateComponent(cid, payload);
                    if (!updateRes.success) {
                        return res.status(500).json({ success: false, message: updateRes.error || '保存构件失败' });
                    }
                } else {
                    const createRes = await dbApi.data.createComponent({
                        id: cid,
                        project_id: req.params.id,
                        ...payload
                    });
                    if (!createRes.success) {
                        return res.status(500).json({ success: false, message: createRes.error || '新增构件失败' });
                    }
                }
            }
            for (const oldId of existingIds) {
                if (!incomingIds.has(oldId)) {
                    const deleteRes = await dbApi.data.deleteComponent(oldId);
                    if (!deleteRes.success) {
                        return res.status(500).json({ success: false, message: deleteRes.error || '删除旧构件失败' });
                    }
                }
            }
        }

        const statsRes = await recalcProjectStats(req.params.id);
        if (!statsRes.success) {
            return res.status(500).json({ success: false, message: statsRes.error || '项目统计更新失败' });
        }
        const refreshedRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
        res.json({ success: true, project: refreshedRes.success ? refreshedRes.data : projectRes.data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 批量指派班组信息（更完整的版本）
app.put('/api/projects/:id/components/batch-assign', requireRole(['admin', 'operator']), async (req, res) => {
    try {
        const projectRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
        if (!projectRes.success || !projectRes.data) return res.status(404).json({ success: false, message: '项目不存在' });

        const { ids = [], teamId, teamName, teamLeader, selfInspector, qualityInspector, qualityManager, planDate, status } = req.body;
        const updates = {};
        if (teamId !== undefined) updates.team_id = teamId;
        if (teamName !== undefined) updates.team_name = teamName;
        if (teamLeader !== undefined) updates.team_leader = teamLeader;
        if (selfInspector !== undefined) updates.self_inspector = selfInspector;
        if (qualityInspector !== undefined) updates.quality_inspector = qualityInspector;
        if (qualityManager !== undefined) updates.quality_manager = qualityManager;
        if (planDate !== undefined) updates.plan_date = planDate;
        if (status !== undefined) updates.status = status;

        let updatedCount = 0;
        for (const cid of (ids || []).map((id) => String(id))) {
            const updateRes = await dbApi.data.updateComponent(cid, updates);
            if (!updateRes.success) {
                return res.status(500).json({ success: false, message: updateRes.error || '批量指派失败' });
            }
            updatedCount++;
        }

        const statsRes = await recalcProjectStats(req.params.id);
        if (!statsRes.success) {
            return res.status(500).json({ success: false, message: statsRes.error || '项目统计更新失败' });
        }
        const refreshedRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
        res.json({ success: true, updatedCount, project: refreshedRes.success ? refreshedRes.data : projectRes.data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 新增构件
app.post('/api/projects/:id/components', requireRole(['admin', 'operator']), async (req, res) => {
    try {
        const projectRes = await dbApi.data.getProjectById(req.params.id);
        if (!projectRes.success || !projectRes.data) return res.status(404).json({ success: false, message: '项目不存在' });

        const { name, spec, teamId, teamName, teamLeader, selfInspector, qualityInspector, qualityManager, planDate, ifcElementId, ifcGlobalId, ifcType, componentMark } = req.body;
        const componentId = genCompId();
        const createRes = await dbApi.data.createComponent({
            id: componentId,
            project_id: req.params.id,
            name: componentMark || name || '未命名构件',
            component_mark: componentMark || '',
            spec: spec || '',
            team_id: teamId || '',
            team_name: teamName || '',
            team_leader: teamLeader || '',
            self_inspector: selfInspector || '',
            quality_inspector: qualityInspector || '',
            quality_manager: qualityManager || '',
            plan_date: planDate || getTodayStr(),
            status: '待检测',
            ifc_element_id: ifcElementId || '',
            ifc_global_id: ifcGlobalId || '',
            ifc_type: ifcType || ''
        });
        if (!createRes.success) {
            return res.status(500).json({ success: false, message: createRes.error || '新增构件失败' });
        }
        const statsRes = await recalcProjectStats(req.params.id);
        if (!statsRes.success) {
            return res.status(500).json({ success: false, message: statsRes.error || '项目统计更新失败' });
        }
        const componentRes = await dbApi.data.getComponentById(componentId);
        const refreshedRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
        res.json({
            success: true,
            component: componentRes.success ? mapDbComponentToApi(componentRes.data) : null,
            project: refreshedRes.success ? refreshedRes.data : null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 批量新增构件
app.post('/api/projects/:id/components/batch', requireRole(['admin', 'operator']), async (req, res) => {
    try {
        const projectRes = await dbApi.data.getProjectById(req.params.id);
        if (!projectRes.success || !projectRes.data) return res.status(404).json({ success: false, message: '项目不存在' });

        const items = Array.isArray(req.body.items) ? req.body.items : [];
        const added = [];
        for (const item of items) {
            const componentId = genCompId();
            const createRes = await dbApi.data.createComponent({
                id: componentId,
                project_id: req.params.id,
                name: item.componentMark || item.name || '未命名构件',
                component_mark: item.componentMark || '',
                spec: item.spec || '',
                team_id: item.teamId || '',
                team_name: item.teamName || '',
                team_leader: item.teamLeader || '',
                self_inspector: item.selfInspector || '',
                quality_inspector: item.qualityInspector || '',
                quality_manager: item.qualityManager || '',
                plan_date: item.planDate || getTodayStr(),
                status: item.status || '待检测',
                ifc_element_id: item.ifcElementId || '',
                ifc_global_id: item.ifcGlobalId || '',
                ifc_type: item.ifcType || ''
            });
            if (!createRes.success) {
                return res.status(500).json({ success: false, message: createRes.error || '批量新增构件失败' });
            }
            const componentRes = await dbApi.data.getComponentById(componentId);
            if (componentRes.success && componentRes.data) {
                added.push(mapDbComponentToApi(componentRes.data));
            }
        }
        const statsRes = await recalcProjectStats(req.params.id);
        if (!statsRes.success) {
            return res.status(500).json({ success: false, message: statsRes.error || '项目统计更新失败' });
        }
        const refreshedRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
        res.json({
            success: true,
            added: added.length,
            components: added,
            project: refreshedRes.success ? refreshedRes.data : null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 删除构件
app.delete('/api/projects/:id/components/:cid', requireRole(['admin']), async (req, res) => {
    try {
        const projectRes = await dbApi.data.getProjectById(req.params.id);
        if (!projectRes.success || !projectRes.data) return res.status(404).json({ success: false, message: '项目不存在' });

        const deleteRes = await dbApi.data.deleteComponent(req.params.cid);
        if (!deleteRes.success) {
            return res.status(500).json({ success: false, message: deleteRes.error || '删除构件失败' });
        }
        const statsRes = await recalcProjectStats(req.params.id);
        if (!statsRes.success) {
            return res.status(500).json({ success: false, message: statsRes.error || '项目统计更新失败' });
        }
        const refreshedRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
        res.json({ success: true, project: refreshedRes.success ? refreshedRes.data : null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 更新项目基本信息
app.put('/api/projects/:id', requireRole(['admin', 'operator']), async (req, res) => {
    try {
        const projectRes = await dbApi.data.getProjectById(req.params.id);
        if (!projectRes.success || !projectRes.data) return res.status(404).json({ success: false, message: '项目不存在' });

        const { name, ifcUrl, beamColumnCount, inspectedCount, qualifiedCount } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (ifcUrl !== undefined) updates.ifc_url = ifcUrl;
        if (beamColumnCount !== undefined) updates.beam_column_count = Number(beamColumnCount) || 0;
        if (inspectedCount !== undefined) updates.inspected_count = Number(inspectedCount) || 0;
        if (qualifiedCount !== undefined) updates.qualified_count = Number(qualifiedCount) || 0;
        if (updates.inspected_count > 0 && updates.qualified_count !== undefined) {
            updates.qualified_rate = `${((updates.qualified_count / updates.inspected_count) * 100).toFixed(1)}%`;
        }
        const updateRes = await dbApi.data.updateProject(req.params.id, updates);
        if (!updateRes.success) {
            return res.status(500).json({ success: false, message: updateRes.error || '更新项目失败' });
        }
        const refreshedRes = await dbApi.data.getProjectWithComponentsById(req.params.id);
        res.json({ success: true, project: refreshedRes.success ? refreshedRes.data : null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

async function startServer() {
    try {
        if (typeof dbApi.initDatabase === 'function') {
            await dbApi.initDatabase();
        }

        const server = app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });

        server.on('error', (err) => {
            console.error('Server startup error:', err);
        });
    } catch (err) {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }
}

startServer();
