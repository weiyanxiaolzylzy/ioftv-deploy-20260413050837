import * as THREE from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';
import * as WebIFC from 'web-ifc';
import { buildAssemblyChildrenMap, resolveExpressIdsForGeometry } from './assembly-geometry.mjs';

function getWasmBaseUrl() {
    return new URL('./wasm/', window.location.href).href;
}

function setupWasmPath(ifcManager) {
    try {
        const inner = ifcManager && ifcManager.loader && ifcManager.loader.ifcManager;
        const api = inner && inner.state && inner.state.api;
        if (!api || typeof api.SetWasmPath !== 'function') {
            console.warn('[IFC] SetWasmPath not found on api');
            return;
        }

        const base = getWasmBaseUrl();
        api.SetWasmPath(base, true);

        if (api.__customWasmInitPatched || typeof api.Init !== 'function') {
            return;
        }

        const originalInit = api.Init.bind(api);
        api.Init = (customLocateFileHandler, forceSingleThread) => {
            const locateFn = customLocateFileHandler || ((path) => base + path);
            return originalInit(locateFn, forceSingleThread ?? true);
        };
        api.__customWasmInitPatched = true;
    } catch (e) {
        console.warn('[IFC] Failed to patch wasm init', e);
    }
}

// ============================================================
// 1. 初始化主查看器
// ============================================================
const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({
    container,
    backgroundColor: new THREE.Color(0xe8ecef)
});
setupWasmPath(viewer.IFC);

// ============================================================
// 2. 初始化构件 3D 视图小窗口
// ============================================================
const elementViewerWindow = document.getElementById('element-viewer-window');
const viewerWindowClose = document.getElementById('viewer-window-close');
const viewerWindowTitle = document.getElementById('viewer-window-title');

let elementViewer = null;
let elementViewerLoaded = false;

function initElementViewer() {
    // 清理旧的 viewer
    if (elementViewer) {
        elementViewer = null;
    }

    // 用新的容器替换旧的，这样最干净
    const oldContainer = document.getElementById('element-viewer-container');
    const newContainer = document.createElement('div');
    newContainer.id = 'element-viewer-container';
    oldContainer.parentNode.replaceChild(newContainer, oldContainer);

    // 创建新的 viewer
    elementViewer = new IfcViewerAPI({
        container: newContainer,
        backgroundColor: new THREE.Color(0xe8ecef)
    });
    setupWasmPath(elementViewer.IFC);
    elementViewerLoaded = true;

    setupElementViewerControls(newContainer);
}

function setupElementViewerControls(target) {
    if (!target) return;
    target.addEventListener('contextmenu', (e) => e.preventDefault());
}

/** 根据左侧 ui-panel 实际宽高，动态计算底部聚焦条左右边界 */
function positionElementViewerBand() {
    if (document.body.classList.contains('embed-element-panel')) {
        /* 大屏构件模型：仅全屏显示「构件预览」视口，不与侧栏/列表分屏（侧栏由 CSS 隐藏） */
        elementViewerWindow.style.left = '0';
        elementViewerWindow.style.right = '0';
        elementViewerWindow.style.top = '0';
        elementViewerWindow.style.bottom = '0';
        elementViewerWindow.style.height = '';
        return;
    }
    const panel = document.getElementById('ui-panel');
    if (!panel) return;
    const panelRect = panel.getBoundingClientRect();
    /* 底部条左侧 = 面板右边缘 + 24px 间距 */
    const left = panelRect.right + 24;
    /* 右侧留 24px */
    const right = 24;
    elementViewerWindow.style.left = left + 'px';
    elementViewerWindow.style.right = right + 'px';
}

/** 主视口 + 底部聚焦视窗尺寸变化后刷新 WebGL 画布 */
function refreshViewerLayout() {
    requestAnimationFrame(() => {
        try {
            /* viewer.context 是 IfcContext，resize() 是它的内部方法
               调用后会同步 renderer.adjustRendererSize() + ifcCamera.updateAspect() */
            viewer?.context?.resize?.();

            /* 小窗 viewer 同理 */
            elementViewer?.context?.resize?.();
        } catch (e) {
            console.warn('refreshViewerLayout', e);
        }
    });
}

window.addEventListener('resize', () => {
    refreshViewerLayout();
    positionElementViewerBand();
});

/**
 * 强制触发 elementViewer 的 canvas resize + 重绘，覆盖所有可能的边界情况。
 * 在 initElementViewer 之后调用多次（50 / 150 / 300 / 600ms），
 * 确保容器尺寸从 0×0 恢复后 canvas 能正确同步。
 */
function forceLayoutAndRender() {
    const evc = document.getElementById('element-viewer-container');
    if (!evc || !elementViewer) return;
    try {
        /* IfcRenderer 没有 setSize，resize() 内部会调用 adjustRendererSize() 同步 canvas */
        elementViewer.context.resize();
    } catch (e) {
        console.warn('forceLayoutAndRender', e);
    }
}

// ============================================================
// 3. UI 元素引用
// ============================================================
const input = document.getElementById('file-input');
const elementSearch = document.getElementById('element-search');
const elementsContainer = document.getElementById('elements-container');
const propsContainer = document.getElementById('properties-container');

// 弹窗元素
const detailModal = document.getElementById('detail-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

// ============================================================
// 4. 全局状态
// ============================================================
let currentModel = null;
let currentUrl = null;
let currentModelID = null;
let elementIndex = [];
let selectedExpressID = null;
let componentMarkLoadPromise = null;
let componentMarkLookup = new Map();
let assemblySummaryLoadPromise = null;
let assemblySummaryLookup = new Map();
let assemblyChildrenLookup = new Map();
let currentHighlightReason = null; // 检测原因
let multiSelectMode = false; // 多选模式开关（3D 点击多选，由父页开启）
let selectedIds = []; // 多选模式下已选中的 expressID 集合
const MULTI_SELECT_COLOR = new THREE.Color(0xff8800); // 橙色高亮
/** 构件列表复选框多选（与 3D 多选独立） */
const checkboxSelectedIds = new Set();
const disabledCheckboxIds = new Set();
/** 父页面 postMessage 待执行的构件聚焦（模型未就绪时排队） */
let pendingSelectFromParent = null;
/** 仅显示单个构件：隐藏合并后的整模 mesh，只保留提取出的构件几何（由 URL componentIsolate=1 或 postMessage 开启） */
let isolateComponentView = false;
let lightElementPanelMode = false;
let minimalMode = false;
let databaseIndexMode = false;
let currentProjectId = '';
let highlightedExpressIDs = new Set();
/** 当前是否已隐藏整模（用于 clearSelection / 加载新模时恢复） */
let isolateHideBaseModel = false;

// ============================================================
// 5b. 父页面消息通信（postMessage）
// ============================================================
function postToParent(msg) {
    if (window.parent !== window) {
        window.parent.postMessage(msg, '*');
    }
}

window.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
        case 'select-element': {
            const eid = Number(data.expressID);
            if (!Number.isFinite(eid)) break;
            const isolateOnly = data.isolateOnly === true || isolateComponentView;
            console.log('[IFC iframe] received select-element', {
                expressID: eid,
                componentMark: (data.componentMark || '').trim(),
                focus: data.focus !== false,
                isolateOnly,
                currentModelID,
                elementIndexSize: elementIndex.length
            });
            pendingSelectFromParent = {
                expressID: eid,
                componentMark: (data.componentMark || '').trim(),
                focus: data.focus !== false,
                isolateOnly
            };
            await tryApplyPendingSelectFromParent();
            break;
        }
        case 'highlight': {
            const ids = Array.isArray(data.ids) ? data.ids.map(Number) : [];
            highlightedExpressIDs = new Set(ids.filter((id) => Number.isFinite(id) && id > 0));
            console.log('[IFC iframe] received highlight', {
                ids,
                highlightedExpressIDs: Array.from(highlightedExpressIDs),
                currentModelID,
                minimalMode
            });
            applyProjectMinimalHighlighting();
            break;
        }
        case 'multi-select-mode': {
            multiSelectMode = !!data.enabled;
            if (!multiSelectMode) {
                selectedIds = [];
                restoreOriginalColorsAll();
                // 清除多选橙色高亮
                if (window._multiSelectMeshes) {
                    window._multiSelectMeshes.forEach(m => {
                        const scene = getScene();
                        if (scene) scene.remove(m);
                        m.geometry && m.geometry.dispose();
                    });
                    window._multiSelectMeshes = [];
                }
            }
            postToParent({ type: 'multi-select-mode', enabled: multiSelectMode });
            break;
        }
        case 'batch-selected': {
            // 父页面同步多选状态过来（来自 AdvancedIfcViewer 的直接调用）
            if (Array.isArray(data.ids)) {
                selectedIds = data.ids.map(Number);
                updateMultiSelectHighlight();
            }
            break;
        }
        case 'disabled-checkbox-ids': {
            disabledCheckboxIds.clear();
            const incoming = Array.isArray(data.ids) ? data.ids : [];
            incoming
                .map(Number)
                .filter((id) => Number.isFinite(id))
                .forEach((id) => disabledCheckboxIds.add(id));
            for (const id of Array.from(checkboxSelectedIds)) {
                if (disabledCheckboxIds.has(id)) {
                    checkboxSelectedIds.delete(id);
                }
            }
            renderElementsList();
            emitListCheckboxSelection();
            break;
        }
    }
});

async function tryApplyPendingSelectFromParent() {
    if (!pendingSelectFromParent || currentModelID == null) return;
    const { expressID, componentMark, focus, isolateOnly } = pendingSelectFromParent;
    let row = elementIndex.find((r) => r.expressID === expressID);
    let matchedBy = row ? 'expressID' : '';
    if (!row && componentMark) {
        const normalizedMark = String(componentMark).trim().toLowerCase();
        row = elementIndex.find((r) => String(r.componentMark || '').trim().toLowerCase() === normalizedMark);
        if (row) matchedBy = 'componentMark';
    }
    if (!row && lightElementPanelMode) {
        row = {
            expressID,
            globalId: '',
            name: `构件 ${expressID}`,
            componentMark: componentMark || '',
            type: ''
        };
        matchedBy = 'lightElementPanelFallback';
    } else if (row && componentMark && !row.componentMark) {
        row.componentMark = componentMark;
    }
    if (!row) {
        console.warn('[IFC iframe] failed to resolve select-element target', {
            expressID,
            componentMark,
            currentModelID,
            elementIndexSize: elementIndex.length,
            sampleMarks: elementIndex.slice(0, 10).map((r) => ({
                expressID: r.expressID,
                componentMark: r.componentMark || '',
                name: r.name || ''
            }))
        });
        return;
    }
    const targetExpressID = Number(row.expressID);
    if (!Number.isFinite(targetExpressID)) return;
    console.log('[IFC iframe] resolved select-element target', {
        requestedExpressID: expressID,
        requestedComponentMark: componentMark,
        targetExpressID,
        targetComponentMark: row.componentMark || '',
        matchedBy
    });
    pendingSelectFromParent = null;
    /* 构件模型区：用「小窗」逻辑只显示单构件 mesh，不用整模高亮 */
    if (document.body.classList.contains('embed-element-panel') && row) {
        await showElementInSmallViewer(row);
        return;
    }
    await selectAndShowElement(currentModelID, targetExpressID, focus, {
        silent: true,
        isolateOnly: !!isolateOnly
    });
}

function applyEmbedModeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const embed = (params.get('embed') || '').trim();
    const dataSource = (params.get('dataSource') || '').trim().toLowerCase();
    currentProjectId = (params.get('projectId') || '').trim();
    if (embed === 'minimal') {
        document.body.classList.add('embed-minimal');
        minimalMode = true;
    } else if (embed === 'dashboard') {
        document.body.classList.add('embed-dashboard');
    } else if (embed === 'element-panel') {
        /* 大屏「构件模型」专用：主视口隐藏仅用于拾取/提取，可见区域为底部同款「小窗」全屏，只显示单根构件三角网 */
        document.body.classList.add('embed-element-panel');
        lightElementPanelMode = true;
        /* 延迟等 DOM 小窗容器就绪后再挂监听 */
        setTimeout(() => {
            attachElementPanelPickListeners();
        }, 300);
    }
    databaseIndexMode = dataSource === 'db' && !!currentProjectId;
    isolateComponentView = params.get('componentIsolate') === '1';
}

async function buildDatabaseBackedElementIndex(projectId) {
    const pid = String(projectId || '').trim();
    if (!pid) return false;

    elementsContainer.innerHTML = '<p class="placeholder">正在读取项目构件索引…</p>';
    elementIndex = [];
    componentMarkLookup = new Map();
    componentMarkLoadPromise = null;
    assemblySummaryLookup = new Map();
    assemblySummaryLoadPromise = null;
    assemblyChildrenLookup = new Map();

    try {
        const response = await fetch(`/api/projects/${encodeURIComponent(pid)}/components/marks`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload || !payload.success || !Array.isArray(payload.data)) {
            throw new Error((payload && payload.message) || '读取项目构件索引失败');
        }

        const rows = payload.data
            .map((item) => {
                const expressID = Number(item && item.expressID);
                if (!Number.isFinite(expressID) || expressID <= 0) return null;
                const componentMark = item && item.componentMark ? String(item.componentMark).trim() : '';
                const name = item && item.name ? String(item.name).trim() : '';
                const row = {
                    expressID,
                    globalId: '',
                    name: componentMark || name || `构件 ${expressID}`,
                    type: item && item.ifcType ? String(item.ifcType).trim() : '',
                    componentMark,
                    childExpressIDs: Array.isArray(item && item.childExpressIDs)
                        ? item.childExpressIDs.map((id) => Number(id)).filter((id) => Number.isFinite(id))
                        : [],
                    parentAssemblyExpressID: item && item.parentAssemblyExpressID != null
                        ? Number(item.parentAssemblyExpressID)
                        : null
                };

                if (componentMark) {
                    componentMarkLookup.set(String(expressID), componentMark);
                }

                const summary = {
                    componentMark,
                    positionCode: item && item.positionCode ? String(item.positionCode).trim() : '',
                    bottomElevation: item && item.bottomElevation ? String(item.bottomElevation).trim() : '',
                    topElevation: item && item.topElevation ? String(item.topElevation).trim() : '',
                    length: item && item.length != null ? Number(item.length) : null,
                    width: item && item.width != null ? Number(item.width) : null,
                    area: item && item.area != null ? Number(item.area) : null,
                    castUnitWeight: item && item.castUnitWeight != null ? Number(item.castUnitWeight) : null,
                    weightNet: item && item.weightNet != null ? Number(item.weightNet) : null,
                    weightGross: item && item.weightGross != null ? Number(item.weightGross) : null,
                    material: item && item.material ? String(item.material).trim() : '',
                    mainSpec: item && item.spec ? String(item.spec).trim() : '',
                    mainReference: item && item.mainReference ? String(item.mainReference).trim() : ''
                };
                assemblySummaryLookup.set(String(expressID), summary);
                return row;
            })
            .filter(Boolean);

        rows.sort((a, b) => {
            const aLabel = getElementLabel(a);
            const bLabel = getElementLabel(b);
            return aLabel.localeCompare(bLabel, 'zh-Hans-CN');
        });

        elementIndex = rows;
        assemblyChildrenLookup = buildAssemblyChildrenMap(rows);
        renderElementsList();
        return true;
    } catch (e) {
        console.error('[DBIndex] 读取项目构件索引失败:', e);
        elementsContainer.innerHTML = '<p class="placeholder">项目构件索引加载失败</p>';
        return false;
    }
}

function setIfcBaseModelsVisible(visible) {
    const models = viewer && viewer.context && viewer.context.items && viewer.context.items.ifcModels;
    if (!models || !models.length) return;
    models.forEach((m) => {
        if (m) m.visible = visible;
    });
}

function restoreIfcBaseModelsIfIsolated() {
    if (isolateHideBaseModel) {
        setIfcBaseModelsVisible(true);
        isolateHideBaseModel = false;
    }
}

// ============================================================
// 6. 构件选中/非选中颜色控制
// ============================================================
const GRAY_COLOR = new THREE.Color(0x888888);
const GREEN_COLOR = new THREE.Color(0x00cc55);

// 存储原始颜色：expressID → color 克隆
const originalColors = new Map();

// 获取实际的 THREE.Scene（viewer.context.scene 是 IfcScene 包装）
function getScene() {
    return viewer.context.scene.scene;
}

// 为场景中的 IFC mesh 关联 expressID（基于几何体 userData 或 attributes）
function tagMeshesWithExpressIDs() {
    const scene = getScene();
    if (!scene) return;
    let tagged = 0;

    scene.traverse((obj) => {
        if (!obj.isMesh) return;
        if (obj.userData.expressID !== undefined) return;

        const geo = obj.geometry;
        if (!geo) return;

        // web-ifc-viewer 可能将 expressID 存在几何体属性里
        if (geo.userData && geo.userData.expressID !== undefined) {
            obj.userData.expressID = geo.userData.expressID;
            tagged++;
            return;
        }

        // 只使用 expressID，不用 expressIDAsTreeNode（那是树形结构的父级ID）
        if (geo.attributes) {
            const attr = geo.attributes.expressID;
            if (attr && attr.count > 0) {
                obj.userData.expressID = attr.getX(0);
                obj.userData.expressIDAttr = attr;
                tagged++;
            }
        }
    });
    console.log(`已标记 ${tagged} 个 mesh 的 expressID`);
}

function resetAllToGray() {
    const scene = getScene();
    if (!scene) return;
    scene.traverse((obj) => {
        if (obj.isMesh) setMeshColor(obj, GRAY_COLOR);
    });
}

function colorExpressIDs(expressIDs, color) {
    if (!(expressIDs instanceof Set) || expressIDs.size === 0) return;
    const scene = getScene();
    if (!scene) return;
    scene.traverse((obj) => {
        if (!obj.isMesh) return;
        const ids = getExpressIDsFromMesh(obj);
        if (ids.size === 0) return;
        for (const id of ids) {
            if (expressIDs.has(Number(id))) {
                setMeshColor(obj, color);
                break;
            }
        }
    });
}

function applyProjectMinimalHighlighting() {
    console.log('[IFC iframe] applyProjectMinimalHighlighting', {
        minimalMode,
        currentModelID,
        highlightedExpressIDs: Array.from(highlightedExpressIDs),
        selectedExpressID
    });
    if (!minimalMode || currentModelID == null) return;
    restoreIfcBaseModelsIfIsolated();
    removeGreenOverlay();
    clearMultiSelectMeshes();
    resetAllToGray();
    if (highlightedExpressIDs.size > 0) {
        for (const expressID of highlightedExpressIDs) {
            highlightSelectedInGreen(Number(expressID));
        }
    } else if (Number.isFinite(Number(selectedExpressID)) && Number(selectedExpressID) > 0) {
        highlightSelectedInGreen(Number(selectedExpressID));
    }
}

function getExpressIDsFromMesh(obj) {
    const ids = new Set();
    if (obj.userData.expressID !== undefined) {
        ids.add(obj.userData.expressID);
    }
    const geo = obj.geometry;
    if (geo) {
        if (geo.userData && geo.userData.expressID !== undefined) {
            ids.add(geo.userData.expressID);
        }
        // 只使用 expressID，不用 expressIDAsTreeNode
        if (geo.attributes) {
            const attr = geo.attributes.expressID;
            if (attr && attr.count > 0) {
                for (let i = 0; i < attr.count; i++) {
                    ids.add(attr.getX(i));
                }
            }
        }
    }
    return ids;
}

function highlightSelectedInGreen(expressID) {
    const scene = getScene();
    if (!scene) return;
    let matchedCount = 0;

    scene.traverse((obj) => {
        if (!obj.isMesh) return;
        const ids = getExpressIDsFromMesh(obj);
        if (ids.size === 0) return;

        // 只改变选中构件的颜色，其他不动
        if (ids.has(expressID)) {
            setMeshColor(obj, GREEN_COLOR);
            matchedCount++;
        }
    });

    console.log(`高亮 expressID ${expressID}，匹配到 ${matchedCount} 个 mesh`);
}

function restoreOriginalColorsAll() {
    const scene = getScene();
    if (!scene) return;
    scene.traverse((obj) => {
        if (!obj.isMesh) return;
        const ids = getExpressIDsFromMesh(obj);
        if (ids.size === 0) return;
        const mat = obj.material;
        if (!mat) return;

        ids.forEach(id => {
            const saved = originalColors.get(id);
            if (saved && saved.color) {
                if (Array.isArray(mat)) mat.forEach(m => m.color.copy(saved.color));
                else mat.color.copy(saved.color);
            }
        });
    });
}

function saveMeshOriginalColor(mesh) {
    if (!mesh.material) return;
    const ids = getExpressIDsFromMesh(mesh);
    if (ids.size === 0) return;
    const mat = mesh.material;
    const color = Array.isArray(mat) ? mat[0]?.color?.clone() : mat.color?.clone();

    ids.forEach(id => {
        if (!originalColors.has(id)) {
            originalColors.set(id, { color });
        }
    });
}

function setMeshColor(mesh, color) {
    if (!mesh.material) return;
    const mat = mesh.material;
    if (Array.isArray(mat)) {
        mat.forEach(m => m.color.copy(color));
    } else {
        mat.color.copy(color);
    }
}

function clearColorCache() {
    originalColors.clear();
}

function saveAllOriginalColors() {
    const scene = getScene();
    if (!scene) return;
    let savedCount = 0;

    scene.traverse((obj) => {
        if (!obj.isMesh) return;
        const ids = getExpressIDsFromMesh(obj);
        if (ids.size === 0) return;

        const mat = obj.material;
        if (!mat) return;
        const color = Array.isArray(mat) ? mat[0]?.color?.clone() : mat.color?.clone();

        ids.forEach(id => {
            if (!originalColors.has(id)) {
                originalColors.set(id, { color });
                savedCount++;
            }
        });
    });

    console.log(`已保存 ${savedCount} 个原始颜色`);
}

// ============================================================
// 7. 构件详情弹窗
// ============================================================
function showDetailModal(row, reason) {
    modalTitle.textContent = `构件详情 - ${row.componentMark || row.name || '未命名'}`;

    let html = '';

    // 如果有检测原因，显示警告框
    if (reason) {
        html += `
            <div class="alert-box">
                <div class="reason">检测原因: ${reason}</div>
            </div>
        `;
    }

    html += `
        <div class="detail-row">
            <span class="detail-label">GlobalId:</span>
            <span class="detail-value">${row.globalId}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">expressID:</span>
            <span class="detail-value">${row.expressID}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">构件编号:</span>
            <span class="detail-value">${row.componentMark || row.name || '无'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">说明:</span>
            <span class="detail-value">下方为该构件的主链信息与原始属性</span>
        </div>
    `;

    // 显示该构件的属性
    const props = propsContainer.innerHTML;
    html += `<hr><h4>构件属性</h4>${props}`;

    modalBody.innerHTML = html;
    detailModal.classList.add('show');
}

function closeDetailModal() {
    detailModal.classList.remove('show');
    currentHighlightReason = null;
}

modalClose.addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
});

// ============================================================
// 7. 构件 3D 视图小窗口 (聚焦模式 - 简单可靠版)
// ============================================================

async function showElementInSmallViewer(row) {
    console.log('=== showElementInSmallViewer 被调用 ===');
    console.log('row:', row);
    console.log('currentModelID:', currentModelID);

    if (currentModelID == null) {
        console.warn('没有加载模型');
        return;
    }

    // 显示底部全宽聚焦带
    viewerWindowTitle.textContent = getElementLabel(row);
    /* element-panel 模式下主视口已隐藏，勿再压缩布局 */
    if (!document.body.classList.contains('embed-element-panel')) {
        document.body.classList.add('element-viewer-open');
    }
    elementViewerWindow.classList.add('show');

    // 提取并显示该构件（lazy init elementViewer）
    await extractElementToSmallViewer(row.expressID);

    positionElementViewerBand();
    refreshViewerLayout();
    /* 多档延迟触发 resize，防止 canvas 容器尺寸 0×0 导致渲染到空画布 */
    setTimeout(forceLayoutAndRender, 50);
    setTimeout(forceLayoutAndRender, 150);
    setTimeout(forceLayoutAndRender, 300);
    setTimeout(forceLayoutAndRender, 600);
    setTimeout(() => { refreshViewerLayout(); positionElementViewerBand(); }, 150);
    setTimeout(() => { refreshViewerLayout(); positionElementViewerBand(); }, 400);
}

async function extractElementToSmallViewer(expressID) {
    console.log('extractElementToSmallViewer 被调用, expressID:', expressID);
    try {
        /* 若小窗 viewer 未初始化，先初始化（lazy init） */
        if (!elementViewer) {
            initElementViewer();
            /* embed-element-panel：等 DOM 小窗 canvas 就绪后重新挂监听（initElementViewer 是同步 DOM 替换） */
            if (document.body.classList.contains('embed-element-panel')) {
                setTimeout(() => attachElementPanelPickListeners(), 80);
            }
            /* 等待 canvas 就绪，再执行提取 */
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        clearElementViewer();

        /* 优先：从合并几何体按 expressID 抠三角面（与绿色高亮同源），避免 selection 拿到整栋楼 mesh */
        const subsetMesh = buildGreenMesh(currentModelID, expressID);
        if (subsetMesh && elementViewer && elementViewer.context && elementViewer.context.scene) {
            subsetMesh.material = new THREE.MeshBasicMaterial({
                color: 0x52b36a,
                side: THREE.DoubleSide,
                depthTest: true,
                depthWrite: true
            });
            elementViewer.context.scene.add(subsetMesh);
            fitMeshInElementViewer(subsetMesh);
            console.log('已用 buildGreenMesh 提取单构件到小窗');
            return;
        }

        /* 回退：旧逻辑（部分模型 expressID 属性异常时） */
        await viewer.IFC.selector.pickIfcItemsByID(currentModelID, [expressID], false, true);
        await new Promise(resolve => setTimeout(resolve, 100));
        const selection = viewer.IFC.selector?.selection;
        if (selection?.meshes && selection.meshes.size > 0) {
            for (const mesh of selection.meshes) {
                if (mesh && mesh.geometry) {
                    cloneMeshToViewer(mesh);
                    return;
                }
            }
        }
        console.warn('无法获取构件网格');
    } catch (e) {
        console.error('提取构件失败:', e);
    }
}

/**
 * 将小窗场景中的 mesh 对准相机（缩放至合适视野）。
 * 优先使用 web-ifc-viewer 的 ifcCamera.targetItem；失败则用包围盒 + 斜视距离。
 */
function frameMeshInElementViewer(mesh) {
    if (!mesh || !elementViewer || !elementViewer.context) return;
    mesh.updateMatrixWorld(true);
    const ctx = elementViewer.context;
    const ifcCam = ctx.ifcCamera;

    try {
        if (ifcCam && typeof ifcCam.targetItem === 'function') {
            ifcCam.targetItem(mesh);
            ctx.resize?.();
            return;
        }
    } catch (e) {
        console.warn('targetItem 失败，使用包围盒对准', e);
    }

    try {
        elementViewer.context.items.highlightedItems = [mesh];
        elementViewer.IFC.selector?.fitToSelection?.();
        elementViewer.context.items.highlightedItems = [];
        ctx.resize?.();
        return;
    } catch (e) {
        console.warn('fitToSelection 失败，改用手动包围盒', e);
    }

    const camera = ifcCam?.perspectiveCamera;
    if (!camera) return;
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    const padding = 1.42;
    const fov = camera.fov * (Math.PI / 180);
    let distance = (maxDim / 2) / Math.tan(fov / 2) * padding;
    distance = Math.max(distance, maxDim * 0.85);
    const offset = new THREE.Vector3(1, 0.68, 1).normalize().multiplyScalar(distance);
    camera.position.copy(center).add(offset);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    try {
        if (ifcCam.controls && typeof ifcCam.controls.setLookAt === 'function') {
            ifcCam.controls.setLookAt(
                camera.position.x, camera.position.y, camera.position.z,
                center.x, center.y, center.z,
                false
            );
        } else if (ifcCam.controls && typeof ifcCam.controls.update === 'function') {
            ifcCam.controls.update();
        }
    } catch (e) { /* ignore */ }
    ctx.resize?.();
}

/** 在布局稳定后多次尝试对准，避免 iframe / canvas 尚未撑满时包围盒视角过小 */
function fitMeshInElementViewer(mesh) {
    const delays = [0, 80, 200, 450, 800];
    delays.forEach((ms) => {
        setTimeout(() => {
            frameMeshInElementViewer(mesh);
            refreshViewerLayout();
        }, ms);
    });
}

function cloneMeshToViewer(sourceMesh) {
    if (!sourceMesh || !sourceMesh.geometry) return;

    try {
        // 克隆几何体和材质
        const geometry = sourceMesh.geometry.clone();
        const material = sourceMesh.material.clone();

        // 创建新网格，并完整复制变换属性（position / rotation / scale）
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(sourceMesh.position);
        mesh.rotation.copy(sourceMesh.rotation);
        mesh.quaternion.copy(sourceMesh.quaternion);
        mesh.scale.copy(sourceMesh.scale);
        mesh.updateMatrixWorld(true);

        // 添加到场景
        if (elementViewer.context.scene) {
            elementViewer.context.scene.add(mesh);
        }

        fitMeshInElementViewer(mesh);

        console.log('成功克隆网格到小窗口');
    } catch (e) {
        console.error('克隆网格失败:', e);
    }
}

function clearElementViewer() {
    if (!elementViewer || !elementViewer.context) return;

    try {
        const scene = elementViewer.context.scene;
        if (scene && scene.children) {
            // 移除所有子对象（除了相机）
            const toRemove = [...scene.children].filter(child =>
                child.type !== 'PerspectiveCamera' && child.type !== 'OrthographicCamera' && child.type !== 'AmbientLight' && child.type !== 'DirectionalLight'
            );

            toRemove.forEach(obj => {
                scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });

            console.log('清理了小窗口中的', toRemove.length, '个对象');
        }
    } catch (e) {
        console.error('清理小窗口失败:', e);
    }
}

// 关闭小窗口时清理
function closeSmallViewer() {
    elementViewerWindow.classList.remove('show');
    document.body.classList.remove('element-viewer-open');
    clearElementViewer();
    refreshViewerLayout();
    setTimeout(refreshViewerLayout, 100);
}

viewerWindowClose.addEventListener('click', closeSmallViewer);

/* 备用：若用户直接双击隐藏的主容器（2×2），走主拾取 */
container.addEventListener('dblclick', async () => {
    if (multiSelectMode || document.body.classList.contains('embed-element-panel')) return;
    const result = await viewer.IFC.selector.pickIfcItem(true);
    if (!result) { clearSelection(); return; }
    const { modelID, id } = result;
    await selectAndShowElement(modelID, id, false);
    const row = elementIndex.find(r => r.expressID === id);
    if (row) await showElementInSmallViewer(row);
});

/* ============================================================
   embed-element-panel（小窗全屏）专用：在可见的小窗画布上拾取
   ============================================================ */
function attachElementPanelPickListeners() {
    const evc = document.getElementById('element-viewer-container');
    if (!evc) return;

    evc.addEventListener('dblclick', async () => {
        if (multiSelectMode) return;
        if (!elementViewer || !currentModelID) return;
        const result = await viewer.IFC.selector.pickIfcItem(true);
        if (!result) { clearSelection(); return; }
        const { modelID, id } = result;
        const row = elementIndex.find(r => r.expressID === id);
        if (row) {
            clearElementViewer();
            await extractElementToSmallViewer(id);
        }
    });

    evc.addEventListener('click', async (e) => {
        if (multiSelectMode) return;
        const result = await viewer.IFC.selector.pickIfcItem(false);
        if (!result) { clearSelection(); return; }
        const { modelID, id } = result;
        await selectAndShowElement(modelID, id, true, { isolateOnly: true });
        /* 单击时仅高亮+对焦；双击时出小窗（见上 dblclick） */
    });

    evc.addEventListener('mousedown', (e) => { lastClickTarget = e.target; });
    evc.addEventListener('mouseup', (e) => {
        if (e.target !== lastClickTarget) return;
    });
}

// ============================================================
// 8. 文件上传处理
// ============================================================
elementSearch.addEventListener('input', () => {
    renderElementsList();
});

input.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const prevModelID = currentModelID;
    if (prevModelID != null) removeGreenOverlay();
    restoreIfcBaseModelsIfIsolated();
    if (currentModel) {
        viewer.context.scene.remove(currentModel);
        currentModel = null;
    }
    viewer.IFC.selector.unpickIfcItems();
    selectedExpressID = null;
    greenOverlayMesh = null;
    propsContainer.innerHTML = '<p class="placeholder">加载中…</p>';
    elementsContainer.innerHTML = '<p class="placeholder">加载中…</p>';
    elementSearch.value = '';
    elementIndex = [];
    checkboxSelectedIds.clear();
    emitListCheckboxSelection();

    if (currentUrl) URL.revokeObjectURL(currentUrl);
    const url = URL.createObjectURL(file);
    currentUrl = url;
    console.log("正在加载 IFC 模型...");

    currentModel = await viewer.IFC.loadIfcUrl(url);
    currentModelID = currentModel?.modelID ?? null;
    console.log("加载完成！");

    // 确保小窗口也能加载模型
    if (elementViewer) {
        elementViewer.IFC.selector.unpickIfcItems();
    }

    propsContainer.innerHTML = '<p class="placeholder">双击构件以查看属性</p>';
    await buildElementIndex();

    await tryApplyPendingSelectFromParent();

    postToParent({
        type: 'model-loaded',
        modelID: currentModelID,
        elementCount: elementIndex.length
    });

    // 标记 mesh 与 expressID 的关联（延迟确保模型完全渲染）
    setTimeout(() => {
        grayOutModel(currentModelID);
        applyProjectMinimalHighlighting();
    }, 500);
});

// ============================================================
// 9. 双击事件处理（单选模式下聚焦构件，双击打开小窗口详情）
// ============================================================
container.addEventListener('dblclick', async () => {
    if (multiSelectMode) return; // 多选模式下忽略双击
    const result = await viewer.IFC.selector.pickIfcItem(true);

    if (!result) {
        clearSelection();
        return;
    }

    const { modelID, id } = result;
    const expressID = id;

    await selectAndShowElement(modelID, expressID, false, { isolateOnly: isolateComponentView });

    // 从 elementIndex 找到对应的构件信息，打开小窗口
    const row = elementIndex.find(r => r.expressID === expressID);
    if (row && !document.body.classList.contains('embed-minimal')) {
        await showElementInSmallViewer(row);
    }
});

// 单击空白处取消选中（仅在有选中时生效，单选模式）
let lastClickTarget = null;
container.addEventListener('mousedown', (e) => {
    lastClickTarget = e.target;
});

container.addEventListener('mouseup', async (e) => {
    if (e.button !== 0) return;
    if (e.target !== lastClickTarget) return;

    if (!multiSelectMode) {
        /* embed-element-panel（构件模型区）：双击才出小窗，等效于 normal 模式双击 */
        if (document.body.classList.contains('embed-element-panel')) {
            // 单击 → 选中（绿色高亮 + gray out），但不出小窗
            const result = await viewer.IFC.selector.pickIfcItem(false);
            if (!result) { clearSelection(); return; }
            const { modelID, id: expressID } = result;
            await selectAndShowElement(modelID, expressID, true, { isolateOnly: isolateComponentView });
            return;
        }
        // 大屏 embed=minimal：无构件列表，单击 3D 即可选中并通知父页面
        if (document.body.classList.contains('embed-minimal')) {
            const result = await viewer.IFC.selector.pickIfcItem(false);
            if (!result) {
                clearSelection();
                return;
            }
            const { modelID, id: expressID } = result;
            await selectAndShowElement(modelID, expressID, true, { isolateOnly: isolateComponentView });
            return;
        }
        // 单选模式：原有行为（有侧栏列表时）
        if (!selectedExpressID) {
            clearSelection();
            return;
        }
        const result = await viewer.IFC.selector.pickIfcItem(true);
        if (!result) {
            clearSelection();
        }
        return;
    }

    // 多选模式：点击构件追加/取消
    const result = await viewer.IFC.selector.pickIfcItem(true);
    if (!result) {
        // 点击空白区域，清除所有选中
        selectedIds = [];
        restoreOriginalColorsAll();
        clearMultiSelectMeshes();
        postToParent({ type: 'batch-selected', ids: [] });
        return;
    }

    const { modelID, id: expressID } = result;
    const row = elementIndex.find(r => r.expressID === expressID);

    const idx = selectedIds.indexOf(expressID);
    if (idx >= 0) {
        selectedIds.splice(idx, 1);
    } else {
        selectedIds.push(expressID);
    }

    // 更新橙色高亮
    updateMultiSelectHighlight();
    // 通知父页面
    postToParent({ type: 'batch-selected', ids: [...selectedIds] });
});

// ============================================================
// 10. 构件列表相关函f (优化版 - 快速类型过滤)
// ============================================================

// 定义哪些 IFC 类型是有几何的可见构件
const GEOMETRIC_TYPES = new Set([
    // 结构构件
    'IFCCOLUMN', 'IFCBEAM', 'IFCPLATE', 'IFCMEMBER',
    // 建筑构件
    'IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCSLAB', 'IFCRAILING',
    // 门窗
    'IFCDOOR', 'IFCWINDOW', 'IFCCURTAINWALL',
    // 楼梯扶手等
    'IFCSTAIR', 'IFCSTAIRFLIGHT', 'IFCRAMP', 'IFCBUILDINGELEMENTPROXY',
    // 家具设备
    'IFCFURNISHINGELEMENT', 'IFCFURNITURE', 'IFCELECTRICALELEMENT',
    //  MEP 构件
    'IFCPIPEFITTING', 'IFCPIPESEGMENT', 'IFCDUCTFITTING', 'IFCDUCTSEGMENT',
    'IFCCABLECARRIERFITTING', 'IFCCABLECARRIERSEGMENT',
    'IFCELECTRICDISTRIBUTIONPOINT', 'IFCJUNCTIONBOX',
    // 其他
    'IFCELEMENT', 'IFCBUILDINGELEMENT'
]);

function isGeometricType(typeName) {
    if (!typeName) return false;
    return GEOMETRIC_TYPES.has(typeName.toUpperCase());
}

async function buildElementIndex() {
    const modelID = currentModelID;
    if (modelID == null) return;

    elementsContainer.innerHTML = '<p class="placeholder">正在生成列表…</p>';
    elementIndex = [];
    componentMarkLookup = new Map();
    componentMarkLoadPromise = null;
    assemblyChildrenLookup = new Map();

    const ifcAPI = viewer.IFC?.loader?.ifcManager?.ifcAPI;
    if (!ifcAPI) {
        elementsContainer.innerHTML = '<p class="placeholder">构件列表生成失败</p>';
        return;
    }

    // 先获取所有产品类型
    let allProducts = null;
    try {
        allProducts = await ifcAPI.GetAllLines(modelID);
    } catch (e) {
        console.error('获取构件列表失败。', e);
        elementsContainer.innerHTML = '<p class="placeholder">构件列表生成失败</p>';
        return;
    }

    const total = allProducts.size();
    const ids = [];
    for (let i = 0; i < total; i++) ids.push(allProducts.get(i));

    elementsContainer.innerHTML = `<p class="placeholder">正在扫描类型… 0/${ids.length}</p>`;

    // 第一遍：快速过滤，只保留可能有几何的类型
    const candidates = [];
    const concurrency = 100;
    for (let i = 0; i < ids.length; i += concurrency) {
        const batch = ids.slice(i, i + concurrency);
        await Promise.all(batch.map(async (expressID) => {
            try {
                const line = await ifcAPI.GetLine(modelID, expressID, false);
                if (!line || typeof line !== 'object') return;
                const typeCode = line.type;
                if (typeof typeCode === 'number') {
                    const typeName = ifcAPI.GetNameFromTypeCode(typeCode);
                    if (isGeometricType(typeName)) {
                        const globalId = unwrapIfcString(line.GlobalId);
                        if (globalId) {
                            candidates.push({ expressID, globalId });
                        }
                    }
                }
            } catch {}
        }));

        if (i % 1000 === 0) {
            elementsContainer.innerHTML = `<p class="placeholder">正在扫描类型… ${i}/${ids.length}</p>`;
        }
    }

    elementsContainer.innerHTML = `<p class="placeholder">正在加载详情… 0/${candidates.length}</p>`;

    // 第二遍：优先读取实体自身的 Tag 作为构件编号，避免依赖后续属性集懒加载。
    const rows = [];
    for (let i = 0; i < candidates.length; i += concurrency) {
        const batch = candidates.slice(i, i + concurrency);
        const batchRows = await Promise.all(batch.map(async ({ expressID, globalId }) => {
            try {
                const line = await ifcAPI.GetLine(modelID, expressID, false);
                if (!line || typeof line !== 'object') return null;
                if (!('ObjectPlacement' in line)) return null;
                const representation = unwrapIfcValue(line.Representation);
                if (representation == null) return null;
                const name = unwrapIfcString(line.Name);
                const tag = unwrapIfcString(line.Tag);
                const typeCode = line.type;
                const type = typeof typeCode === 'number' ? (ifcAPI.GetNameFromTypeCode(typeCode) || '') : '';
                const componentMark = type === 'IFCELEMENTASSEMBLY' ? (tag || '') : '';
                return {
                    expressID,
                    globalId,
                    name,
                    type,
                    componentMark,
                    parentAssemblyExpressID: null
                };
            } catch {
                return null;
            }
        }));

        for (const r of batchRows) {
            if (r) rows.push(r);
        }

        elementsContainer.innerHTML = `<p class="placeholder">正在加载详情… ${Math.min(i + concurrency, candidates.length)}/${candidates.length}</p>`;
        await new Promise(r => setTimeout(r, 0));
    }

    rows.sort((a, b) => a.globalId.localeCompare(b.globalId));
    elementIndex = rows;
    assemblyChildrenLookup = buildAssemblyChildrenMap(rows);
    renderElementsList();

    // 后台补充属性集里的编号映射，作为 Tag 为空时的兜底。
    for (const row of elementIndex) {
        if (row.componentMark && String(row.componentMark).trim()) {
            componentMarkLookup.set(String(row.expressID), String(row.componentMark).trim());
        }
    }
    componentMarkLoadPromise = lazyLoadComponentMarks(modelID);
    assemblySummaryLoadPromise = lazyLoadAssemblySummaries(modelID);
}

async function lazyLoadComponentMarks(modelID) {
    const ifcManager = viewer.IFC?.loader?.ifcManager;
    const ifcAPI = viewer.IFC?.loader?.ifcManager?.ifcAPI;
    if (!ifcManager || !ifcAPI || !elementIndex.length) return;

    console.log('[ComponentMark] 开始提取构件编号, 共', elementIndex.length, '个构件');

    const elementIdSet = new Set(elementIndex.map(r => r.expressID));
    const markMap = new Map();

    try {
        const relAggLines = ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCRELAGGREGATES);
        const relDefLines = ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES);
        const relAggIds = [];
        const relDefIds = [];

        if (relAggLines) {
            const size = typeof relAggLines.size === 'function' ? relAggLines.size() : (relAggLines.length || 0);
            for (let i = 0; i < size; i++) {
                const id = typeof relAggLines.get === 'function' ? relAggLines.get(i) : relAggLines[i];
                if (typeof id === 'number') relAggIds.push(id);
            }
        }
        if (relDefLines) {
            const size = typeof relDefLines.size === 'function' ? relDefLines.size() : (relDefLines.length || 0);
            for (let i = 0; i < size; i++) {
                const id = typeof relDefLines.get === 'function' ? relDefLines.get(i) : relDefLines[i];
                if (typeof id === 'number') relDefIds.push(id);
            }
        }

        console.log('[ComponentMark] IFCRELAGGREGATES:', relAggIds.length, ' IFCRELDEFINESBYPROPERTIES:', relDefIds.length);

        const assemblyChildren = new Map();
        for (const relId of relAggIds) {
            try {
                const rel = await ifcAPI.GetLine(modelID, relId, false);
                if (!rel) continue;
                const parentRef = rel.RelatingObject;
                const parentId = parentRef?.value ?? parentRef;
                if (typeof parentId !== 'number') continue;
                const parentLine = await ifcAPI.GetLine(modelID, parentId, false);
                if (!parentLine) continue;
                if (parentLine.type !== WebIFC.IFCELEMENTASSEMBLY) continue;
                const children = rel.RelatedObjects;
                if (!Array.isArray(children)) continue;
                const childIds = children.map(c => c?.value ?? c).filter(c => typeof c === 'number');
                if (childIds.length) assemblyChildren.set(parentId, childIds);
            } catch {}
        }
        console.log('[ComponentMark] 找到', assemblyChildren.size, '个 IFCELEMENTASSEMBLY');
        assemblyChildrenLookup = assemblyChildren;

        const assemblyTagMap = new Map();
        for (const [assemblyId, childIds] of assemblyChildren) {
            try {
                const assemblyLine = await ifcAPI.GetLine(modelID, assemblyId, false);
                const assemblyTag = unwrapIfcString(assemblyLine && assemblyLine.Tag);
                if (!assemblyTag) continue;
                assemblyTagMap.set(assemblyId, assemblyTag);
                for (const cid of childIds) {
                    if (!markMap.has(cid)) {
                        markMap.set(cid, assemblyTag);
                    }
                }
            } catch {}
        }

        const entityPropSets = new Map();
        for (const relId of relDefIds) {
            try {
                const rel = await ifcAPI.GetLine(modelID, relId, false);
                if (!rel) continue;
                const psetRef = rel.RelatingPropertyDefinition;
                const psetId = psetRef?.value ?? psetRef;
                if (typeof psetId !== 'number') continue;
                const related = rel.RelatedObjects;
                if (!Array.isArray(related)) continue;
                for (const objRef of related) {
                    const objId = objRef?.value ?? objRef;
                    if (typeof objId !== 'number') continue;
                    if (!entityPropSets.has(objId)) entityPropSets.set(objId, []);
                    entityPropSets.get(objId).push(psetId);
                }
            } catch {}
        }

        async function extractMarkFromPsets(psetIds) {
            for (const psId of psetIds) {
                try {
                    const ps = await ifcAPI.GetLine(modelID, psId, false);
                    if (!ps) continue;
                    const hasProps = ps.HasProperties;
                    if (!Array.isArray(hasProps)) continue;
                    for (const propRef of hasProps) {
                        const propId = propRef?.value ?? propRef;
                        if (typeof propId !== 'number') continue;
                        try {
                            const prop = await ifcAPI.GetLine(modelID, propId, false);
                            if (!prop) continue;
                            const pName = unwrapIfcString(prop.Name);
                            if (pName === 'Assembly/Cast unit Mark') {
                                const nomRef = prop.NominalValue;
                                const nomId = nomRef?.value ?? nomRef;
                                let val = '';
                                if (typeof nomId === 'number') {
                                    try {
                                        const nomLine = await ifcAPI.GetLine(modelID, nomId, false);
                                        val = nomLine?.value != null ? String(nomLine.value) : (unwrapIfcString(nomLine) || '');
                                    } catch {}
                                } else if (typeof nomId === 'string') {
                                    val = nomId;
                                } else if (nomRef && typeof nomRef === 'object') {
                                    val = nomRef._internalValue != null ? String(nomRef._internalValue)
                                        : (nomRef.value != null ? String(nomRef.value) : '');
                                }
                                if (val) return val;
                            }
                        } catch {}
                    }
                } catch {}
            }
            return '';
        }

        for (const [assemblyId, childIds] of assemblyChildren) {
            if (assemblyTagMap.has(assemblyId)) continue;
            const psetIds = entityPropSets.get(assemblyId);
            if (!psetIds || !psetIds.length) continue;
            const mark = await extractMarkFromPsets(psetIds);
            if (!mark) continue;
            for (const cid of childIds) {
                markMap.set(cid, mark);
            }
        }

        console.log('[ComponentMark] assembly 映射: ', markMap.size, '个子构件获得编号');

        if (markMap.size === 0) {
            console.log('[ComponentMark] 尝试直接在元素上查找...');
            for (const row of elementIndex) {
                const psetIds = entityPropSets.get(row.expressID);
                if (!psetIds || !psetIds.length) continue;
                const mark = await extractMarkFromPsets(psetIds);
                if (mark) markMap.set(row.expressID, mark);
            }
            console.log('[ComponentMark] 直接查找: ', markMap.size, '个构件获得编号');
        }
    } catch (e) {
        console.error('[ComponentMark] 提取失败:', e);
    }

    let updated = 0;
    for (const row of elementIndex) {
        const mark = markMap.get(row.expressID);
        if (mark) {
            row.componentMark = mark;
            componentMarkLookup.set(String(row.expressID), mark);
            updated++;
        }
    }

    if (assemblyChildrenLookup && assemblyChildrenLookup.size) {
        const rowByExpressId = new Map(elementIndex.map((row) => [Number(row.expressID), row]));
        for (const [parentId, childIds] of assemblyChildrenLookup.entries()) {
            for (const childId of childIds) {
                const childRow = rowByExpressId.get(Number(childId));
                if (childRow) {
                    childRow.parentAssemblyExpressID = Number(parentId);
                }
            }
        }
    }

    if (updated > 0) {
        console.log('[ComponentMark] 成功更新', updated, '个构件编号');
        renderElementsList();
    } else {
        console.warn('[ComponentMark] 未找到任何 Assembly/Cast unit Mark');
    }
}

async function lazyLoadAssemblySummaries(modelID) {
    const ifcAPI = viewer.IFC?.loader?.ifcManager?.ifcAPI;
    if (!ifcAPI || !elementIndex.length) return;

    try {
        const relAggLines = ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCRELAGGREGATES);
        const relMatLines = ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCRELASSOCIATESMATERIAL);
        const relDefTypeLines = ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYTYPE);
        const relDefLines = ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES);

        const relAggIds = [];
        const relMatIds = [];
        const relDefTypeIds = [];
        const relDefIds = [];

        const pushIds = (src, target) => {
            if (!src) return;
            const size = typeof src.size === 'function' ? src.size() : (src.length || 0);
            for (let i = 0; i < size; i++) {
                const id = typeof src.get === 'function' ? src.get(i) : src[i];
                if (typeof id === 'number') target.push(id);
            }
        };

        pushIds(relAggLines, relAggIds);
        pushIds(relMatLines, relMatIds);
        pushIds(relDefTypeLines, relDefTypeIds);
        pushIds(relDefLines, relDefIds);

        const relDefinesMap = new Map();
        const relDefinesByTypeMap = new Map();
        const assemblyChildren = new Map();
        const materialMap = new Map();

        const readPropValue = async (prop) => {
            if (!prop) return '';
            const direct = prop.NominalValue;
            if (direct && typeof direct === 'object') {
                if (direct._internalValue != null) return String(direct._internalValue).trim();
                if (direct.value != null) return String(direct.value).trim();
            }
            return '';
        };

        for (const relId of relDefIds) {
            try {
                const rel = await ifcAPI.GetLine(modelID, relId, true);
                if (!rel || !rel.RelatingPropertyDefinition) continue;
                const propDef = rel.RelatingPropertyDefinition;
                const propList = [];

                if (Array.isArray(propDef.HasProperties)) {
                    for (const prop of propDef.HasProperties) {
                        const name = unwrapIfcString(prop && prop.Name);
                        const value = await readPropValue(prop);
                        if (name) propList.push({ name, value });
                    }
                }

                if (Array.isArray(propDef.Quantities)) {
                    for (const q of propDef.Quantities) {
                        const qName = unwrapIfcString(q && q.Name);
                        const qValue = unwrapIfcNumber(q && (q.LengthValue || q.AreaValue || q.VolumeValue || q.WeightValue || q.CountValue));
                        if (qName && qValue != null) propList.push({ name: qName, value: String(qValue) });
                    }
                }

                if (!propList.length || !Array.isArray(rel.RelatedObjects)) continue;
                for (const obj of rel.RelatedObjects) {
                    const objId = obj?.value ?? obj?.expressID ?? obj;
                    if (typeof objId !== 'number') continue;
                    if (!relDefinesMap.has(objId)) relDefinesMap.set(objId, []);
                    relDefinesMap.get(objId).push(...propList);
                }
            } catch {}
        }

        for (const relId of relDefTypeIds) {
            try {
                const rel = await ifcAPI.GetLine(modelID, relId, true);
                if (!rel || !Array.isArray(rel.RelatedObjects) || !rel.RelatingType) continue;
                const typeInfo = {
                    name: unwrapIfcString(rel.RelatingType.ObjectType) || unwrapIfcString(rel.RelatingType.Name) || ''
                };
                for (const obj of rel.RelatedObjects) {
                    const objId = obj?.value ?? obj?.expressID ?? obj;
                    if (typeof objId === 'number' && !relDefinesByTypeMap.has(objId)) {
                        relDefinesByTypeMap.set(objId, typeInfo);
                    }
                }
            } catch {}
        }

        for (const relId of relAggIds) {
            try {
                const rel = await ifcAPI.GetLine(modelID, relId, false);
                if (!rel || !rel.RelatingObject || !Array.isArray(rel.RelatedObjects)) continue;
                const parentId = rel.RelatingObject?.value ?? rel.RelatingObject;
                if (typeof parentId !== 'number') continue;
                const parentLine = await ifcAPI.GetLine(modelID, parentId, false);
                if (!parentLine || parentLine.type !== WebIFC.IFCELEMENTASSEMBLY) continue;
                const childIds = rel.RelatedObjects.map((item) => item?.value ?? item).filter((id) => typeof id === 'number');
                if (childIds.length) assemblyChildren.set(parentId, childIds);
            } catch {}
        }

        for (const relId of relMatIds) {
            try {
                const rel = await ifcAPI.GetLine(modelID, relId, true);
                if (!rel || !Array.isArray(rel.RelatedObjects)) continue;
                const materialName = unwrapIfcString(rel.RelatingMaterial && rel.RelatingMaterial.Name)
                    || unwrapIfcString(rel.RelatingMaterial && rel.RelatingMaterial.Material && rel.RelatingMaterial.Material.Name)
                    || '';
                if (!materialName) continue;
                for (const obj of rel.RelatedObjects) {
                    const objId = obj?.value ?? obj?.expressID ?? obj;
                    if (typeof objId === 'number' && !materialMap.has(objId)) materialMap.set(objId, materialName);
                }
            } catch {}
        }

        const getProp = (entityId, ...names) => {
            const props = relDefinesMap.get(entityId) || [];
            for (const name of names) {
                const hit = props.find((item) => String(item.name).toLowerCase() === String(name).toLowerCase());
                if (hit && String(hit.value || '').trim()) return String(hit.value).trim();
            }
            return '';
        };

        for (const [assemblyId, childIds] of assemblyChildren.entries()) {
            try {
                const assemblyLine = await ifcAPI.GetLine(modelID, assemblyId, false);
                const componentMark = unwrapIfcString(assemblyLine && assemblyLine.Tag) || getProp(assemblyId, 'Assembly/Cast unit Mark', 'Assembly/Cast unit mark');
                if (!componentMark) continue;

                const childLines = [];
                for (const childId of childIds) {
                    try {
                        const line = await ifcAPI.GetLine(modelID, childId, false);
                        if (line) childLines.push({ id: childId, line });
                    } catch {}
                }

                const mainChild = childLines.find((item) => item.line.type === WebIFC.IFCBEAM)
                    || childLines.find((item) => item.line.type === WebIFC.IFCMEMBER)
                    || childLines[0]
                    || null;

                const summary = {
                    componentMark,
                    positionCode: getProp(assemblyId, 'Assembly/Cast unit position code'),
                    bottomElevation: (getProp(assemblyId, 'Assembly/Cast unit bottom elevation') || '').replace(/\s+/g, ''),
                    topElevation: (getProp(assemblyId, 'Assembly/Cast unit top elevation') || '').replace(/\s+/g, ''),
                    length: unwrapIfcNumber(getProp(assemblyId, 'LENGTH_GROSS', 'LENGTH')),
                    width: unwrapIfcNumber(getProp(assemblyId, 'Width')) ?? (mainChild ? unwrapIfcNumber(getProp(mainChild.id, 'Width')) : null),
                    area: unwrapIfcNumber(getProp(assemblyId, 'AREA')) ?? (mainChild ? unwrapIfcNumber(getProp(mainChild.id, 'OuterSurfaceArea', 'NetArea')) : null),
                    castUnitWeight: unwrapIfcNumber(getProp(assemblyId, 'Assembly/Cast unit weight', 'WEIGHT')),
                    weightNet: unwrapIfcNumber(getProp(assemblyId, 'WEIGHT_NET')) ?? (mainChild ? unwrapIfcNumber(getProp(mainChild.id, 'NetWeight')) : null),
                    weightGross: unwrapIfcNumber(getProp(assemblyId, 'WEIGHT_GROSS')),
                    material: materialMap.get(assemblyId) || (mainChild ? materialMap.get(mainChild.id) : '') || '',
                    mainSpec: (mainChild && (unwrapIfcString(mainChild.line.ObjectType) || unwrapIfcString(mainChild.line.Name))) || (mainChild && relDefinesByTypeMap.get(mainChild.id)?.name) || '',
                    mainReference: (mainChild && (unwrapIfcString(mainChild.line.Tag) || getProp(mainChild.id, 'Reference'))) || ''
                };

                setAssemblySummaryForIds(componentMark, summary, [assemblyId, ...childIds]);
            } catch {}
        }
    } catch (e) {
        console.warn('[AssemblySummary] 提取失败:', e);
    }
}

async function ensureComponentMarkForExpressID(expressID) {
    const key = String(expressID);
    const row = elementIndex.find((r) => String(r.expressID) === key);
    if (!row) return '';
    if (row.componentMark && String(row.componentMark).trim()) {
        return String(row.componentMark).trim();
    }

    const cachedMark = componentMarkLookup.get(key);
    if (cachedMark) {
        row.componentMark = cachedMark;
        return cachedMark;
    }

    if (componentMarkLoadPromise) {
        try {
            await componentMarkLoadPromise;
        } catch (e) {
            console.warn('[ComponentMark] 等待编号加载失败:', e);
        }
    }

    const resolvedMark = row.componentMark || componentMarkLookup.get(key) || '';
    if (resolvedMark) {
        row.componentMark = resolvedMark;
        return String(resolvedMark).trim();
    }
    return '';
}

async function ensureAssemblySummaryForExpressID(expressID) {
    const key = String(expressID);
    const cached = assemblySummaryLookup.get(key);
    if (cached) return cached;

    if (assemblySummaryLoadPromise) {
        try {
            await assemblySummaryLoadPromise;
        } catch (e) {
            console.warn('[AssemblySummary] 等待摘要加载失败:', e);
        }
    }

    return assemblySummaryLookup.get(key) || null;
}

function getElementLabel(row) {
    const mark = (row.componentMark && String(row.componentMark).trim()) || '';
    if (mark) return mark;
    const name = (row.name && String(row.name).trim()) || '';
    if (name) return name;
    return `构件 #${row.expressID}`;
}

function emitListCheckboxSelection() {
    const expressIDs = Array.from(checkboxSelectedIds).map(Number).filter((id) => Number.isFinite(id));
    const rows = elementIndex
        .filter((r) => checkboxSelectedIds.has(r.expressID))
        .map((r) => ({
            expressID: r.expressID,
            globalId: r.globalId || '',
            name: r.name || '',
            type: r.type || '',
            componentMark: r.componentMark || ''
        }));
    postToParent({ type: 'list-checkbox-selection', expressIDs, rows });
}

function appendElementsToList(rows) {
    const frag = document.createDocumentFragment();
    for (const row of rows) {
        const wrap = document.createElement('div');
        wrap.className = 'element-row';
        wrap.dataset.expressId = String(row.expressID);

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'element-row-check';
        cb.checked = checkboxSelectedIds.has(row.expressID);
        cb.disabled = disabledCheckboxIds.has(row.expressID);
        cb.title = '勾选后可批量指派班组/质检信息';
        cb.addEventListener('click', (e) => e.stopPropagation());
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            if (cb.disabled) {
                cb.checked = false;
                return;
            }
            if (cb.checked) {
                checkboxSelectedIds.add(row.expressID);
            } else {
                checkboxSelectedIds.delete(row.expressID);
            }
            emitListCheckboxSelection();
        });

        const div = document.createElement('div');
        div.className = 'element-item';
        div.textContent = getElementLabel(row);
        div.addEventListener('click', async (e) => {
            if (e.target.closest('input[type="checkbox"]')) return;
            if (currentModelID == null) return;
            // ① 主视图对准该构件（绿色高亮 + 相机飞入）
            await selectAndShowElement(currentModelID, row.expressID, true);
            // ② 底部聚焦带独立展示该构件
            if (!document.body.classList.contains('embed-minimal')) {
                await showElementInSmallViewer(row);
            }
        });

        wrap.appendChild(cb);
        wrap.appendChild(div);
        frag.appendChild(wrap);
    }
    elementsContainer.appendChild(frag);
    updateSelectedInList();
}

function renderElementsList() {
    if (!elementsContainer) return;
    const query = elementSearch.value.trim().toLowerCase();
    const rows = query
        ? elementIndex.filter((row) => getElementLabel(row).toLowerCase().includes(query))
        : elementIndex;

    elementsContainer.innerHTML = '';
    if (!rows.length) {
        elementsContainer.innerHTML = '<p class="placeholder">没有匹配的构件</p>';
        return;
    }

    appendElementsToList(rows);
}

function updateSelectedInList() {
    const rows = elementsContainer.querySelectorAll('.element-row');
    rows.forEach((wrap) => {
        const id = Number(wrap.dataset.expressId);
        const item = wrap.querySelector('.element-item');
        if (item) {
            item.classList.toggle('selected', Number.isFinite(id) && id === selectedExpressID);
        }
    });
}

// ============================================================
// 11. 选择并显示构件（整模灰 + 独立绿色 mesh 覆盖选中构件）
// ============================================================
// IFC 模型通常是一个合并 mesh（所有构件共用）。直接在合并 mesh 上改材质颜色
// 会把整栋楼涂色。正确做法：从合并 mesh 中提取属于该 expressID 的三角面，
// 构建一个独立的绿色 Mesh 叠加在灰色底模之上。
let greenOverlayMesh = null;

function removeGreenOverlay() {
    if (greenOverlayMesh) {
        viewer.context.scene.scene.remove(greenOverlayMesh);
        greenOverlayMesh.geometry?.dispose();
        greenOverlayMesh = null;
    }
}

async function selectAndShowElement(modelID, expressID, focusSelection, opts = {}) {
    const isolateOnly = !!opts.isolateOnly;

    if (!isolateOnly) {
        restoreIfcBaseModelsIfIsolated();
    }

    selectedExpressID = expressID;
    updateSelectedInList();

    // 清除内置选择高亮
    viewer.IFC.selector.unpickIfcItems();

    // 清除上一次的绿色 mesh（以及多选橙色 mesh，防止切换模式后残留）
    removeGreenOverlay();
    clearMultiSelectMeshes();

    if (minimalMode && !isolateOnly) {
        resetAllToGray();
        if (highlightedExpressIDs.size > 0) {
            for (const id of highlightedExpressIDs) {
                highlightSelectedInGreen(Number(id));
            }
        }
    }

    // 从合并 mesh 中提取 expressID 对应的三角面，构建绿色 mesh
    const newMesh = buildGreenMesh(modelID, expressID);
    if (newMesh) {
        greenOverlayMesh = newMesh;
        const scene1 = viewer.context.getScene ? viewer.context.getScene() : viewer.context.scene.scene;
        scene1.add(greenOverlayMesh);
        console.log('绿色 mesh 已加入场景, scene.children:', scene1.children.length);
        greenOverlayMesh.updateMatrixWorld(true);
        const worldPos = new THREE.Vector3();
        greenOverlayMesh.getWorldPosition(worldPos);
        console.log('green mesh worldPos:', worldPos.toArray().join(','));
    }

    if (isolateOnly && newMesh) {
        setIfcBaseModelsVisible(false);
        isolateHideBaseModel = true;
    } else {
        setIfcBaseModelsVisible(true);
        isolateHideBaseModel = false;
        if (isolateOnly && !newMesh) {
            console.warn('[IFC] isolateOnly 但未能构建构件 mesh，保持显示整模');
        }
    }

    if (focusSelection) {
        await safeViewItem(modelID, expressID);
        scheduleMainViewerRefocus(modelID, expressID);
    }
    await showElementProperties(modelID, expressID);

    if (!opts.silent && window.parent !== window) {
        const row = elementIndex.find((r) => r.expressID === expressID);
        if (row) {
            const componentMark = await ensureComponentMarkForExpressID(expressID);
            const assemblySummary = await ensureAssemblySummaryForExpressID(expressID);
            postToParent({
                type: 'element-selected',
                expressID: row.expressID,
                globalId: row.globalId || '',
                name: row.name || '',
                type: row.type || '',
                componentMark: componentMark || row.componentMark || '',
                assemblySummary: assemblySummary || null
            });
        }
    }
}

function setAssemblySummaryForIds(mark, summary, ids) {
    if (!mark || !summary || !Array.isArray(ids)) return;
    for (const id of ids) {
        const key = String(id);
        if (!assemblySummaryLookup.has(key)) {
            assemblySummaryLookup.set(key, { ...summary, componentMark: mark });
        }
    }
}

// ─── 多选高亮辅助函数 ───────────────────────────────────
function clearMultiSelectMeshes() {
    if (window._multiSelectMeshes) {
        const scene = getScene();
        window._multiSelectMeshes.forEach(m => {
            if (scene) scene.remove(m);
            m.geometry && m.geometry.dispose();
        });
        window._multiSelectMeshes = [];
    }
}

function updateMultiSelectHighlight() {
    restoreOriginalColorsAll();
    clearMultiSelectMeshes();
    window._multiSelectMeshes = [];

    const model = viewer.context.items.ifcModels.find(m => m.modelID === currentModelID);
    if (!model) return;

    selectedIds.forEach(expressID => {
        const mesh = buildColoredMesh(model, expressID, MULTI_SELECT_COLOR);
        if (mesh) {
            window._multiSelectMeshes.push(mesh);
            const scene = getScene();
            scene.add(mesh);
        }
    });
}

// 用指定颜色构建构件 mesh（用于多选高亮）
function buildColoredMesh(model, expressID, color) {
    const geo = model.geometry;
    if (!geo) return null;
    const expressIDAttr = geo.attributes && geo.attributes.expressID;
    if (!expressIDAttr) return null;

    const targetExpressIds = resolveExpressIdsForGeometry(expressID, assemblyChildrenLookup);
    const faceVertexIndices = collectFaceVertexIndices(geo, targetExpressIds);

    if (faceVertexIndices.length === 0) return null;

    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const newPos = new Float32Array(faceVertexIndices.length * 3);
    const newNorm = new Float32Array(faceVertexIndices.length * 3);

    for (let i = 0; i < faceVertexIndices.length; i++) {
        const vi = faceVertexIndices[i];
        newPos[i * 3]     = posAttr.getX(vi);
        newPos[i * 3 + 1] = posAttr.getY(vi);
        newPos[i * 3 + 2] = posAttr.getZ(vi);
        if (normAttr) {
            newNorm[i * 3]     = normAttr.getX(vi);
            newNorm[i * 3 + 1] = normAttr.getY(vi);
            newNorm[i * 3 + 2] = normAttr.getZ(vi);
        }
    }

    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
    if (normAttr) newGeo.setAttribute('normal', new THREE.BufferAttribute(newNorm, 3));
    const newIndex = new Uint32Array(faceVertexIndices.length);
    for (let i = 0; i < faceVertexIndices.length; i++) newIndex[i] = i;
    newGeo.setIndex(new THREE.BufferAttribute(newIndex, 1));

    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: false });
    const mesh = new THREE.Mesh(newGeo, mat);
    mesh.position.copy(model.position);
    mesh.rotation.copy(model.rotation);
    mesh.scale.copy(model.scale);
    mesh.renderOrder = 1;
    return mesh;
}

function clearSelection() {
    removeGreenOverlay();
    restoreIfcBaseModelsIfIsolated();
    selectedExpressID = null;
    updateSelectedInList();
    viewer.IFC.selector.unpickIfcItems();
    propsContainer.innerHTML = '<p class="placeholder">双击构件以查看属性</p>';
    if (minimalMode) {
        applyProjectMinimalHighlighting();
    }
}

// 从合并 mesh 中提取属于指定 expressID 的三角面，返回独立绿色 Mesh
function buildGreenMesh(modelID, expressID) {
    const model = viewer.context.items.ifcModels.find(m => m.modelID === modelID);
    if (!model || !model.geometry) return null;

    const geo = model.geometry;
    const expressIDAttr = geo.attributes.expressID;
    if (!expressIDAttr) {
        console.warn('buildGreenMesh: geo.attributes.expressID 不存在', {
            geoKeys: Object.keys(geo.attributes),
            geoUserData: geo.userData
        });
        return null;
    }

    const targetExpressIds = resolveExpressIdsForGeometry(expressID, assemblyChildrenLookup);
    const faceVertexIndices = collectFaceVertexIndices(geo, targetExpressIds);

    if (faceVertexIndices.length === 0) {
        const indexArray = geo.index ? geo.index.array : null;
        console.warn('buildGreenMesh: 未匹配到任何三角面', {
            expressID,
            targetExpressIds,
            totalTris: indexArray ? indexArray.length / 3 : expressIDAttr.count / 3
        });
        return null;
    }
    console.log('buildGreenMesh: 匹配到', faceVertexIndices.length / 3, '个三角面, expressID:', expressID, 'targetExpressIds:', targetExpressIds);

    // 复制顶点坐标和法线
    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const newPos = new Float32Array(faceVertexIndices.length * 3);
    const newNorm = new Float32Array(faceVertexIndices.length * 3);

    for (let i = 0; i < faceVertexIndices.length; i++) {
        const vi = faceVertexIndices[i];
        newPos[i * 3]     = posAttr.getX(vi);
        newPos[i * 3 + 1] = posAttr.getY(vi);
        newPos[i * 3 + 2] = posAttr.getZ(vi);
        if (normAttr) {
            newNorm[i * 3]     = normAttr.getX(vi);
            newNorm[i * 3 + 1] = normAttr.getY(vi);
            newNorm[i * 3 + 2] = normAttr.getZ(vi);
        }
    }

    // 构建独立几何体
    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
    if (normAttr) newGeo.setAttribute('normal', new THREE.BufferAttribute(newNorm, 3));
    const newIndex = new Uint32Array(faceVertexIndices.length);
    for (let i = 0; i < faceVertexIndices.length; i++) newIndex[i] = i;
    newGeo.setIndex(new THREE.BufferAttribute(newIndex, 1));

    // 绿色材质，叠加显示在最上层
    const greenMat = new THREE.MeshBasicMaterial({
        color: 0x00dd44,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        transparent: false
    });
    const mesh = new THREE.Mesh(newGeo, greenMat);

    // 保持与原始模型相同的坐标变换
    mesh.position.copy(model.position);
    mesh.rotation.copy(model.rotation);
    mesh.scale.copy(model.scale);
    mesh.renderOrder = 1;

    return mesh;
}

function collectFaceVertexIndices(geo, expressIDs) {
    const expressIDAttr = geo && geo.attributes && geo.attributes.expressID;
    if (!expressIDAttr) return [];

    const targetIds = new Set((Array.isArray(expressIDs) ? expressIDs : [expressIDs])
        .map(Number)
        .filter((id) => Number.isFinite(id)));
    if (!targetIds.size) return [];

    const indexArray = geo.index ? geo.index.array : null;
    const faceVertexIndices = [];

    if (indexArray) {
        for (let i = 0; i < indexArray.length; i += 3) {
            const i0 = indexArray[i];
            const i1 = indexArray[i + 1];
            const i2 = indexArray[i + 2];
            if (targetIds.has(expressIDAttr.getX(i0)) &&
                targetIds.has(expressIDAttr.getX(i1)) &&
                targetIds.has(expressIDAttr.getX(i2))) {
                faceVertexIndices.push(i0, i1, i2);
            }
        }
    } else {
        for (let i = 0; i < expressIDAttr.count; i += 3) {
            if (targetIds.has(expressIDAttr.getX(i)) &&
                targetIds.has(expressIDAttr.getX(i + 1)) &&
                targetIds.has(expressIDAttr.getX(i + 2))) {
                faceVertexIndices.push(i, i + 1, i + 2);
            }
        }
    }

    return faceVertexIndices;
}

// 将模型整体设为灰色
function grayOutModel(modelID) {
    if (modelID == null) return;
    const model = viewer.context.items.ifcModels.find(m => m.modelID === modelID);
    if (!model) return;
    if (!model.material) return;

    const mats = Array.isArray(model.material) ? model.material : [model.material];
    mats.forEach(mat => {
        if (mat && mat.color) mat.color.set(0x888888);
    });
    console.log('[IFC iframe] grayOutModel applied', {
        modelID,
        materialCount: mats.length
    });
}

// ============================================================
// 12. 属性显示
// ============================================================
function isContainerType(typeName) {
    if (!typeName) return false;
    const t = typeName.toUpperCase();
    return t === 'IFCPROJECT'
        || t === 'IFCSITE'
        || t === 'IFCBUILDING'
        || t === 'IFCBUILDINGSTOREY'
        || t === 'IFCSPACE'
        || t === 'IFCZONE'
        || t === 'IFCSPATIALZONE'
        || t === 'IFCFACILITY'
        || t === 'IFCFACILITYPART';
}

function isViewableExpressID(expressID) {
    return elementIndex.some((row) => row.expressID === expressID);
}

function frameMeshInMainViewer(mesh) {
    if (!mesh || !viewer || !viewer.context) return false;
    mesh.updateMatrixWorld(true);

    const ctx = viewer.context;
    const ifcCam = ctx.ifcCamera;
    const camera = ifcCam?.perspectiveCamera;
    if (!camera) return false;

    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return false;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    if (!Number.isFinite(maxDim) || maxDim <= 0) return false;

    const padding = 1.52;
    const fov = camera.fov * (Math.PI / 180);
    let distance = (maxDim / 2) / Math.tan(fov / 2) * padding;
    distance = Math.max(distance, maxDim * 0.95);
    const offset = new THREE.Vector3(1, 0.72, 1).normalize().multiplyScalar(distance);
    const cameraPosition = center.clone().add(offset);

    camera.position.copy(cameraPosition);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    try {
        if (ifcCam.controls && typeof ifcCam.controls.setLookAt === 'function') {
            ifcCam.controls.setLookAt(
                cameraPosition.x, cameraPosition.y, cameraPosition.z,
                center.x, center.y, center.z,
                true
            );
        } else if (ifcCam.controls && typeof ifcCam.controls.update === 'function') {
            ifcCam.controls.update();
        }
    } catch (error) {
        console.warn('[IFC iframe] main viewer setLookAt failed', error);
    }

    ctx.resize?.();
    return true;
}

function scheduleMainViewerRefocus(modelID, expressID) {
    [0, 120, 360, 900, 1500].forEach((ms) => {
        setTimeout(() => {
            safeViewItem(modelID, expressID).catch(() => {});
        }, ms);
    });
}

async function safeViewItem(modelID, expressID) {
    const ifcAPI = viewer.IFC?.loader?.ifcManager?.ifcAPI;
    if (!ifcAPI) return;

    if (greenOverlayMesh) {
        greenOverlayMesh.updateMatrixWorld(true);
        const overlayBox = new THREE.Box3().setFromObject(greenOverlayMesh);
        if (!overlayBox.isEmpty()) {
            const overlaySize = new THREE.Vector3();
            overlayBox.getSize(overlaySize);
            console.log('[IFC iframe] focus using greenOverlayMesh', {
                expressID,
                overlaySize: {
                    x: overlaySize.x,
                    y: overlaySize.y,
                    z: overlaySize.z
                }
            });
            if ([overlaySize.x, overlaySize.y, overlaySize.z].every(Number.isFinite) && overlaySize.lengthSq() > 0) {
                if (frameMeshInMainViewer(greenOverlayMesh)) {
                    return;
                }
                try {
                    await viewer.context.ifcCamera.targetItem(greenOverlayMesh);
                    return;
                } catch (error) {
                    console.warn('[IFC iframe] target green overlay failed after manual frame fallback', error);
                }
            }
        }
    }

    try {
        const props = await viewer.IFC.getProperties(modelID, expressID, false, false);
        const objectType = unwrapIfcString(props?.ObjectType);
        if (objectType && /building|storey|level|site|project|楼层|建筑/i.test(objectType)) {
            viewer.context.fitToFrame();
            return;
        }
    } catch {}

    if (!isViewableExpressID(expressID)) {
        viewer.context.fitToFrame();
        return;
    }

    let typeName = null;
    try {
        const line = await ifcAPI.GetLine(modelID, expressID, false);
        const typeCode = line?.type;
        if (typeof typeCode === 'number') {
            typeName = ifcAPI.GetNameFromTypeCode(typeCode);
        }
        if (isContainerType(typeName)) {
            viewer.context.fitToFrame();
            return;
        }
        const representation = unwrapIfcValue(line?.Representation);
        if (representation == null) {
            console.warn('[IFC iframe] line has no direct representation, skip line-based focus fallback', {
                expressID,
                typeName
            });
        }
    } catch {
        console.warn('[IFC iframe] line-based focus fallback failed', { expressID });
    }

    const selection = viewer.IFC?.selector?.selection;
    if (!selection?.meshes || selection.meshes.size === 0) return;

    let last = null;
    for (const mesh of selection.meshes) last = mesh;
    if (!last) return;

    const pos = last.geometry?.getAttribute?.('position');
    const count = pos?.count ?? 0;
    if (count <= 0) return;

    const box = new THREE.Box3().setFromObject(last);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    box.getSize(size);
    if (![size.x, size.y, size.z].every(Number.isFinite)) return;
    if (size.lengthSq() === 0) return;

    if (frameMeshInMainViewer(last)) return;

    try {
        await viewer.context.ifcCamera.targetItem(last);
        return;
    } catch {}
}

async function showElementProperties(modelID, expressID) {
    try {
        const props = await viewer.IFC.getProperties(modelID, expressID, false, false);
        const ifcManager = viewer.IFC?.loader?.ifcManager;
        const assemblySummary = await ensureAssemblySummaryForExpressID(expressID);

        const materialNames = await getMaterialNamesForElement(ifcManager, modelID, expressID);

        let mats = null;
        try {
            mats = await ifcManager?.getMaterialsProperties?.(modelID, expressID, false);
        } catch {
            mats = null;
        }

        let psets = null;
        try {
            psets = await ifcManager?.getPropertySets?.(modelID, expressID, true);
        } catch {
            try {
                psets = await ifcManager?.getPropertySets?.(modelID, expressID, false);
            } catch {
                psets = null;
            }
        }

        let types = null;
        try {
            types = await ifcManager?.getTypeProperties?.(modelID, expressID, false);
        } catch {
            types = null;
        }

        props['材质'] = materialNames.length ? materialNames.join('、') : '无';
        const weight = getWeightFromPropertySets(psets);
        props['重量'] = weight == null ? '无' : weight;

        const row = elementIndex.find((item) => String(item.expressID) === String(expressID)) || null;
        const displayProps = assemblySummary ? buildChineseSummaryProps(assemblySummary, row) : props;
        const detailsObject = { ...props, psets, mats, types, assemblySummary };
        renderProperties(modelID, expressID, displayProps, detailsObject);
    } catch (e) {
        console.error('获取构件基础属性失败。', e);
        propsContainer.innerHTML = '<p class="placeholder">获取属性失败，请尝试选择其他构件。</p>';
    }
}

function renderProperties(modelID, expressID, props, detailsObject) {
    if (!props) return;

    propsContainer.innerHTML = '';

    for (const key in props) {
        const value = props[key];
        if (value === null || value === undefined) continue;

        let primitive = null;
        if (typeof value !== 'object') {
            primitive = value;
        } else if ('value' in value && value.value !== null && value.value !== undefined && typeof value.value !== 'object') {
            primitive = value.value;
        }
        if (primitive === null) continue;

        const div = document.createElement('div');
        div.className = 'prop-item';

        const k = document.createElement('span');
        k.className = 'prop-key';
        k.textContent = `${key}: `;

        const v = document.createElement('span');
        v.textContent = String(primitive);

        div.appendChild(k);
        div.appendChild(v);
        propsContainer.appendChild(div);
    }

    if (detailsObject !== undefined) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = '完整信息';
        details.appendChild(summary);

        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordBreak = 'break-word';
        pre.style.fontSize = '12px';
        pre.textContent = safeJsonStringify(detailsObject);
        details.appendChild(pre);
        propsContainer.appendChild(details);
    }
}

// ============================================================
// 13. 工具函数
// ============================================================
function unwrapIfcValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'object') return value;
    if ('value' in value) return value.value;
    return null;
}

function unwrapIfcString(value) {
    const v = unwrapIfcValue(value);
    return typeof v === 'string' ? v : null;
}

function unwrapIfcNumber(value) {
    const v = unwrapIfcValue(value);
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

async function getMaterialNamesForElement(ifcManager, modelID, expressID) {
    const names = new Set();

    const addNamesFromMaterials = (materials) => {
        for (const n of getMaterialNames(materials)) names.add(n);
    };

    try {
        const mats = await ifcManager?.getMaterialsProperties?.(modelID, expressID, false);
        addNamesFromMaterials(mats);
    } catch (e) {
        console.warn('获取材质信息失败。', e);
    }

    if (names.size) return Array.from(names);

    try {
        const types = await ifcManager?.getTypeProperties?.(modelID, expressID, false);
        const typeIds = [];
        if (Array.isArray(types)) {
            for (const t of types) {
                if (typeof t === 'number') typeIds.push(t);
                else if (t && typeof t === 'object' && typeof t.expressID === 'number') typeIds.push(t.expressID);
            }
        }

        for (const typeId of typeIds) {
            try {
                const mats = await ifcManager?.getMaterialsProperties?.(modelID, typeId, false);
                addNamesFromMaterials(mats);
            } catch (e) {
                console.warn('获取类型材质信息失败。', e);
            }
        }
    } catch (e) {
        console.warn('获取类型信息失败。', e);
    }

    return Array.from(names);
}

function getMaterialNames(materials) {
    if (!Array.isArray(materials)) return [];
    const names = new Set();
    const seen = new WeakSet();
    const stack = [];

    for (const m of materials) stack.push([m, 0]);

    while (stack.length) {
        const [obj, depth] = stack.pop();
        if (!obj || typeof obj !== 'object') continue;
        if (seen.has(obj)) continue;
        seen.add(obj);
        if (depth > 8) continue;

        const name = unwrapIfcString(obj.Name);
        if (name) names.add(name);

        const material = obj.Material;
        if (material) stack.push([material, depth + 1]);

        const forLayerSet = obj.ForLayerSet;
        if (forLayerSet) stack.push([forLayerSet, depth + 1]);

        const materialLayers = obj.MaterialLayers;
        if (Array.isArray(materialLayers)) {
            for (const layer of materialLayers) stack.push([layer, depth + 1]);
        }

        const materialsArray = obj.Materials;
        if (Array.isArray(materialsArray)) {
            for (const item of materialsArray) stack.push([item, depth + 1]);
        }

        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (!value || typeof value !== 'object') continue;
            if (Array.isArray(value)) {
                for (const v of value) stack.push([v, depth + 1]);
            } else {
                stack.push([value, depth + 1]);
            }
        }
    }

    return Array.from(names);
}

function getWeightFromPropertySets(psets) {
    if (!Array.isArray(psets)) return null;

    const nameMatchesWeight = (name) => {
        if (!name) return false;
        return /weight|mass|重量|质量/i.test(name);
    };

    const scoreName = (name) => {
        if (!name) return 0;
        const n = name.toLowerCase();
        if (n.includes('netweight')) return 300;
        if (n.includes('grossweight')) return 250;
        if (n.includes('cast unit weight')) return 200;
        if (n.includes('weight')) return 120;
        if (n.includes('mass')) return 100;
        if (n.includes('重量')) return 120;
        if (n.includes('质量')) return 100;
        return 10;
    };

    const firstNumericValue = (obj) => {
        if (!obj || typeof obj !== 'object') return null;
        const direct = unwrapIfcNumber(obj);
        if (direct != null) return direct;
        const keys = Object.keys(obj);
        for (const key of keys) {
            const value = obj[key];
            const n = unwrapIfcNumber(value);
            if (n == null) continue;
            if (key === 'NominalValue') return n;
            if (key.endsWith('Value')) return n;
        }
        return null;
    };

    let best = null;

    for (const pset of psets) {
        const quantities = pset?.Quantities;
        if (Array.isArray(quantities)) {
            for (const q of quantities) {
                const n = unwrapIfcNumber(q?.WeightValue);
                if (n != null) {
                    const name = unwrapIfcString(q?.Name);
                    const score = scoreName(name);
                    if (!best || score > best.score) best = { value: n, score };
                    continue;
                }
                const qName = unwrapIfcString(q?.Name);
                if (!nameMatchesWeight(qName)) continue;
                const any = firstNumericValue(q);
                if (any != null) {
                    const score = scoreName(qName);
                    if (!best || score > best.score) best = { value: any, score };
                }
            }
        }

        const hasProps = pset?.HasProperties;
        if (Array.isArray(hasProps)) {
            for (const p of hasProps) {
                const pName = unwrapIfcString(p?.Name);
                if (!nameMatchesWeight(pName)) continue;
                const n = firstNumericValue(p?.NominalValue) ?? firstNumericValue(p);
                if (n != null) {
                    const score = scoreName(pName);
                    if (!best || score > best.score) best = { value: n, score };
                }
            }
        }
    }

    return best ? best.value : null;
}

function safeJsonStringify(value) {
    const seen = new WeakSet();
    return JSON.stringify(value, (key, val) => {
        if (val && typeof val === 'object') {
            if (seen.has(val)) return '[Circular]';
            seen.add(val);
            if ('value' in val && Object.keys(val).length <= 3) return val.value;
        }
        return val;
    }, 2);
}

function toDisplayNumber(value) {
    if (value == null || value === '') return '无';
    const num = Number(value);
    return Number.isFinite(num) ? String(num) : String(value);
}

function buildChineseSummaryProps(summary, row = null) {
    const data = summary || {};
    return {
        '构件编号': data.componentMark || (row && row.componentMark) || '无',
        '位置编码': data.positionCode || '无',
        '下标高': data.bottomElevation || '无',
        '上标高': data.topElevation || '无',
        '长度': toDisplayNumber(data.length),
        '宽度': toDisplayNumber(data.width),
        '面积': toDisplayNumber(data.area),
        '构件重量': toDisplayNumber(data.castUnitWeight),
        '净重': toDisplayNumber(data.weightNet),
        '毛重': toDisplayNumber(data.weightGross),
        '材质': data.material || '无',
        '主规格': data.mainSpec || '无',
        '主零件编号': data.mainReference || '无'
    };
}

// ============================================================
// ============================================================
console.log('IFC 查看器已加载，等待上传模型...');

// ============================================================
// 15. URL 参数自动加载 IFC 文件
// ============================================================
async function loadIfcFromUrl(ifcUrl) {
    if (!ifcUrl) return;

    try {
        const decodedUrl = decodeURIComponent(ifcUrl);
        console.log('正在从 URL 加载 IFC 模型:', decodedUrl);

        // 清理旧模型
        const prevModelID = currentModelID;
        if (prevModelID != null) removeGreenOverlay();
        restoreIfcBaseModelsIfIsolated();
        if (currentModel) {
            viewer.context.scene.remove(currentModel);
            currentModel = null;
        }
        viewer.IFC.selector.unpickIfcItems();
        selectedExpressID = null;
        greenOverlayMesh = null;
        propsContainer.innerHTML = '<p class="placeholder">加载中…</p>';
        elementsContainer.innerHTML = '<p class="placeholder">加载中…</p>';
        elementSearch.value = '';
        elementIndex = [];
        checkboxSelectedIds.clear();
        emitListCheckboxSelection();

        currentUrl = decodedUrl;
        currentModel = await viewer.IFC.loadIfcUrl(decodedUrl);
        currentModelID = currentModel?.modelID ?? null;
        console.log('IFC 模型加载完成！');

        if (elementViewer) {
            elementViewer.IFC.selector.unpickIfcItems();
        }

        propsContainer.innerHTML = '<p class="placeholder">双击构件以查看属性</p>';
        if (databaseIndexMode) {
            await buildDatabaseBackedElementIndex(currentProjectId);
        } else if (!lightElementPanelMode && !minimalMode) {
            await buildElementIndex();
        }

        await tryApplyPendingSelectFromParent();

        postToParent({
            type: 'model-loaded',
            modelID: currentModelID,
            elementCount: (lightElementPanelMode || minimalMode) ? 0 : elementIndex.length
        });

        setTimeout(() => {
            grayOutModel(currentModelID);
        }, 500);
    } catch (e) {
        console.error('从 URL 加载 IFC 失败:', e);
        elementsContainer.innerHTML = `<p class="placeholder">加载失败: ${e.message || e}</p>`;
    }
}

// 页面加载时检查 URL 参数
window.addEventListener('DOMContentLoaded', () => {
    applyEmbedModeFromUrl();
    const params = new URLSearchParams(window.location.search);
    const ifcUrl = params.get('ifcUrl');
    if (ifcUrl) {
        console.log('检测到 URL 参数 ifcUrl，准备自动加载...');
        loadIfcFromUrl(ifcUrl);
    }
});
