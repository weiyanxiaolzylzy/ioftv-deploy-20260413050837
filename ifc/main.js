import * as THREE from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';

// ============================================================
// 1. 初始化主查看器
// ============================================================
const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({
    container,
    backgroundColor: new THREE.Color(0xe8ecef)
});
viewer.IFC.setWasmPath('/wasm/');

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
    elementViewer.IFC.setWasmPath('/wasm/');
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
let marksCache = {}; // expressID -> componentMark 映射，优先从 Python API 获取
let selectedExpressID = null;
let currentHighlightReason = null; // 检测原因
let multiSelectMode = false; // 多选模式开关（3D 点击多选，由父页开启）
let selectedIds = []; // 多选模式下已选中的 expressID 集合
const MULTI_SELECT_COLOR = new THREE.Color(0xff8800); // 橙色高亮
/** 构件列表复选框多选（与 3D 多选独立） */
const checkboxSelectedIds = new Set();
/** 父页面 postMessage 待执行的构件聚焦（模型未就绪时排队） */
let pendingSelectFromParent = null;
/** 仅显示单个构件：隐藏合并后的整模 mesh，只保留提取出的构件几何（由 URL componentIsolate=1 或 postMessage 开启） */
let isolateComponentView = false;
/** 当前是否已隐藏整模（用于 clearSelection / 加载新模时恢复） */
let isolateHideBaseModel = false;

// 父页面消息通信（postMessage）
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
            pendingSelectFromParent = { expressID: eid, focus: data.focus !== false, isolateOnly };
            await tryApplyPendingSelectFromParent();
            break;
        }
        case 'highlight': {
            const ids = Array.isArray(data.ids) ? data.ids.map(Number) : [];
            ids.forEach(expressID => highlightSelectedInGreen(expressID));
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
    }
});

async function tryApplyPendingSelectFromParent() {
    if (!pendingSelectFromParent || currentModelID == null) return;
    const { expressID, focus, isolateOnly } = pendingSelectFromParent;
    if (!elementIndex.some((r) => r.expressID === expressID)) return;
    const row = elementIndex.find((r) => r.expressID === expressID);
    pendingSelectFromParent = null;
    /* 构件模型区：用「小窗」逻辑只显示单构件 mesh，不用整模高亮 */
    if (document.body.classList.contains('embed-element-panel') && row) {
        await showElementInSmallViewer(row);
        return;
    }
    await selectAndShowElement(currentModelID, expressID, focus, {
        silent: true,
        isolateOnly: !!isolateOnly
    });
}

function applyEmbedModeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const embed = (params.get('embed') || '').trim();
    if (embed === 'minimal') {
        document.body.classList.add('embed-minimal');
    } else if (embed === 'dashboard') {
        document.body.classList.add('embed-dashboard');
    } else if (embed === 'element-panel') {
        /* 大屏「构件模型」专用：主视口隐藏仅用于拾取/提取，可见区域为底部同款「小窗」全屏，只显示单根构件三角网 */
        document.body.classList.add('embed-element-panel');
        /* 延迟等 DOM 小窗容器就绪后再挂监听 */
        setTimeout(() => {
            attachElementPanelPickListeners();
        }, 300);
    }
    isolateComponentView = params.get('componentIsolate') === '1';
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

// 根据 GlobalId 高亮构件
async function highlightElementByGlobalId(globalId, reason) {
    const row = elementIndex.find(r => r.globalId === globalId);

    if (!row) {
        console.warn(`未找到 GlobalId: ${globalId}`);
        return;
    }

    // 在主视图中高亮选中
    await selectAndShowElement(currentModelID, row.expressID, true);

    // 显示详情弹窗
    showDetailModal(row, reason);

    // 在小窗口中显示该构件的 3D 模型
    await showElementInSmallViewer(row);
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
    modalTitle.textContent = `构件详情 - ${row.name || '未命名'}`;

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
            <span class="detail-label">名称:</span>
            <span class="detail-value">${row.name || '无'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">更多信息:</span>
            <span class="detail-value">请查看下方属性面板</span>
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
    viewerWindowTitle.textContent = row.name
        ? `构件预览 — ${row.name}`
        : `聚焦视图 — ${row.globalId || row.expressID}`;
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
// 10. 构件列表相关函数 (优化版 - 快速类型过滤)
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

    // 从 currentUrl 提取后端文件名
    let backendFilename = null;
    if (currentUrl) {
        try {
            const pathname = currentUrl.startsWith('http') ? new URL(currentUrl).pathname : currentUrl;
            if (pathname.startsWith('/uploads/ifc/')) {
                backendFilename = decodeURIComponent(pathname.replace('/uploads/ifc/', ''));
            }
        } catch {}
    }

    // 优先从 Python API 获取构件编号映射 + 构件列表
    let marksFromApi = {};
    let elementsFromApi = [];
    if (backendFilename) {
        try {
            const apiUrl = '/pyapi/api/ifc/build-index';
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: backendFilename, limit: 8000 })
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.success) {
                    marksFromApi = data.marks || {};
                    elementsFromApi = data.elements || [];
                    console.log(`[buildIndex] 从 Python API 获取 ${Object.keys(marksFromApi).length} 个构件编号, ${elementsFromApi.length} 个构件`);
                }
            }
        } catch (e) {
            console.warn('[buildIndex] Python API 不可用，降级到浏览器解析', e);
        }
    }

    // 同步 marksCache 供其他函数使用
    marksCache = marksFromApi;

    // 从 API 获取 marks 时，同步构建 relDefinesMap 兼容 getComponentMark
    const relDefinesMap = {};
    for (const [expressID, mark] of Object.entries(marksFromApi)) {
        relDefinesMap[Number(expressID)] = [{ name: 'Assembly/Cast unit Mark', value: mark }];
    }

    const getComponentMark = (expressID) => {
        // 优先从浏览器 relDefinesMap（兼容本地 blob 文件）
        const props = relDefinesMap[expressID];
        if (props) {
            const mark = props.find(p => p.name === 'Assembly/Cast unit Mark');
            return mark && mark.value ? mark.value : '';
        }
        return marksFromApi[String(expressID)] || '';
    };

    const ifcAPI = viewer.IFC?.loader?.ifcManager?.ifcAPI;
    if (!ifcAPI) {
        elementsContainer.innerHTML = '<p class="placeholder">构件列表生成失败</p>';
        return;
    }

    // Blob 文件（本地拖拽上传）或 API 失败：从浏览器获取
    if (elementsFromApi.length === 0) {
        await buildElementIndexBrowser(modelID, ifcAPI, relDefinesMap, getComponentMark);
        return;
    }

    // API 成功：从 Python 获取元素列表，浏览器补充几何检查
    elementsContainer.innerHTML = `<p class="placeholder">正在加载详情… 0/${elementsFromApi.length}</p>`;

    const rows = [];
    const concurrency = 100;
    for (let i = 0; i < elementsFromApi.length; i += concurrency) {
        const batch = elementsFromApi.slice(i, i + concurrency);
        const batchRows = await Promise.all(batch.map(async (el) => {
            try {
                const expressID = Number(el.expressID);
                const line = await ifcAPI.GetLine(modelID, expressID, false);
                if (!line || typeof line !== 'object') return null;
                if (!('ObjectPlacement' in line)) return null;
                // IFCELEMENTASSEMBLY 在 Tekla IFC2X3 中无直接 Representation，跳过该检查
                const isAssembly = (el.type || '').toUpperCase() === 'IFCELEMENTASSEMBLY';
                if (!isAssembly) {
                    const representation = unwrapIfcValue(line.Representation);
                    if (representation == null) return null;
                }

                const componentMark = getComponentMark(expressID);
                return {
                    expressID,
                    globalId: el.globalId || '',
                    name: el.name || '',
                    type: el.type || '',
                    componentMark
                };
            } catch {
                return null;
            }
        }));

        for (const r of batchRows) {
            if (r) rows.push(r);
        }

        elementsContainer.innerHTML = `<p class="placeholder">正在加载详情… ${Math.min(i + concurrency, elementsFromApi.length)}/${elementsFromApi.length}</p>`;
        await new Promise(r => setTimeout(r, 0));
    }

    rows.sort((a, b) => {
        const aMark = a.componentMark || '';
        const bMark = b.componentMark || '';
        if (aMark && bMark) return aMark.localeCompare(bMark, undefined, { numeric: true });
        if (aMark) return -1;
        if (bMark) return 1;
        return (a.globalId || '').localeCompare(b.globalId || '');
    });

    elementIndex = rows;
    renderElementsList();
}

// ============================================================
// 浏览器端完整解析（Blob 本地文件 或 Python API 不可用时降级）
// ============================================================
async function buildElementIndexBrowser(modelID, ifcAPI, relDefinesMap, getComponentMark) {
    // 第一步：获取所有产品
    let allProducts = null;
    try {
        allProducts = ifcAPI.GetAllLines(modelID);
    } catch (e) {
        console.error('获取构件列表失败。', e);
        elementsContainer.innerHTML = '<p class="placeholder">构件列表生成失败</p>';
        return;
    }

    const total = allProducts.size();
    const ids = [];
    for (let i = 0; i < total; i++) ids.push(allProducts.get(i));

    elementsContainer.innerHTML = `<p class="placeholder">正在扫描类型… 0/${ids.length}</p>`;

    // 过滤有几何的构件类型
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

    // 获取详细信息
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
                const typeCode = line.type;
                const type = typeof typeCode === 'number' ? (ifcAPI.GetNameFromTypeCode(typeCode) || '') : '';
                const componentMark = getComponentMark(expressID);
                return { expressID, globalId, name, type, componentMark };
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

    rows.sort((a, b) => {
        const aMark = a.componentMark || '';
        const bMark = b.componentMark || '';
        if (aMark && bMark) return aMark.localeCompare(bMark, undefined, { numeric: true });
        if (aMark) return -1;
        if (bMark) return 1;
        return (a.globalId || '').localeCompare(b.globalId || '');
    });

    elementIndex = rows;
    renderElementsList();
}

function getElementLabel(row) {
    const mark = (row.componentMark && String(row.componentMark).trim()) || '';
    const name = (row.name && String(row.name).trim()) || '';
    const typeRaw = row.type ? String(row.type) : '';
    const typeShort = typeRaw.replace(/^Ifc/i, '');
    let gid = row.globalId ? String(row.globalId) : '';
    if (gid.length > 16) gid = `${gid.slice(0, 10)}…`;

    // 优先显示构件编号，如果没有则显示 name
    const displayName = mark || name;
    const parts = [];
    if (displayName) parts.push(displayName);
    if (typeShort) parts.push(typeShort);
    if (gid) parts.push(gid);
    const head = parts.length ? parts.join(' · ') : `构件 #${row.expressID}`;
    return `${head}  (#${row.expressID})`;
}

function emitListCheckboxSelection() {
    const expressIDs = Array.from(checkboxSelectedIds).map(Number).filter((id) => Number.isFinite(id));
    const rows = elementIndex
        .filter((r) => checkboxSelectedIds.has(r.expressID))
        .map((r) => ({
            expressID: r.expressID,
            globalId: r.globalId || '',
            name: r.name || '',
            type: r.type || ''
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
        cb.title = '勾选后可批量指派班组/质检信息';
        cb.addEventListener('click', (e) => e.stopPropagation());
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
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
        ? elementIndex.filter((row) => {
            const label = getElementLabel(row).toLowerCase();
            const mark = (row.componentMark || '').toLowerCase();
            const name = (row.name || '').toLowerCase();
            return label.includes(query) || mark.includes(query) || name.includes(query);
        })
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
    }
    await showElementProperties(modelID, expressID);

    if (!opts.silent && window.parent !== window) {
        const row = elementIndex.find((r) => r.expressID === expressID);
        if (row) {
            postToParent({
                type: 'element-selected',
                expressID: row.expressID,
                globalId: row.globalId || '',
                name: row.name || '',
                type: row.type || ''
            });
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

    const indexArray = geo.index ? geo.index.array : null;
    const faceVertexIndices = [];

    if (indexArray) {
        for (let i = 0; i < indexArray.length; i += 3) {
            const i0 = indexArray[i];
            const i1 = indexArray[i + 1];
            const i2 = indexArray[i + 2];
            if (expressIDAttr.getX(i0) === expressID &&
                expressIDAttr.getX(i1) === expressID &&
                expressIDAttr.getX(i2) === expressID) {
                faceVertexIndices.push(i0, i1, i2);
            }
        }
    } else {
        for (let i = 0; i < expressIDAttr.count; i += 3) {
            if (expressIDAttr.getX(i) === expressID &&
                expressIDAttr.getX(i + 1) === expressID &&
                expressIDAttr.getX(i + 2) === expressID) {
                faceVertexIndices.push(i, i + 1, i + 2);
            }
        }
    }

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

    // 调试：检查 expressIDAttr 的数据分布
    if (typeof expressIDAttr.array !== 'undefined') {
        const uniqueIDs = [...new Set(expressIDAttr.array)].slice(0, 10);
        console.log('buildGreenMesh 调试:', {
            expressIDAttrCount: expressIDAttr.count,
            expressIDAttrItemSize: expressIDAttr.itemSize,
            indexLen: geo.index ? geo.index.count : '无 index',
            totalTris: geo.index ? geo.index.count / 3 : expressIDAttr.count / 3,
            targetExpressID: expressID,
            sampleExpressIDs: uniqueIDs
        });
    }

    // 收集属于该 expressID 的顶点索引
    const indexArray = geo.index ? geo.index.array : null;
    const faceVertexIndices = [];

    if (indexArray) {
        for (let i = 0; i < indexArray.length; i += 3) {
            const i0 = indexArray[i];
            const i1 = indexArray[i + 1];
            const i2 = indexArray[i + 2];
            if (expressIDAttr.getX(i0) === expressID &&
                expressIDAttr.getX(i1) === expressID &&
                expressIDAttr.getX(i2) === expressID) {
                faceVertexIndices.push(i0, i1, i2);
            }
        }
    } else {
        for (let i = 0; i < expressIDAttr.count; i += 3) {
            if (expressIDAttr.getX(i) === expressID &&
                expressIDAttr.getX(i + 1) === expressID &&
                expressIDAttr.getX(i + 2) === expressID) {
                faceVertexIndices.push(i, i + 1, i + 2);
            }
        }
    }

    if (faceVertexIndices.length === 0) {
        // expressIDAttr 可能是按顶点存储（itemSize=1，每个顶点一个 expressID）
        // 这种情况下去重比较复杂，尝试按顶点索引重新匹配
        if (indexArray) {
            faceVertexIndices.length = 0;
            const expressIDByVertex = new Map();
            for (let i = 0; i < expressIDAttr.count; i++) {
                const eid = expressIDAttr.getX(i);
                if (!expressIDByVertex.has(eid)) expressIDByVertex.set(eid, []);
                expressIDByVertex.get(eid).push(i);
            }
            const targetVertices = expressIDByVertex.get(expressID) || [];
            const targetSet = new Set(targetVertices);
            for (let i = 0; i < indexArray.length; i += 3) {
                const i0 = indexArray[i];
                const i1 = indexArray[i + 1];
                const i2 = indexArray[i + 2];
                if (targetSet.has(i0) && targetSet.has(i1) && targetSet.has(i2)) {
                    faceVertexIndices.push(i0, i1, i2);
                }
            }
        }
        if (faceVertexIndices.length === 0) {
            console.warn('buildGreenMesh: 未匹配到任何三角面', { expressID, totalTris: indexArray ? indexArray.length / 3 : expressIDAttr.count / 3, expressIDAttrCount: expressIDAttr.count, indexLen: indexArray ? indexArray.length : 0 });
            return null;
        }
    }
    console.log('buildGreenMesh: 匹配到', faceVertexIndices.length / 3, '个三角面, expressID:', expressID);

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

// 将模型整体设为灰色
function grayOutModel(modelID) {
    if (!modelID) return;
    const model = viewer.context.items.ifcModels.find(m => m.modelID === modelID);
    if (!model) return;
    if (!model.material) return;

    const mats = Array.isArray(model.material) ? model.material : [model.material];
    mats.forEach(mat => {
        if (mat && mat.color) mat.color.set(0x888888);
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

async function safeViewItem(modelID, expressID) {
    const ifcAPI = viewer.IFC?.loader?.ifcManager?.ifcAPI;
    if (!ifcAPI) return;

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
        if (representation == null) return;
    } catch {
        return;
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

    try {
        await viewer.context.ifcCamera.targetItem(last);
    } catch {}
}

async function showElementProperties(modelID, expressID) {
    try {
        const props = await viewer.IFC.getProperties(modelID, expressID, false, false);
        const ifcManager = viewer.IFC?.loader?.ifcManager;

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

        const detailsObject = { ...props, psets, mats, types };
        renderProperties(modelID, expressID, props, detailsObject);
    } catch (e) {
        console.error('获取构件基础属性失败。', e);
        propsContainer.innerHTML = '<p class="placeholder">获取属性失败，请尝试选择其他构件。</p>';
    }
}

function renderProperties(modelID, expressID, props, detailsObject) {
    if (!props) return;

    propsContainer.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'prop-item';
    header.innerHTML = `<span class="prop-key">modelID:</span> ${modelID} <br /><span class="prop-key">expressID:</span> ${expressID}`;
    propsContainer.appendChild(header);

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

// ============================================================
// 14. 启动
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
        await buildElementIndex();

        await tryApplyPendingSelectFromParent();

        postToParent({
            type: 'model-loaded',
            modelID: currentModelID,
            elementCount: elementIndex.length
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
