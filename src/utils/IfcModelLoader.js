/**
 * IfcModelLoader — 封装 web-ifc + Three.js 原生渲染
 *
 * 职责：
 *  1. 初始化 IfcAPI（WASM）
 *  2. 加载 IFC 文件
 *  3. 将 IFC 几何（顶点/索引）提取为 Three.js BufferGeometry
 *  4. 将 expressID 注入顶点属性，供后续拾取映射
 *  5. 管理 WASM 内存（.delete()）
 *
 * 依赖：web-ifc (=^0.0.77), three (=^0.183.2)
 * 约定：IFC 几何为三角形面，无 UV，共用顶点（indexed mesh）
 */

import * as THREE from 'three'
import { IfcAPI } from 'web-ifc'

// IFC 类型常量（与 web-ifc/ifc-schema.d.ts 保持一致）
export const IFC_TYPES = {
  COLUMN:         843113511,
  BEAM:           753842376,
  SLAB:           1529196076,
  WALL:           2391406946,
  WALL_STANDARD:  3512223829,
  DOOR:           395920057,
  DOOR_STANDARD:  3242481149,
  WINDOW:         3304561284,
  WINDOW_STANDARD:486154966,
  ROOF:           2016517767,
  RAMP:           3024970846,
  RAMP_FLIGHT:    3283111854,
  STAIR:          331165859,
  STAIR_FLIGHT:   4252922144,
  BUILDING:       4031249490,
  BUILDING_STOREY:3124254112,
  ELEMENT:        1758889154,
  PROXY:          3219374653,
  BRIDGE:         644574406,
  RAIL:           3290496277,
  ROAD:           146592293,
}

// 常用结构构件类型（与项目构件管理业务强相关）
export const STRUCTURAL_TYPES = new Set([
  IFC_TYPES.COLUMN,
  IFC_TYPES.BEAM,
  IFC_TYPES.SLAB,
  IFC_TYPES.WALL,
  IFC_TYPES.WALL_STANDARD,
  IFC_TYPES.DOOR,
  IFC_TYPES.DOOR_STANDARD,
  IFC_TYPES.WINDOW,
  IFC_TYPES.WINDOW_STANDARD,
  IFC_TYPES.ROOF,
])

// 颜色调色板（从 IFC type 哈希分配，确保同类型构件同色）
const PALETTE = [
  0x42A5F5, // 蓝
  0x66BB6A, // 绿
  0xFFA726, // 橙
  0xAB47BC, // 紫
  0x26C6DA, // 青
  0xEF5350, // 红
  0xFFEE58, // 黄
  0x8D6E63, // 棕
  0x78909C, // 灰蓝
  0xEC407A, // 粉
  0x5C6BC0, // 靛蓝
  0x9CCC65, // 浅绿
]

function typeToColor(typeID) {
  const idx = Math.abs(typeID) % PALETTE.length
  return PALETTE[idx]
}

/**
 * IfcModelLoader — IFC 模型加载器
 */
export class IfcModelLoader {
  /**
   * @param {object} cfg
   * @param {string}  cfg.wasmPath    — web-ifc.wasm 文件目录（末尾不要 /）
   * @param {string}  [cfg.wasmFile='web-ifc.wasm']
   * @param {boolean} [cfg.onlyStructural=true] — 仅加载结构构件
   * @param {THREE.Material|function} [cfg.material] — 自定义材质（函数接收 typeID 返回材质）
   */
  constructor(cfg = {}) {
    this.wasmPath     = cfg.wasmPath || '/wasm'
    this.wasmFile     = cfg.wasmFile || 'web-ifc.wasm'
    this.onlyStructural = cfg.onlyStructural !== false
    this.customMaterialFn = cfg.material || null

    this.api         = new IfcAPI()
    this.modelID     = null   // 当前打开的模型 ID
    this.isReady     = false
    this._meshes     = []     // 加载产生的 THREE.Mesh 列表
  }

  /**
   * 初始化 IfcAPI，加载 WASM
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isReady) return
    // 通知 web-ifc 去哪里找 .wasm
    this.api.SetWasmPath(`${this.wasmPath}/${this.wasmFile}`, false)
    await this.api.Init()
    this.isReady = true
  }

  /**
   * 从 URL 加载 IFC 文件
   * @param {string} url
   * @returns {Promise<THREE.Group>} — 包含所有构件的 Three.js Group
   */
  async loadFromURL(url) {
    await this._ensureReady()

    // 清理旧模型
    this._freeCurrentModel()

    const buffer = await fetch(url).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} loading IFC: ${url}`)
      return r.arrayBuffer()
    })

    // web-ifc 解码（同步）
    this.modelID = this.api.OpenModel(buffer, {
      COORDINATE_TO_ORIGIN: true,
      USE_FAST_BOOL_OPS: false,
    })

    return this._buildGroup()
  }

  /**
   * 从 ArrayBuffer 加载 IFC 文件
   * @param {ArrayBuffer|Uint8Array} buffer
   * @returns {Promise<THREE.Group>}
   */
  async loadFromBuffer(buffer) {
    await this._ensureReady()
    this._freeCurrentModel()

    this.modelID = this.api.OpenModel(buffer, {
      COORDINATE_TO_ORIGIN: true,
      USE_FAST_BOOL_OPS: false,
    })

    return this._buildGroup()
  }

  /**
   * 从已打开的 modelID 构建 Three.js Group
   * @returns {THREE.Group}
   */
  _buildGroup() {
    const group = new THREE.Group()
    group.userData.modelID = this.modelID
    group.userData.ifcLoader = this

    // GetAllElements 时需要排除的类型
    const excludeSet = this.onlyStructural ? STRUCTURAL_TYPES : null

    // 遍历所有 FlatMesh（每个 expressID 一个 FlatMesh）
    const flatMeshes = this.api.LoadAllGeometry(this.modelID)

    for (let i = 0; i < flatMeshes.size(); i++) {
      const flatMesh = flatMeshes.get(i)
      const expressID = flatMesh.expressID

      // 获取 IFC 类型（用于着色）
      const typeID = this._getIFCType(expressID)

      if (this.onlyStructural && !STRUCTURAL_TYPES.has(typeID)) {
        flatMesh.delete()
        continue
      }

      const placedGeoms = flatMesh.geometries
      for (let j = 0; j < placedGeoms.size(); j++) {
        const placedGeom = placedGeoms.get(j)
        const mesh = this._buildMesh(placedGeom, expressID, typeID)
        if (mesh) {
          group.add(mesh)
          this._meshes.push(mesh)
        }
        placedGeom.delete()
      }

      placedGeoms.delete()
      flatMesh.delete()
    }

    flatMeshes.delete()
    return group
  }

  /**
   * 根据 PlacedGeometry 构建单个 THREE.Mesh
   * @param {PlacedGeometry} pg
   * @param {number} expressID
   * @param {number} typeID
   * @returns {THREE.Mesh}
   */
  _buildMesh(pg, expressID, typeID) {
    // 提取几何指针
    const geomPtr = pg.geometryExpressID
    if (!geomPtr) return null

    const geom = this.api.GetGeometry(this.modelID, geomPtr)
    if (!geom) return null

    const vPtr   = geom.GetVertexData()
    const vSize  = geom.GetVertexDataSize()
    const iPtr   = geom.GetIndexData()
    const iSize  = geom.GetIndexDataSize()

    const vertData = this.api.GetVertexArray(vPtr, vSize)
    const indexData = this.api.GetIndexArray(iPtr, iSize)

    // web-ifc 返回的是 Float32Array (vertices) 和 Uint32Array (indices)
    const positions = new Float32Array(vertData)
    const indices   = new Uint32Array(indexData)

    geom.delete()

    // 构建 BufferGeometry
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    // 将 expressID 作为 per-vertex 属性（3个顶点共用同一个 expressID）
    const faceCount = Math.floor(indices.length / 3)
    const expressIDs = new Float32Array(faceCount * 3)
    for (let k = 0; k < faceCount; k++) {
      expressIDs[k * 3 + 0] = expressID
      expressIDs[k * 3 + 1] = expressID
      expressIDs[k * 3 + 2] = expressID
    }
    geometry.setAttribute('expressID', new THREE.BufferAttribute(expressIDs, 1))

    // 面法线（计算一次）
    geometry.computeVertexNormals()
    geometry.setIndex(Array.from(indices))

    // 材质
    let material
    if (this.customMaterialFn) {
      material = this.customMaterialFn(typeID, expressID)
    } else {
      const color = pg.color
      material = new THREE.MeshPhongMaterial({
        color:     new THREE.Color(color.x, color.y, color.z),
        transparent: color.w < 1,
        opacity:   color.w,
        shininess: 30,
        side: THREE.DoubleSide,
      })
    }

    const mesh = new THREE.Mesh(geometry, material)
    mesh.userData.expressID = expressID
    mesh.userData.typeID    = typeID
    mesh.frustumCulled      = false // IFC 构件可能跨域大，先关闭视锥裁剪

    return mesh
  }

  /**
   * 通过 expressID 查询构件属性（名称、类型等）
   * @param {number} expressID
   * @returns {object|null}
   */
  getElementProperties(expressID) {
    try {
      const props = this.api.GetLine(this.modelID, expressID)
      return props || null
    } catch {
      return null
    }
  }

  /**
   * 查询某个 expressID 的 IFC 类型
   * @param {number} expressID
   * @returns {number}
   */
  _getIFCType(expressID) {
    try {
      const line = this.api.GetLine(this.modelID, expressID)
      return (line && line.type) ? line.type : 0
    } catch {
      return 0
    }
  }

  /**
   * 从已选中 Mesh 逆向查找 expressID（用于拾取）
   * @param {THREE.Mesh} mesh
   * @param {THREE.Vector2} uv — 交点局部坐标（可选）
   * @returns {number|null}
   */
  static getExpressID(mesh, uv) {
    if (!mesh || !mesh.geometry) return null

    // 从 per-vertex 属性取（因为每个三角面3个顶点都记录了同一个 expressID）
    const attr = mesh.geometry.getAttribute('expressID')
    if (!attr) return mesh.userData.expressID || null

    // 如果有 UV / face index，可以精确定位；这里取第一个顶点值
    return attr.array[0] || mesh.userData.expressID || null
  }

  async _ensureReady() {
    if (!this.isReady) await this.init()
  }

  /**
   * 释放当前模型的 WASM 内存
   */
  _freeCurrentModel() {
    if (this.modelID !== null) {
      this.api.CloseModel(this.modelID)
      this.modelID = null
    }
    this._meshes.forEach(m => {
      m.geometry.dispose()
      if (Array.isArray(m.material)) {
        m.material.forEach(mat => mat.dispose())
      } else {
        m.material.dispose()
      }
    })
    this._meshes = []
  }

  /**
   * 完整清理（WASM 卸载）
   * 调用此方法后 IfcAPI 将不可用
   */
  destroy() {
    this._freeCurrentModel()
    this.api = null
    this.isReady = false
  }
}
