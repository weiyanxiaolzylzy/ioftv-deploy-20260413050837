const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const http = require('http');
const { fork } = require('child_process');

const app = express();
const PORT = Number(process.env.PORT) || 8890;
const PYTHON_API_PORT = Number(process.env.PYTHON_API_PORT) || 8765;

// 健康检查端点（Docker healthcheck 用）
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ioftv-api', port: PORT, timestamp: Date.now() });
});

app.use(cors());
app.use(express.json());

// 单独代理 /pyapi/health 到 Python 根路径
app.get('/pyapi/health', (req, res) => {
    const options = {
        hostname: 'localhost',
        port: PYTHON_API_PORT,
        path: '/health',
        method: 'GET',
        headers: {}
    };
    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
        res.status(502).json({ error: `Python API 不可用: ${e.message}` });
    });
    proxyReq.end();
});

// 代理 /pyapi/* 请求到 Python IFC 服务（/api/*）
app.use('/pyapi', (req, res) => {
    const targetPath = req.originalUrl.replace(/^\/pyapi/, '');
    const options = {
        hostname: 'localhost',
        port: PYTHON_API_PORT,
        path: targetPath,
        method: req.method,
        headers: {}
    };
    // 只传递必要的 headers
    if (req.headers['content-type']) options.headers['Content-Type'] = req.headers['content-type'];
    if (req.headers['accept']) options.headers['Accept'] = req.headers['accept'];

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
        res.status(502).json({ error: `Python API 不可用: ${e.message}` });
    });
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        const bodyStr = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyStr));
        proxyReq.write(bodyStr);
    }
    proxyReq.end();
});
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

// node_modules/web-ifc/ 目录已包含 web-ifc-node.wasm，无需额外 SetWasmPath

ensureDir(IFC_UPLOAD_DIR);
ensureDir(WASM_DIR);
const IFC_PARSE_JOBS = new Map();
const IFC_PARSE_JOB_TTL_MS = 6 * 60 * 60 * 1000;

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
            finishJob({ status: 'done', parse: message.result || null, error: null });
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

app.use('/uploads', express.static(UPLOAD_DIR));
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

const DATA_FILE = path.join(__dirname, 'data.json');

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

const readDataFile = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        return content ? JSON.parse(content) : {};
    } catch (e) {
        return {};
    }
};

const writeDataFile = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data || {}, null, 2));
};

// 初始化数据
if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
        star: {
            groupName: '一班组',
            passingRate: 98,
            firstPassRate: 95,
            photoUrl: '/people.jpg'
        },
        ranking: [
            { name: '第1组', value: 99.2 },
            { name: '第2组', value: 98.5 },
            { name: '第3组', value: 97.8 },
            { name: '第4组', value: 96.5 },
            { name: '第5组', value: 95.2 },
            { name: '第6组', value: 94.0 }
        ],
        workshopFirstPassRate: 97.5
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

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

// 获取所有数据
app.get('/api/all-data', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    res.json(data);
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

app.post('/api/qc-templates/:id/export', requireRole(['admin']), async (req, res) => {
    try {
        const fullPath = resolveQcTemplatePath(req.params.id);
        if (!fullPath) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        const componentNo = safeCellText(req.body && req.body.componentNo);
        const rows = Array.isArray(req.body && req.body.rows) ? req.body.rows : [];
        const meta = (req.body && req.body.meta) || {};
        const groupName = safeCellText(meta.groupName);
        const selfInspectorName = safeCellText(meta.selfInspectorName);
        const teamLeaderName = safeCellText(meta.teamLeaderName);
        const qualityInspectorName = safeCellText(meta.qualityInspectorName);

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(fullPath);
        const ws = wb.worksheets[0];
        if (!ws) return res.status(400).json({ success: false, message: 'No worksheet found' });

        const getCellText = (row, col) => {
            const cell = ws.getCell(row, col);
            if (!cell || cell.value == null) return '';
            if (typeof cell.value === 'object' && cell.value.richText) {
                return cell.value.richText.map(r => r.text || '').join('').trim();
            }
            return String(cell.value).trim();
        };

        const rowCount = ws.rowCount;
        const colCount = ws.columnCount;

        const buildRowTexts = (rowNum) => {
            const texts = [];
            for (let c = 1; c <= colCount; c++) {
                texts.push(getCellText(rowNum, c).replace(/\s+/g, ''));
            }
            return texts;
        };

        let headerRow = -1;
        for (let r = 1; r <= Math.min(rowCount, 30); r++) {
            const texts = buildRowTexts(r);
            const joined = texts.join('');
            if (joined.includes('序号') && joined.includes('项目') && joined.includes('允许偏差')) {
                headerRow = r;
                break;
            }
        }
        if (headerRow === -1) {
            return res.status(400).json({ success: false, message: 'Template header not found' });
        }

        const headerTexts = buildRowTexts(headerRow);
        const subHeaderTexts = buildRowTexts(headerRow + 1);

        const findColIdx = (texts, pred) => {
            for (let i = 0; i < texts.length; i++) {
                if (pred(texts[i])) return i + 1;
            }
            return -1;
        };

        const seqCol = findColIdx(headerTexts, t => t.includes('序号'));
        const designCol = findColIdx(headerTexts, t => t.includes('设计') && t.includes('尺寸'));
        const remarkCol = findColIdx(headerTexts, t => t.includes('备注'));
        const selfCheckCol = findColIdx(subHeaderTexts, t => t.includes('自检'));
        const groupCheckCol = findColIdx(subHeaderTexts, t => t.includes('班组') || t.includes('班组长'));

        const bySeq = new Map();
        rows.forEach(r => {
            const seq = Number(r && r.seq);
            if (!Number.isNaN(seq) && seq > 0) bySeq.set(seq, r);
        });

        const setVal = (row, col, val) => {
            if (col < 1 || row < 1) return;
            const cell = ws.getCell(row, col);
            cell.value = val == null ? '' : val;
        };

        for (let r = headerRow + 2; r <= rowCount; r++) {
            const seqText = getCellText(r, seqCol > 0 ? seqCol : 1);
            if (!/^[0-9]+$/.test(seqText)) continue;
            const seq = Number(seqText);
            const payload = bySeq.get(seq);
            if (!payload) continue;

            const designValue = payload.designValue == null || payload.designValue === '' ? '' : Number(payload.designValue);
            const measuredValue = payload.measuredValue == null || payload.measuredValue === '' ? '' : Number(payload.measuredValue);
            const deviation = payload.deviation == null || payload.deviation === '' ? '' : Number(payload.deviation);
            const verdict = safeCellText(payload.verdict);

            if (designCol > 0 && designValue !== '' && !Number.isNaN(designValue)) setVal(r, designCol, designValue);
            if (selfCheckCol > 0 && measuredValue !== '' && !Number.isNaN(measuredValue)) setVal(r, selfCheckCol, measuredValue);
            if (groupCheckCol > 0 && safeCellText(payload.groupMeasuredValue) !== '') {
                const gv = Number(payload.groupMeasuredValue);
                if (!Number.isNaN(gv)) setVal(r, groupCheckCol, gv);
            }
            if (remarkCol > 0) {
                const parts = [];
                if (deviation !== '' && !Number.isNaN(deviation)) parts.push(`偏差:${deviation > 0 ? '+' : ''}${deviation}`);
                if (verdict) parts.push(`判定:${verdict}`);
                if (componentNo) parts.push(`构件:${componentNo}`);
                if (parts.length) setVal(r, remarkCol, parts.join('  '));
            }
        }

        const applyNameToText = (text, label, name) => {
            if (!name) return text;
            const s = String(text);
            if (s.includes(`${label}：${name}`) || s.includes(`${label}:${name}`)) return s;
            const re = new RegExp(`${label}\\s*([：:])\\s*`, 'g');
            return s.replace(re, (m, colon) => `${label}${colon}${name} `);
        };

        const pickYearTail = (text) => {
            const s = String(text);
            const idx = s.indexOf('年');
            return idx === -1 ? '' : s.slice(idx).trim();
        };

        ws.eachRow((row, rowNum) => {
            row.eachCell((cell, colNum) => {
                let val = cell.value;
                if (val && typeof val === 'object' && val.richText) {
                    val = val.richText.map(r => r.text || '').join('');
                }
                if (typeof val !== 'string' || !val.trim()) return;
                let text = val;
                const compact = text.replace(/\s+/g, '');

                if (selfInspectorName && teamLeaderName) {
                    if (compact.includes('自检员：') && compact.includes('班组长：')) {
                        const tail = pickYearTail(text);
                        const suffix = tail ? `  ${tail}` : '  年    月    日';
                        cell.value = `自检员：${selfInspectorName}    班组长：${teamLeaderName}${suffix}`;
                        return;
                    }
                }

                if (qualityInspectorName) {
                    const labels = ['质量检查员', '质量检测员', '质检员'];
                    const found = labels.find(l => compact.includes(l));
                    if (found && !compact.includes(`${found}：${qualityInspectorName}`)) {
                        const tail = pickYearTail(text);
                        const suffix = tail ? `  ${tail}` : '  年    月    日';
                        cell.value = `${found}：${qualityInspectorName}${suffix}`;
                        return;
                    }
                }

                let updated = text;
                updated = applyNameToText(updated, '自检员', selfInspectorName);
                updated = applyNameToText(updated, '班组长', teamLeaderName);
                updated = applyNameToText(updated, '质检员', qualityInspectorName);
                updated = applyNameToText(updated, '质量检查员', qualityInspectorName);
                updated = applyNameToText(updated, '质量检测员', qualityInspectorName);
                if (updated !== text) { cell.value = updated; return; }

                const trimmed = text.trim();
                const nameLabels = [
                    { label: '自检员', name: selfInspectorName },
                    { label: '班组长', name: teamLeaderName },
                    { label: '质检员', name: qualityInspectorName },
                    { label: '质量检查员', name: qualityInspectorName },
                    { label: '质量检测员', name: qualityInspectorName }
                ];
                const match = nameLabels.find(x => x.name && trimmed === x.label);
                if (match) {
                    const rightCell = ws.getCell(rowNum, colNum + 1);
                    const rightEmpty = !rightCell.value || String(rightCell.value).trim() === '';
                    if (rightEmpty) {
                        rightCell.value = match.name;
                    } else {
                        cell.value = `${match.label}：${match.name}`;
                    }
                    return;
                }

                if (groupName) {
                    const groupLabels = ['加工班组', '施工班组', '班组'];
                    const gMatch = groupLabels.find(l => compact === l || compact.includes(l));
                    if (gMatch && !compact.includes('班组长')) {
                        const rightCell = ws.getCell(rowNum, colNum + 1);
                        const rightEmpty = !rightCell.value || String(rightCell.value).trim() === '';
                        if (rightEmpty) {
                            rightCell.value = groupName;
                        } else {
                            cell.value = `${gMatch}：${groupName}`;
                        }
                    }
                }
            });
        });

        const buffer = await wb.xlsx.writeBuffer();
        const baseName = componentNo ? `${componentNo}_${path.basename(fullPath)}` : path.basename(fullPath);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}`);
        return res.send(Buffer.from(buffer));
    } catch (e) {
        console.error('POST /api/qc-templates/:id/export error:', e);
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
app.get('/api/star', (req, res) => {
    try {
        const data = readDataFile();
        res.json(data.star || data);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 更新标兵信息
app.post('/api/star', requireRole(['admin', 'operator']), uploadMiddleware, (req, res) => {
    console.log('POST /api/star received');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    try {
        // 如果文件不存在，创建空数据
        if (!fs.existsSync(DATA_FILE)) {
            const initialData = {
                star: {
                    groupName: '一班组',
                    passingRate: 98,
                    firstPassRate: 95,
                    photoUrl: '/people.jpg'
                },
                ranking: [],
                workshopFirstPassRate: 97.5
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        }

        const dataContent = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = dataContent ? JSON.parse(dataContent) : {};
        
        let star = data.star || {
            groupName: '一班组',
            passingRate: 98,
            firstPassRate: 95,
            photoUrl: '/people.jpg'
        };
        
        // 确保使用正确的值更新，处理 undefined 和 null
        if (req.body.groupName && req.body.groupName !== 'undefined' && req.body.groupName !== 'null') {
            star.groupName = req.body.groupName;
        }
        
        if (req.body.passingRate && req.body.passingRate !== 'undefined' && req.body.passingRate !== 'null') {
            const rate = Number(req.body.passingRate);
            if (!isNaN(rate)) {
                star.passingRate = rate;
            }
        }

        if (req.file) {
            // 使用相对路径，让前端根据当前域名自动拼接
            star.photoUrl = `/uploads/${req.file.filename}`;
        } else if (req.body.photoUrl && req.body.photoUrl !== 'undefined' && req.body.photoUrl !== 'null') {
            star.photoUrl = req.body.photoUrl;
        }

        data.star = star;
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, data: star });
    } catch (error) {
        console.error('Error in POST /api/star:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取排名信息
app.get('/api/ranking', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    res.json({
        success: true,
        data: data.ranking,
        workshopFirstPassRate: data.workshopFirstPassRate
    });
});

app.post('/api/ranking', requireRole(['admin', 'operator']), (req, res) => {
    try {
        const data = readDataFile();
        const incoming = req.body && (req.body.ranking || req.body.data || req.body);
        const ranking = Array.isArray(incoming) ? incoming : [];
        data.ranking = ranking.map((it) => ({
            name: it && it.name != null ? String(it.name) : '',
            value: it && it.value != null ? Number(it.value) : 0
        }));
        if (req.body && req.body.workshopFirstPassRate != null) {
            const rate = Number(req.body.workshopFirstPassRate);
            if (!Number.isNaN(rate)) data.workshopFirstPassRate = rate;
        }
        writeDataFile(data);
        res.json({ success: true, data: data.ranking, workshopFirstPassRate: data.workshopFirstPassRate });
    } catch (error) {
        console.error('Error in POST /api/ranking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/today-plan', (req, res) => {
    const data = readDataFile();
    const today = getTodayStr();
    const { startDate, endDate, projectId } = req.query;
    const activeId = data.activeProjectId;
    const projects = data.projects || [];

    function inPlanDateRange(c) {
        if (startDate && endDate) {
            return c.planDate >= startDate && c.planDate <= endDate;
        }
        return c.planDate === today;
    }

    const sourceProjects = projectId
        ? projects.filter(p => p.id === projectId)
        : projects;

    const planItems = [];
    for (const project of sourceProjects) {
        const comps = (project.components || []).filter(inPlanDateRange);
        for (const c of comps) {
            planItems.push({
                project: project.name,
                projectId: project.id,
                componentId: c.id,
                componentName: c.componentMark || c.name,
                componentMark: c.componentMark || '',
                spec: c.spec,
                team: c.teamLeader,
                teamName: c.teamName || '',
                inspector: c.qualityInspector,
                manager: c.qualityManager,
                selfInspector: c.selfInspector || '',
                location: (project.province || '') + (project.city || ''),
                type: c.ifcType || (c.name || '').split(' ')[0],
                status: c.status,
                planDate: c.planDate,
                count: 1,
                ifcUrl: project.ifcUrl || '',
                ifcElementId: c.ifcElementId || '',
                ifcGlobalId: c.ifcGlobalId || '',
                teamId: c.teamId || '',
            });
        }
    }

    planItems.sort((a, b) => {
        const pa = (a.project || '').localeCompare(b.project || '', 'zh');
        if (pa !== 0) return pa;
        return (a.componentName || '').localeCompare(b.componentName || '', 'zh');
    });

    res.json({ success: true, data: planItems, activeProjectId: activeId });
});

/** 历史检测记录：来自各项目构件，计划日期早于今天，或状态为已完成/不合格 */
app.get('/api/inspection-history', (req, res) => {
    try {
        const data = readDataFile();
        const today = getTodayStr();
        const projects = data.projects || [];
        const rows = [];
        for (const project of projects) {
            for (const c of (project.components || [])) {
                const pd = (c.planDate || '').trim();
                const st = c.status || '';
                const isPastPlan = pd && pd < today;
                const isDone = st === '已完成' || st === '不合格';
                if (!isPastPlan && !isDone) continue;
                rows.push({
                    projectName: project.name || '—',
                    componentType: c.ifcType || c.type || '—',
                    componentNumber: c.componentMark || c.name || c.id || '—',
                    inspectionDate: pd || today,
                });
            }
        }
        rows.sort((a, b) => String(b.inspectionDate).localeCompare(String(a.inspectionDate)));
        res.json({ success: true, data: rows });
    } catch (e) {
        console.error('GET /api/inspection-history', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/today-plan', requireRole(['admin', 'operator']), (req, res) => {
    try {
        const data = readDataFile();
        const incoming = req.body && (req.body.todayPlan || req.body.data || req.body.list || req.body);
        data.todayPlan = Array.isArray(incoming) ? incoming : [];
        writeDataFile(data);
        res.json({ success: true, data: data.todayPlan });
    } catch (error) {
        console.error('Error in POST /api/today-plan:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取班组列表
app.get('/api/groups', (req, res) => {
    try {
        const data = readDataFile();
        res.json(data.groups || []);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 添加班组
app.post('/api/groups', requireRole(['admin', 'operator']), uploadMiddleware, (req, res) => {
    try {
        const dataContent = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = dataContent ? JSON.parse(dataContent) : {};
        
        if (!data.groups) {
            data.groups = [];
        }

        const newGroup = {
            id: Date.now().toString(),
            name: req.body.name,
            photoUrl: req.file ? `/uploads/${req.file.filename}` : '/people.jpg'
        };

        data.groups.push(newGroup);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, data: data.groups });
    } catch (error) {
        console.error('Error in POST /api/groups:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 删除班组
app.delete('/api/groups/:id', requireRole(['admin', 'operator']), (req, res) => {
    try {
        const dataContent = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = dataContent ? JSON.parse(dataContent) : {};

        if (data.groups) {
            data.groups = data.groups.filter(g => g.id !== req.params.id);
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        }

        res.json({ success: true, data: data.groups || [] });
    } catch (error) {
        console.error('Error in DELETE /api/groups:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 更新班组
app.put('/api/groups/:id', requireRole(['admin', 'operator']), uploadMiddleware, (req, res) => {
    try {
        const dataContent = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = dataContent ? JSON.parse(dataContent) : {};

        if (!data.groups) {
            data.groups = [];
        }

        const groupIndex = data.groups.findIndex(g => g.id === req.params.id);
        if (groupIndex === -1) {
            return res.status(404).json({ success: false, message: '班组不存在' });
        }

        // 更新班组信息
        if (req.body.name) {
            data.groups[groupIndex].name = req.body.name;
        }
        if (req.file) {
            data.groups[groupIndex].photoUrl = `/uploads/${req.file.filename}`;
        } else if (req.body.photoUrl) {
            data.groups[groupIndex].photoUrl = req.body.photoUrl;
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, data: data.groups[groupIndex] });
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
function genCompId() { return 'GJ-' + Date.now(); }

// 获取项目列表（带当前激活 ID）
app.get('/api/projects', (req, res) => {
    const data = readDataFile();
    res.json({ success: true, data: data.projects || [], activeProjectId: data.activeProjectId || null });
});

// 获取项目详情（含构件列表）
app.get('/api/projects/:id', (req, res) => {
    const data = readDataFile();
    const project = (data.projects || []).find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' });
    res.json({ success: true, data: project });
});

// 获取项目统计
app.get('/api/projects/:id/statistics', (req, res) => {
    const data = readDataFile();
    const project = (data.projects || []).find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' });
    const components = project.components || [];
    const stats = {
        total: components.length,
        pending: components.filter(c => c.status === '待检测').length,
        inspecting: components.filter(c => c.status === '检测中').length,
        completed: components.filter(c => c.status === '已完成').length,
        unqualified: components.filter(c => c.status === '不合格').length,
        inspected: components.filter(c => c.status === '已完成' || c.status === '检测中').length,
        qualified: components.filter(c => c.status === '已完成').length,
        rate: project.inspectedCount > 0 ? ((project.qualifiedCount / project.inspectedCount) * 100).toFixed(1) + '%' : '0.0%',
        // 按 IFC 类型统计
        byType: {},
        // 按班组统计
        byTeam: {},
        // 按计划日期统计
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

// 批量导入 IFC 构件到项目（从 IFC 解析结果批量创建）
app.post('/api/projects/:id/components/import-ifc', requireRole(['admin', 'operator']), (req, res) => {
    try {
        const data = readDataFile();
        const project = (data.projects || []).find(p => p.id === req.params.id);
        if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

        if (!project.components) project.components = [];

        const { elements = [] } = req.body;
        let added = 0;

        elements.forEach(el => {
            // 检查是否已存在相同 ifcElementId 的构件
            const exists = project.components.some(c => c.ifcElementId === String(el.expressID));
            if (!exists) {
                project.components.push({
                    id: genCompId(),
                    name: el.name || `构件-${el.expressID}`,
                    componentMark: el.componentMark || '',
                    spec: '',
                    teamId: '',
                    teamName: '',
                    teamLeader: '',
                    selfInspector: '',
                    qualityInspector: '',
                    qualityManager: '',
                    planDate: '',
                    status: '待检测',
                    ifcElementId: String(el.expressID),
                    ifcGlobalId: el.globalId || '',
                    ifcType: el.type || ''
                });
                added++;
            }
        });

        project.beamColumnCount = (project.components || []).length;
        writeDataFile(data);
        res.json({ success: true, added, total: project.components.length, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 添加项目
app.post('/api/projects', requireRole(['admin']), (req, res) => {
    try {
        const data = readDataFile();
        if (!data.projects) data.projects = [];
        const { name, province, city, center, ifcUrl, beamColumnCount } = req.body;
        if (!name) return res.status(400).json({ success: false, message: '项目名称不能为空' });

        const newProject = {
            id: genId(),
            name,
            province: province || '',
            city: city || '',
            ifcUrl: ifcUrl || '',
            beamColumnCount: Number(beamColumnCount) || 0,
            inspectedCount: 0,
            qualifiedCount: 0,
            qualifiedRate: '0.0%',
            components: []
        };

        // 如果是第一个项目，自动激活
        if (data.projects.length === 0) {
            data.activeProjectId = newProject.id;
        }

        data.projects.push(newProject);
        writeDataFile(data);
        res.json({ success: true, data: data.projects, activeProjectId: data.activeProjectId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 删除项目
app.delete('/api/projects/:id', requireRole(['admin']), (req, res) => {
    try {
        const data = readDataFile();
        if (!data.projects) data.projects = [];
        const before = data.projects.length;
            data.projects = data.projects.filter(p => p.id !== req.params.id);
        if (data.projects.length === before) return res.status(404).json({ success: false, message: '项目不存在' });

        if (data.activeProjectId === req.params.id) {
            data.activeProjectId = data.projects[0] ? data.projects[0].id : null;
        }
        writeDataFile(data);
        res.json({ success: true, data: data.projects, activeProjectId: data.activeProjectId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 设为当前检测项目
app.post('/api/projects/:id/active', requireRole(['admin']), (req, res) => {
    try {
        const data = readDataFile();
        const project = (data.projects || []).find(p => p.id === req.params.id);
        if (!project) return res.status(404).json({ success: false, message: '项目不存在' });
        data.activeProjectId = project.id;
        writeDataFile(data);
        res.json({ success: true, activeProjectId: project.id, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取当前激活项目
app.get('/api/active-project', (req, res) => {
    const data = readDataFile();
    const project = (data.projects || []).find(p => p.id === data.activeProjectId) || (data.projects || [])[0];
    res.json({ success: true, data: project || null });
});

// 批量更新构件
app.put('/api/projects/:id/components', requireRole(['admin', 'operator']), (req, res) => {
    try {
        const data = readDataFile();
        const project = (data.projects || []).find(p => p.id === req.params.id);
        if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

        const { batch, components } = req.body;

        if (batch && Array.isArray(batch.ids)) {
            batch.ids.forEach(cid => {
                const comp = (project.components || []).find(c => c.id === cid);
                if (comp) {
                    if (batch.teamId !== undefined) comp.teamId = batch.teamId;
                    if (batch.teamName !== undefined) comp.teamName = batch.teamName;
                    if (batch.teamLeader !== undefined) comp.teamLeader = batch.teamLeader;
                    if (batch.selfInspector !== undefined) comp.selfInspector = batch.selfInspector;
                    if (batch.qualityInspector !== undefined) comp.qualityInspector = batch.qualityInspector;
                    if (batch.qualityManager !== undefined) comp.qualityManager = batch.qualityManager;
                    if (batch.planDate !== undefined) comp.planDate = batch.planDate;
                    if (batch.status !== undefined) comp.status = batch.status;
                    if (batch.ifcType !== undefined) comp.ifcType = batch.ifcType;
                }
            });
        } else if (Array.isArray(components)) {
            project.components = components;
        }

        // 重新统计
        project.inspectedCount = (project.components || []).filter(c => c.status === '已完成' || c.status === '检测中').length;
        project.qualifiedCount = (project.components || []).filter(c => c.status === '已完成').length;
        if (project.inspectedCount > 0) {
            project.qualifiedRate = ((project.qualifiedCount / project.inspectedCount) * 100).toFixed(1) + '%';
        }

        writeDataFile(data);
        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 批量指派班组信息（更完整的版本）
app.put('/api/projects/:id/components/batch-assign', requireRole(['admin', 'operator']), (req, res) => {
    try {
        const data = readDataFile();
        const project = (data.projects || []).find(p => p.id === req.params.id);
        if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

        const {
            ids = [],           // 要指派的构件ID数组
            teamId,             // 班组ID
            teamName,           // 班组名称
            teamLeader,         // 班组长
            selfInspector,      // 自检员
            qualityInspector,   // 质检员
            qualityManager,      // 质量员
            planDate,           // 计划检测日期
            status              // 状态
        } = req.body;

        const idSet = new Set((ids || []).map((id) => String(id)));
        let updatedCount = 0;
        (project.components || []).forEach(comp => {
            if (idSet.has(String(comp.id))) {
                if (teamId !== undefined) comp.teamId = teamId;
                if (teamName !== undefined) comp.teamName = teamName;
                if (teamLeader !== undefined) comp.teamLeader = teamLeader;
                if (selfInspector !== undefined) comp.selfInspector = selfInspector;
                if (qualityInspector !== undefined) comp.qualityInspector = qualityInspector;
                if (qualityManager !== undefined) comp.qualityManager = qualityManager;
                if (planDate !== undefined) comp.planDate = planDate;
                if (status !== undefined) comp.status = status;
                updatedCount++;
            }
        });

        // 重新统计
        project.inspectedCount = (project.components || []).filter(c => c.status === '已完成' || c.status === '检测中').length;
        project.qualifiedCount = (project.components || []).filter(c => c.status === '已完成').length;
        if (project.inspectedCount > 0) {
            project.qualifiedRate = ((project.qualifiedCount / project.inspectedCount) * 100).toFixed(1) + '%';
        }

        writeDataFile(data);
        res.json({ success: true, updatedCount, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 新增构件
app.post('/api/projects/:id/components', requireRole(['admin', 'operator']), (req, res) => {
    try {
        const data = readDataFile();
        const project = (data.projects || []).find(p => p.id === req.params.id);
        if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

        if (!project.components) project.components = [];

        const {
            name, spec, teamId, teamName, teamLeader,
            selfInspector, qualityInspector, qualityManager,
            planDate, ifcElementId, ifcGlobalId, ifcType
        } = req.body;

        const newComp = {
            id: genCompId(),
            name: name || '未命名构件',
            spec: spec || '',
            teamId: teamId || '',
            teamName: teamName || '',
            teamLeader: teamLeader || '',
            selfInspector: selfInspector || '',
            qualityInspector: qualityInspector || '',
            qualityManager: qualityManager || '',
            planDate: planDate || getTodayStr(),
            status: '待检测',
            ifcElementId: ifcElementId || '',
            ifcGlobalId: ifcGlobalId || '',
            ifcType: ifcType || ''
        };

        project.components.push(newComp);
        project.beamColumnCount = (project.components || []).length;
        writeDataFile(data);
        res.json({ success: true, component: newComp, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 批量新增构件
app.post('/api/projects/:id/components/batch', requireRole(['admin', 'operator']), (req, res) => {
    try {
        const data = readDataFile();
        const project = (data.projects || []).find(p => p.id === req.params.id);
        if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

        if (!project.components) project.components = [];

        const items = Array.isArray(req.body.items) ? req.body.items : [];
        const added = [];

        items.forEach(item => {
            const newComp = {
                id: genCompId(),
                name: item.name || '未命名构件',
                spec: item.spec || '',
                teamId: item.teamId || '',
                teamName: item.teamName || '',
                teamLeader: item.teamLeader || '',
                selfInspector: item.selfInspector || '',
                qualityInspector: item.qualityInspector || '',
                qualityManager: item.qualityManager || '',
                planDate: item.planDate || getTodayStr(),
                status: item.status || '待检测',
                ifcElementId: item.ifcElementId || '',
                ifcGlobalId: item.ifcGlobalId || '',
                ifcType: item.ifcType || ''
            };
            project.components.push(newComp);
            added.push(newComp);
        });

        project.beamColumnCount = (project.components || []).length;
        writeDataFile(data);
        res.json({ success: true, added: added.length, components: added, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 删除构件
app.delete('/api/projects/:id/components/:cid', requireRole(['admin']), (req, res) => {
    try {
        const data = readDataFile();
        const project = (data.projects || []).find(p => p.id === req.params.id);
        if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

        project.components = (project.components || []).filter(c => c.id !== req.params.cid);
        project.beamColumnCount = (project.components || []).length;
        project.inspectedCount = (project.components || []).filter(c => c.status === '已完成' || c.status === '检测中').length;
        project.qualifiedCount = (project.components || []).filter(c => c.status === '已完成').length;
        if (project.inspectedCount > 0) {
            project.qualifiedRate = ((project.qualifiedCount / project.inspectedCount) * 100).toFixed(1) + '%';
        }
        writeDataFile(data);
        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 更新项目基本信息
app.put('/api/projects/:id', requireRole(['admin', 'operator']), (req, res) => {
    try {
        const data = readDataFile();
        const project = (data.projects || []).find(p => p.id === req.params.id);
        if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

        const { name, ifcUrl, beamColumnCount, inspectedCount, qualifiedCount } = req.body;
        if (name !== undefined) project.name = name;
        if (ifcUrl !== undefined) project.ifcUrl = ifcUrl;
        if (beamColumnCount !== undefined) project.beamColumnCount = Number(beamColumnCount);
        if (inspectedCount !== undefined) project.inspectedCount = Number(inspectedCount);
        if (qualifiedCount !== undefined) project.qualifiedCount = Number(qualifiedCount);
        if (project.inspectedCount > 0) {
            project.qualifiedRate = ((project.qualifiedCount / project.inspectedCount) * 100).toFixed(1) + '%';
        }
        writeDataFile(data);
        res.json({ success: true, project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error('Server startup error:', err);
});
