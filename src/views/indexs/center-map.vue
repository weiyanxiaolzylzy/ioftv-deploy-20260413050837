<!--
 * @Author: daidai
 * @Date: 2022-03-01 11:17:39
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-09-29 15:50:18
 * @FilePath: \web-pc\src\pages\big-screen\view\indexs\center-map.vue
-->
<template>
  <div class="centermap">
    <div class="maptitle">
      <div class="zuo"></div>
      <span class="titletext">{{ maptitle }}</span>
      <div class="you"></div>
    </div>
    <div class="mapwrap">
      <!-- 左上角项目信息 -->
      <div class="project-info-overlay" v-if="activeProject">
        <div class="overlay-badge" v-if="highlightedProject && activeProject.id === highlightedProject.id">
          <span class="badge-star">★</span> 当前项目
        </div>
        <div class="p-row main-info">
          <div class="p-item main-item">
            <div class="info-line info-line--name">
              <span class="info-line__label">项目名称：</span>
              <div class="project-name-marquee" :class="{ 'is-scrolling': shouldScrollProjectName }">
                <div class="p-value large-text project-name-text" :class="{ 'is-scrolling': shouldScrollProjectName }">
                  <span>{{ activeProject.name }}</span>
                  <span v-if="shouldScrollProjectName" class="project-name-text__copy">{{ activeProject.name }}</span>
                </div>
              </div>
            </div>
            <div class="info-line">
              <span class="info-line__label">项目地：</span>
              <span class="p-value large-text info-line__value">{{ projectMapLabel(activeProject) || '-' }}</span>
            </div>
          </div>
        </div>
        <div class="p-row p-row--metrics">
          <div class="p-item">
            <div class="p-label">构件数量</div>
            <div class="p-value num-font">{{ activeProject.beamColumnCount }}</div>
          </div>
          <div class="p-item p-item--right">
            <div class="p-label">已检根数</div>
            <div class="p-value num-font">{{ activeProject.inspectedCount }}</div>
          </div>
        </div>
        <div class="p-row p-row--metrics">
          <div class="p-item">
            <div class="p-label p-label--two-line">
              <span>一次装配</span>
              <span>合格数量</span>
            </div>
            <div class="p-value num-font qualified">{{ activeProject.qualifiedCount }}</div>
          </div>
          <div class="p-item p-item--right">
            <div class="p-label p-label--two-line">
              <span>一次装配</span>
              <span>合格率</span>
            </div>
            <div class="p-value num-font rate">{{ activeProject.qualifiedRate }}</div>
          </div>
        </div>
      </div>

      <dv-border-box-13>
        <div class="quanguo" @click="getData('china')" v-if="code !== 'china'">
          中国
        </div>
        <div class="manage-btn" @click="openManageModal">管理项目</div>

        <Echart id="CenterMap" :options="options" ref="CenterMap" />
      </dv-border-box-13>

      <!-- 项目管理弹窗 -->
      <div v-if="showManageModal" class="project-modal">
        <div class="modal-content modal-content--manage">
          <div class="modal-header">
            <h3>项目列表管理</h3>
            <div class="header-actions">
              <button class="btn-add-project-header" @click="openAddProject">+ 添加项目</button>
              <span class="close-icon" @click="closeManageModal">×</span>
            </div>
          </div>
          <div class="modal-body manage-body">
            <div v-if="projects.length === 0" class="empty-tip">暂无项目</div>
            <div v-for="p in projects" :key="p.id" class="project-block" :class="{ 'is-active': activeProjectId === p.id }">
              <div class="project-row" @click="toggleProjectExpand(p.id)">
                <div class="project-row-left">
                  <span class="expand-icon" :class="{ expanded: expandedProjectId === p.id }">▶</span>
                  <span class="project-name">{{ p.name }}</span>
                  <span class="project-city">{{ p.province }}{{ p.city }}</span>
                  <span class="project-rate">{{ p.qualifiedRate }}</span>
                </div>
                <div class="project-row-right">
                  <span class="tag-active" v-if="activeProjectId === p.id">当前</span>
                  <button class="btn-set-active" @click.stop="setActiveProject(p)" :disabled="activeProjectId === p.id">设为当前</button>
                  <button class="btn-delete-project" @click.stop="deleteProject(p.id)">删除</button>
                </div>
              </div>
              <div v-if="expandedProjectId === p.id" class="components-panel">
                <div class="components-toolbar">
                  <button
                    class="btn-ifc-settings"
                    @click="openIfcViewer(p)"
                    title="打开项目构件管理：上传/绑定 IFC、三维选构件、批量指派"
                  >
                    项目构件管理
                  </button>
                  <button
                    class="btn-clear-project-data"
                    @click="clearProjectComponents(p)"
                    title="清除当前项目的构件、班组指派、计划日期和检测状态数据，保留项目与 IFC 文件"
                  >
                    清除当前项目数据
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- IFC 导入构件弹窗 -->
      <div v-if="showIfcImportModal" class="project-modal" @click.self="closeIfcImportModal">
        <div class="modal-content ifc-import-modal">
          <div class="modal-header">
            <h3>导入 IFC 构件 — {{ ifcImportProject ? ifcImportProject.name : '' }}</h3>
            <span class="close-icon" @click="closeIfcImportModal">×</span>
          </div>
          <div class="modal-body ifc-import-body">
            <div class="ifc-import-toolbar">
              <div class="toolbar-left">
                <label class="check-all">
                  <input type="checkbox"
                    :checked="ifcImportSelectedIds.length > 0 && ifcImportSelectedIds.length === filteredIfcImportElements.length"
                    @change="toggleIfcImportSelectAll($event.target.checked)" />
                  全选
                </label>
                <select v-model="ifcImportType" class="ifc-import-select">
                  <option value="">全部类型</option>
                  <option v-for="t in ifcImportTypes" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="toolbar-right">
                <input v-model="ifcImportSearch" class="ifc-import-search" placeholder="搜索：名称 / 类型 / GlobalId" />
                <div class="ifc-import-count">已选 {{ ifcImportSelectedIds.length }} / {{ filteredIfcImportElements.length }}</div>
              </div>
            </div>

            <div v-if="projectIfcImportError" class="ifc-import-error">{{ projectIfcImportError }}</div>

            <div class="ifc-import-table-wrap">
              <table class="ifc-import-table">
                <thead>
                  <tr>
                    <th width="34"></th>
                    <th width="130">类型</th>
                    <th>构件名称</th>
                    <th width="220">GlobalId</th>
                    <th width="90">ExpressID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="el in filteredIfcImportElements" :key="el.expressID" :class="{ selected: isIfcImportSelected(el.expressID) }">
                    <td>
                      <input type="checkbox" :checked="isIfcImportSelected(el.expressID)" @change="toggleIfcImportSelected(el.expressID)" />
                    </td>
                    <td class="mono">{{ el.type }}</td>
                    <td>{{ el.name }}</td>
                    <td class="mono">{{ el.globalId }}</td>
                    <td class="mono">{{ el.expressID }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="filteredIfcImportElements.length === 0" class="empty-components">暂无可导入构件</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="closeIfcImportModal">取消</button>
            <button class="save-btn" @click="confirmIfcImport" :disabled="ifcImportSelectedIds.length === 0">导入选中</button>
          </div>
        </div>
      </div>

      <!-- 添加项目弹窗（省市选择 + 名称；IFC 在独立查看器中处理） -->
      <div v-if="showProjectModal" class="add-project-overlay" @click.self="showProjectModal = false">
        <div class="modal-content add-project-modal">
          <div class="modal-header">
            <h3>添加新项目</h3>
            <span class="close-icon" @click="showProjectModal = false">×</span>
          </div>
          <div class="modal-body">
            <!-- 基本信息 -->
            <div class="form-row-2">
              <div class="form-item">
                <label>所在省/市 *</label>
                <select v-model="addForm.province" class="form-select" @change="onProvinceChange">
                  <option value="">请选择省份</option>
                  <option v-for="p in provinceList" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div class="form-item">
                <label>项目名称 *</label>
                <input type="text" v-model="addForm.name" class="form-input" placeholder="输入项目名称" />
              </div>
            </div>
            <div class="form-item">
              <label>城市</label>
              <select v-model="addForm.city" class="form-select" :disabled="!addForm.province">
                <option value="">请选择城市</option>
                <option v-for="c in cityList" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>

            <!-- IFC 上传 -->
            <div class="form-item ifc-upload-item">
              <label>IFC 模型文件 <span class="label-hint">（上传后自动跳转至 IFC 查看器）</span></label>
              <div class="ifc-upload-row">
                <input type="text" v-model="addForm.ifcFileName" class="form-input" placeholder="选择 .ifc 文件" readonly />
                <button class="btn-upload-ifc" @click="triggerAddProjectIfc" :disabled="uploadingIfc || parsingIfc">
                  {{ uploadingIfc ? '上传中...' : '选择IFC文件' }}
                </button>
              </div>
              <div v-if="uploadingIfc" class="upload-progress">
                <div class="progress-bar"><div class="progress-fill"></div></div>
                <span>上传中，请稍候...</span>
              </div>
              <div v-if="parsingIfc" class="upload-progress parsing">
                <div class="progress-bar"><div class="progress-fill parsing-fill"></div></div>
                <span>正在解析 IFC 构件...</span>
              </div>
              <div v-if="!uploadingIfc && !parsingIfc && addForm.ifcParsedCount > 0" class="upload-progress success">
                ✅ 已识别 <strong>{{ addForm.ifcParsedCount }}</strong> 个构件
              </div>
              <div v-if="ifcUploadError" class="upload-error">{{ ifcUploadError }}</div>
              <div v-if="ifcParseError" class="upload-error">{{ ifcParseError }}</div>
              <div v-if="addForm.ifcUrl && !uploadingIfc && !parsingIfc" class="upload-progress success">
                <button type="button" class="btn-open-ifc-viewer" @click="openIfcViewerWithUpload">
                  🚀 跳转至 IFC 查看器
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer add-project-footer">
            <button class="cancel-btn" @click="showProjectModal = false">取消</button>
            <button class="ifc-viewer-link-btn" @click="openStandaloneIfcViewer">
              打开 IFC 查看器
            </button>
            <button class="save-btn" @click="confirmAddProject" :disabled="!addForm.name || !addForm.province">
              添加项目
            </button>
          </div>
        </div>
      </div>
      <!-- IFC 文件选择（已有项目：导入构件列表） -->
      <input type="file" ref="ifcImportInput" accept=".ifc" style="display:none" @change="handleProjectIfcFileChange" />
      <input type="file" ref="addProjectIfcInput" accept=".ifc" style="display:none" @change="handleAddProjectIfcChange" />
    </div>
  </div>
</template>

<script>
import xzqCode from "../../utils/map/xzqCode";
import chinaCity from "../../utils/map/chinaCity";
import { getAuthHeaders } from "../../utils/index.js";
import { currentGET } from "api/modules";
import * as echarts from "echarts";
import { GETNOBASE } from "api";
export default {
  data() {
    return {
      maptitle: "构件供给图",
      options: {},
      code: "china", //china 代表中国 其他地市是行政编码
      echartBindClick: false,
      echartBindClickTimer: null,
      isSouthChinaSea: false, //是否要展示南海群岛  修改此值请刷新页面
      projects: [],
      cityCenter: {},
      activeProjectId: null,
      showManageModal: false,
      activeProject: null,
      showProjectModal: false,
      uploadingIfc: false,
      parsingIfc: false,
      ifcUploadError: '',
      ifcParseError: '',
      // 新建项目表单
      addForm: {
        province: '',
        city: '',
        name: '',
        ifcUrl: '',
        ifcFileName: '',
        ifcParsedCount: 0,
      },
      expandedProjectId: null,
      selectedComponentIds: {},
      newProjectIfcComponents: [],
      showIfcImportModal: false,
      ifcImportProject: null,
      ifcImportElements: [],
      ifcImportSelectedIds: [],
      ifcImportSearch: '',
      ifcImportType: '',
      importingProjectIfc: false,
      projectIfcImportError: '',
      highlightedProject: null,
      // 中国地图（省级）名称 → 中心点，用于在任意子省地图下仍能正确定位项目省
      chinaProvinceCenters: {},
      // 省份城市数据（从 chinaCity.js 提取）
      provinceList: [],
      cityMap: {},
    };
  },
  computed: {
    filteredIfcImportElements() {
      const list = this.ifcImportElements || [];
      const q = (this.ifcImportSearch || '').trim().toLowerCase();
      const t = (this.ifcImportType || '').trim();
      return list.filter((el) => {
        if (t && el.type !== t) return false;
        if (!q) return true;
        const hay = `${el.name || ''} ${el.type || ''} ${el.globalId || ''} ${el.expressID || ''}`.toLowerCase();
        return hay.includes(q);
      });
    },
    ifcImportTypes() {
      const set = new Set((this.ifcImportElements || []).map((e) => e.type).filter(Boolean));
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
    cityList() {
      if (!this.addForm.province) return [];
      const cities = this.cityMap[this.addForm.province] || [];
      return cities;
    },
    shouldScrollProjectName() {
      const name = this.activeProject && this.activeProject.name ? String(this.activeProject.name) : '';
      return name.length > 12;
    },
  },
  created() {
    // 初始化省份列表
    this.cityMap = chinaCity;
    this.provinceList = Object.keys(chinaCity).sort();
  },

  mounted() {
    // console.log(xzqCode);
    this.fetchProjects();
    this.getData("china");
    // 监听主题切换事件
    window.addEventListener('themeChange', this.handleThemeChange);
    // 启动轮播
    this.startCarousel();
    // 监听当前检测构件变更，地图上对应项目闪烁
    if (this.$bus) {
      this.$bus.$on('component-ifc-sync', this.onComponentIfcSync);
      this.$bus.$on('navigate-to-project', this.onNavigateToProject);
    }
  },
  beforeDestroy() {
    // 移除主题切换监听
    window.removeEventListener('themeChange', this.handleThemeChange);
    this.stopCarousel();
    if (this.$bus) {
      this.$bus.$off('component-ifc-sync', this.onComponentIfcSync);
      this.$bus.$off('navigate-to-project', this.onNavigateToProject);
    }
  },
  watch: {
    // 监听当前项目变化，自动更新地图高亮
    activeProject: {
      handler(newVal) {
        this.highlightedProject = newVal;
        // 当项目切换时重新渲染地图高亮效果
        if (this.projects.length > 0) {
          this.$nextTick(() => {
            this.refreshMapHighlight();
          });
        }
      },
      deep: true
    }
  },
  methods: {
    handleThemeChange() {
      // 主题切换时重新渲染
      this.getData(this.code);
    },

    // ─── IFC 查看器当前检测构件变更 → 高亮地图对应项目 ─────────────────────────
    async onComponentIfcSync(payload) {
      if (!payload) return;
      // 找到与该 IFC URL 关联的项目
      const ifcUrl = payload.ifcUrl || (payload.project && payload.project.ifcUrl);
      let targetProject = null;
      if (ifcUrl) {
        targetProject = this.projects.find(p => p.ifcUrl === ifcUrl);
      }
      // 如果没找到，尝试用 projectId
      if (!targetProject && payload.projectId) {
        targetProject = this.projects.find(p => p.id === payload.projectId);
      }
      // 如果还没有，用当前 active 项目
      if (!targetProject) {
        targetProject = this.activeProject;
      }
      if (!targetProject) return;

      // 如果该项目不在当前视口（切换到其他省份），先切换到中国视图
      if (this.code !== 'china') {
        this.getData('china');
        await new Promise(r => setTimeout(r, 800)); // 等待地图切换完成
      }

      this.activeProjectId = targetProject.id;
      this.activeProject = targetProject;
      this.highlightedProject = targetProject;

      // 立即触发地图高亮
      this.$nextTick(() => {
        this.refreshMapHighlight();
      });
    },

    // ─── 从检测计划列表点击跳转 ───────────────────────────────────────────────
    async onNavigateToProject(payload) {
      if (!payload) return;
      // 如果项目列表为空，先获取
      if (!this.projects || this.projects.length === 0) {
        await this.fetchProjects();
      }
      if (payload.projectId) {
        const proj = this.projects.find(p => p.id === payload.projectId);
        if (proj) {
          this.activeProjectId = proj.id;
          this.activeProject = proj;
          this.highlightedProject = proj;
          // 如果不在中国视图，先切回去
          if (this.code !== 'china') {
            this.getData('china');
            await new Promise(r => setTimeout(r, 600));
          }
          this.$nextTick(() => {
            this.refreshMapHighlight();
          });
        }
      }
    },

    /** 地图上显示的省市文案，如「山西太原」 */
    projectMapLabel(project) {
      if (!project) return ''
      const stripProv = (s) => {
        if (!s || typeof s !== 'string') return ''
        return s
          .trim()
          .replace(/壮族自治区$|回族自治区$|维吾尔自治区$|自治区$|特别行政区$/g, '')
          .replace(/省$/g, '')
          .replace(/市$/g, '')
      }
      const stripCity = (s) => {
        if (!s || typeof s !== 'string') return ''
        return s.trim().replace(/市$/g, '').replace(/地区$|盟$/g, '')
      }
      const pv = stripProv(project.province || '')
      const cv = stripCity(project.city || '')
      if (pv && cv) return pv + cv
      if (pv) return pv + (project.city ? stripCity(project.city) : '')
      if (cv) return cv
      return project.name ? String(project.name) : ''
    },
    /** 在指定名称列表中解析省份/行政区标准名（用于地图 region 或坐标查找） */
    resolveProvinceRegionNameFromKeys(province, keys) {
      if (!province || typeof province !== 'string' || !keys || keys.length === 0) return null
      const p = province.trim()
      if (keys.includes(p)) return p
      const base = p.replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市$/g, '')
      if (keys.includes(base)) return base
      const found = keys.find((k) => {
        const kb = k.replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市$/g, '')
        return kb === base || k.startsWith(base) || base.startsWith(kb)
      })
      if (found) return found
      if (!p.endsWith('省') && !p.endsWith('市') && !p.endsWith('区')) {
        const tryProv = p + '省'
        if (keys.includes(tryProv)) return tryProv
      }
      const tryCity = p + '市'
      if (keys.includes(tryCity)) return tryCity
      const containsMatch = keys.find((k) => k.includes(p) || p.includes(k.replace(/省|市|自治区|特别行政区$/g, '')))
      return containsMatch || null
    },
    /** 将中国地图 GeoJSON 中的省级名称与项目里的 province 字段对齐 */
    resolveProvinceRegionName(province) {
      if (!province || typeof province !== 'string') return null
      const keys = Object.keys(this.cityCenter || {})
      if (keys.length === 0) return null
      return this.resolveProvinceRegionNameFromKeys(province, keys)
    },
    /**
     * 统一解析项目在地图上的经纬度：优先当前图的城市/省，再用全国省中心缓存，最后才用存盘的 center
     * （避免在子省地图下用错误 cityCenter 解析出酒泉等错位坐标）
     */
    resolveCoordsForProject(project) {
      if (!project) return null
      const cc = this.cityCenter || {}
      const cityRaw = (project.city || '').trim()
      const variants = []
      if (cityRaw) {
        variants.push(cityRaw)
        if (!/市$|州$|县$|区$|盟$/.test(cityRaw)) variants.push(cityRaw + '市')
        variants.push(cityRaw.replace(/市$/u, ''))
      }
      for (const v of variants) {
        if (v && cc[v]) return cc[v]
      }
      if (cityRaw) {
        const hit = Object.keys(cc).find(
          (k) => k === cityRaw || k.includes(cityRaw) || cityRaw.includes(k.replace(/市$/u, ''))
        )
        if (hit) return cc[hit]
      }
      const pn = this.resolveProvinceRegionName(project.province)
      if (pn && cc[pn]) return cc[pn]
      const cache = this.chinaProvinceCenters || {}
      const cKeys = Object.keys(cache)
      if (cKeys.length && project.province) {
        const geoName = this.resolveProvinceRegionNameFromKeys(project.province, cKeys)
        if (geoName && cache[geoName]) return cache[geoName]
      }
      if (project.center && Array.isArray(project.center) && project.center.length >= 2) {
        return project.center
      }
      return null
    },
    /** 仅在中国全图时做省级填色高亮；子省地图下 keys 为地级市，避免误匹配 */
    getProvinceHighlightRegions(isLightTheme) {
      if (this.code !== 'china') return []
      const hasProject = this.activeProject && this.activeProject.province
      if (!hasProject) return []
      const regionName = this.resolveProvinceRegionName(this.activeProject.province)
      if (!regionName) return []
      return [
        {
          name: regionName,
          itemStyle: {
            areaColor: isLightTheme ? 'rgba(74, 144, 226, 0.55)' : 'rgba(147, 235, 248, 0.45)',
            borderColor: isLightTheme ? '#2a62ad' : '#00fdfa',
            borderWidth: 2,
            shadowColor: isLightTheme ? 'rgba(74, 144, 226, 0.75)' : 'rgba(0, 253, 250, 0.75)',
            shadowBlur: 15,
          },
        },
      ]
    },
    getData(code) {
      currentGET("big8", { regionCode: code }).then((res) => {
        if (res.success) {
          this.getGeojson(res.data.regionCode, res.data.dataList);
          this.mapclick();
        } else {
          this.$Message.warning(res.msg);
        }
      });
    },
    /**
     * @description: 获取geojson
     * @param {*} name china 表示中国 其他省份行政区编码
     * @param {*} mydata 接口返回列表数据
     * @return {*}
     */
    async getGeojson(name, mydata) {
      this.code = name;
      //如果要展示南海群岛并且展示的是中国的话
      let geoname = name;
      if (this.isSouthChinaSea && name == "china") {
        geoname = "chinaNanhai";
      }
      //如果有注册地图的话就不用再注册 了
      let mapjson = echarts.getMap(name);
      if (mapjson && mapjson.geoJSON && mapjson.geoJSON.features) {
        mapjson = mapjson.geoJSON;
      } else {
        const res = await GETNOBASE(`./map-geojson/${geoname}.json`);
        if (res && res.features) {
          mapjson = res;
          echarts.registerMap(name, mapjson);
        } else {
          console.warn('[center-map] geojson load failed:', res);
          return;
        }
      }
      let cityCenter = {};
      let arr = mapjson.features;
      if (!arr) return;
      //根据geojson获取省份中心点
      arr.map((item) => {
        cityCenter[item.properties.name] =
          item.properties.centroid || item.properties.center;
      });
      this.cityCenter = cityCenter;
      if (name === 'china') {
        this.chinaProvinceCenters = { ...cityCenter };
      }

      const activeId = this.activeProject && this.activeProject.id;
      let newData = [];
      // ── 普通项目：非当前项目，避免与「当前项目高亮」重复标签 ────────────────
      this.projects.forEach((p) => {
        if (activeId != null && String(p.id) === String(activeId)) return;
        const pos = this.resolveCoordsForProject(p);
        if (!pos) return;
        newData.push({
          name: this.projectMapLabel(p),
          value: pos.concat(100),
          projectId: p.id,
        });
      });
      if (newData.length === 0) {
        mydata.forEach((item) => {
          if (cityCenter[item.name]) {
            for (let i = 0; i < 3; i++) {
              newData.push({
                name: item.name,
                value: cityCenter[item.name].concat(item.value + i * 10),
              });
            }
          }
        });
      }

      let highlightData = [];
      const ap = this.activeProject;
      if (ap && ap.province) {
        const hlPos = this.resolveCoordsForProject(ap);
        if (hlPos) {
          for (let i = 0; i < 8; i++) {
            highlightData.push({
              name: ap.province,
              value: [hlPos[0], hlPos[1], 100 + i * 15],
              projectId: ap.id,
            });
          }
        }
      }

      this.init(name, mydata, newData, highlightData);
    },
    init(name, data, data2, highlightData) {
      let top = 45;
      let zoom = 1.05;

      // 根据主题模式动态设置颜色
      const isLightTheme = localStorage.getItem('themeMode') === 'light';
      const mapBorderColor = isLightTheme ? "#4a90e2" : "rgba(147, 235, 248, .8)";
      const mapAreaColorStart = isLightTheme ? "rgba(74, 144, 226, 0.1)" : "rgba(147, 235, 248, 0)";
      const mapAreaColorEnd = isLightTheme ? "rgba(74, 144, 226, 0.4)" : "rgba(147, 235, 248, .2)";
      const textColor = isLightTheme ? "#000000" : "#FFF";
      const tooltipBgColor = isLightTheme ? "rgba(255,255,255,.9)" : "rgba(0,0,0,.6)";
      const tooltipBorderColor = isLightTheme ? "#4a90e2" : "rgba(147, 235, 248, .8)";
      const tooltipTextColor = isLightTheme ? "#000000" : "#FFF";

      // 普通项目：保持原有配色
      const normalColor = isLightTheme ? "#4a90e2" : "rgba(255,255,255,1)";

      // highlightData（参考原始逻辑）是外部传入的，格式为：
      // [{ name: '山西省', value: [lng, lat, weight], projectId: 'xxx' }, ...]
      // 每个当前项目对应 8 个涟漪点，形成醒目高亮

      let option = {
        backgroundColor: "rgba(0,0,0,0)",
        tooltip: {
          show: false,
        },
        legend: {
          show: false,
        },

        geo: {
          map: name,
          roam: false,
          selectedMode: false, //是否允许选中多个区域
          zoom: zoom,
          top: top,
          // aspectScale: 0.78,
          show: false,
        },
        series: [
          {
            name: "MAP",
            type: "map",
            map: name,
            // aspectScale: 0.78,
            data: data,
            // data: [1,100],
            selectedMode: false, //是否允许选中多个区域
            zoom: zoom,
            geoIndex: 1,
            top: top,
            tooltip: { show: false },
            label: {
              show: false,
              color: "#000",
              formatter: function (val) {
                if (val.data !== undefined) {
                  return val.name;
                } else {
                  return "";
                }
              },
              rich: {},
            },
            emphasis: {
              label: {
                show: false,
              },
              itemStyle: {
                areaColor: isLightTheme ? "#4a90e2" : "#389BB7",
                borderWidth: 1,
              },
            },
            itemStyle: {
              borderColor: mapBorderColor,
              borderWidth: 1,
              areaColor: {
                type: "radial",
                x: 0.5,
                y: 0.5,
                r: 0.8,
                colorStops: [
                  {
                    offset: 0,
                    color: mapAreaColorStart, // 0% 处的颜色
                  },
                  {
                    offset: 1,
                    color: mapAreaColorEnd, // 100% 处的颜色
                  },
                ],
                globalCoord: false, // 缺为 false
              },
              shadowColor: isLightTheme ? "rgba(74, 144, 226, .3)" : "rgba(128, 217, 248, .3)",
              shadowOffsetX: -2,
              shadowOffsetY: 2,
              shadowBlur: 10,
            },
            // 按当前项目 province 高亮对应省级区域（如山西省、内蒙古自治区）
            regions: this.getProvinceHighlightRegions(isLightTheme),
          },
          // ── 普通项目散点（白色小点 + 省市名称）───────────────────────────────
          {
            name: "普通项目",
            data: data2,
            type: "effectScatter",
            coordinateSystem: "geo",
            symbolSize: 6,
            showEffectOn: "render",
            rippleEffect: {
              scale: 6,
              color: "rgba(255,255,255, 1)",
              brushType: "fill",
            },
            itemStyle: {
              color: "rgba(255,255,255,1)",
              shadowBlur: 10,
            },
            tooltip: { show: false },
            label: {
              formatter: (param) => param.name,
              fontSize: 11,
              offset: [0, 2],
              position: "bottom",
              textBorderColor: isLightTheme ? "#fff" : "#fff",
              textShadowColor: isLightTheme ? "rgba(0,0,0,0)" : "#000",
              textShadowBlur: 10,
              textBorderWidth: 0,
              color: textColor,
              show: true,
            },
          },
          // ── 当前项目高亮涟漪（橙色，参考原始逻辑）──────────────────────────
          // 多个点，weight 不同，形成扩散涟漪效果
          ...(highlightData && highlightData.length > 0 ? [{
            name: "当前项目高亮",
            data: highlightData,
            type: "effectScatter",
            coordinateSystem: "geo",
            symbolSize: 12,
            showEffectOn: "render",
            rippleEffect: {
              brushType: "stroke",
              scale: 3,
              period: 4,
            },
            label: {
              formatter: (param) => {
                const proj = this.activeProject;
                return proj ? this.projectMapLabel(proj) : '项目地';
              },
              fontSize: 13,
              fontWeight: "bold",
              offset: [12, 0],
              position: "right",
              backgroundColor: isLightTheme ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)",
              padding: [4, 8, 4, 8],
              borderRadius: 4,
              borderColor: "#FFA500",
              borderWidth: 1.5,
              textBorderColor: "transparent",
              textBorderWidth: 0,
              color: "#FFA500",
              show: true,
            },
            tooltip: { show: false },
            itemStyle: {
              color: "#FFCC00",
              borderColor: "#FFEE80",
              borderWidth: 2,
              shadowColor: "rgba(255,180,0,0.8)",
              shadowBlur: 12,
            },
            z: 100,
          }] : []),
        ],
      };

      this.options = option;
      this.$nextTick(() => {
        if (this.$refs.CenterMap && this.$refs.CenterMap.chart) {
          this.$refs.CenterMap.chart.resize();
        }
      });

      // 如果有高亮项目且有坐标，不再使用 geoRoam 导致地图飘走，而是保持地图稳定，仅显示高亮动画
      // if (hasActiveProject) {
      //   this.$nextTick(() => {
      //     this.flyToProject(this.activeProject);
      //   });
      // }
    },

    // ── 自动轮播逻辑 ─────────────────────────────────────────
    startCarousel() {
      this.stopCarousel();
      // 如果没有项目或只有一个项目，不需要轮播
      if (this.projects.length <= 1) return;
      
      this.carouselTimer = setInterval(() => {
        const currentIndex = this.projects.findIndex(p => this.activeProject && p.id === this.activeProject.id);
        const nextIndex = (currentIndex + 1) % this.projects.length;
        const nextProject = this.projects[nextIndex];
        
        this.activeProjectId = nextProject.id;
        this.activeProject = nextProject;
        this.highlightedProject = nextProject;
        
        // 不需要保存到 localStorage，避免污染用户手动选择的状态
        // 刷新地图
        this.$nextTick(() => {
          this.refreshMapHighlight();
          this.flyToProject(nextProject);
        });
      }, 5000); // 每5秒轮播一次
    },
    stopCarousel() {
      if (this.carouselTimer) {
        clearInterval(this.carouselTimer);
        this.carouselTimer = null;
      }
    },
    refreshMapHighlight() {
      if (!this.$refs.CenterMap || !this.$refs.CenterMap.chart) return;
      const chart = this.$refs.CenterMap.chart;
      if (!chart || (chart.isDisposed && chart.isDisposed())) return;

      const opt = chart.getOption ? chart.getOption() : null;
      const seriesOpt = opt && Array.isArray(opt.series) ? opt.series : null;
      if (!seriesOpt || seriesOpt.length < 2) return;

      const mapSeries = seriesOpt[0] || null;
      const mapNameRaw = mapSeries && mapSeries.map != null ? mapSeries.map : (this.code || '');
      const mapName = Array.isArray(mapNameRaw) ? mapNameRaw[0] : mapNameRaw;
      if (!mapName || !echarts.getMap(mapName)) return;

      const isLightTheme = localStorage.getItem('themeMode') === 'light';
      const textColor2 = isLightTheme ? "#000000" : "#FFF";

      if (this._refreshMapHighlightTimer) clearTimeout(this._refreshMapHighlightTimer);
      this._refreshMapHighlightTimer = setTimeout(() => {
        if (!this.$refs.CenterMap || !this.$refs.CenterMap.chart) return;
        const c = this.$refs.CenterMap.chart;
        if (!c || (c.isDisposed && c.isDisposed())) return;

        const activeId = this.activeProject && this.activeProject.id;
        const scatterOthers = [];
        this.projects.forEach((p) => {
          if (activeId != null && String(p.id) === String(activeId)) return;
          const pos = this.resolveCoordsForProject(p);
          if (!pos) return;
          scatterOthers.push({
            name: this.projectMapLabel(p),
            value: pos.concat(100),
            projectId: p.id,
          });
        });

        let refreshHighlightData = [];
        const ap = this.activeProject;
        if (ap && ap.province) {
          const hlPos = this.resolveCoordsForProject(ap);
          if (hlPos) {
            for (let i = 0; i < 8; i++) {
              refreshHighlightData.push({
                name: ap.province,
                value: [hlPos[0], hlPos[1], 100 + i * 15],
                projectId: ap.id,
              });
            }
          }
        }

        c.setOption({
          series: [
            {
              name: "MAP",
              type: "map",
              map: mapName,
              regions: this.getProvinceHighlightRegions(isLightTheme),
            },
            {
              name: "普通项目",
              type: "effectScatter",
              data: scatterOthers,
              symbolSize: 6,
              showEffectOn: "render",
              rippleEffect: {
                scale: 6,
                color: "rgba(255,255,255, 1)",
                brushType: "fill",
              },
              itemStyle: {
                color: "rgba(255,255,255,1)",
                shadowBlur: 10,
              },
              tooltip: { show: false },
              label: {
                formatter: (param) => param.name,
                fontSize: 11,
                offset: [0, 2],
                position: "bottom",
                textBorderColor: isLightTheme ? "#fff" : "#fff",
                textShadowColor: isLightTheme ? "rgba(0,0,0,0)" : "#000",
                textShadowBlur: 10,
                textBorderWidth: 0,
                color: textColor2,
                show: true,
              },
            },
            ...(refreshHighlightData.length > 0 ? [{
              name: "当前项目高亮",
              type: "effectScatter",
              data: refreshHighlightData,
              coordinateSystem: "geo",
              symbolSize: 12,
              showEffectOn: "render",
              rippleEffect: {
                brushType: "stroke",
                scale: 3,
                period: 4,
              },
              label: {
                formatter: () => {
                  const proj = this.activeProject;
                  return proj ? this.projectMapLabel(proj) : '项目地';
                },
                fontSize: 13,
                fontWeight: "bold",
                offset: [12, 0],
                position: "right",
                backgroundColor: isLightTheme ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)",
                padding: [4, 8, 4, 8],
                borderRadius: 4,
                borderColor: "#FFA500",
                borderWidth: 1.5,
                textBorderColor: "transparent",
                textBorderWidth: 0,
                color: "#FFA500",
                show: true,
              },
              tooltip: { show: false },
              itemStyle: {
                color: "#FFCC00",
                borderColor: "#FFEE80",
                borderWidth: 2,
                shadowColor: "rgba(255,180,0,0.8)",
                shadowBlur: 12,
              },
              z: 100,
            }] : []),
          ],
        });
      }, 0);
    },

    // ── 飞向项目位置（已废弃，防止地图飘走） ─────────────────────────────────────────────
    flyToProject(project) {
      // 保持地图原样，不再执行缩放和平移操作，解决地图飘走的问题
      return;
      /*
      if (!project || !project.center || !this.$refs.CenterMap || !this.$refs.CenterMap.chart) return;
      const chart = this.$refs.CenterMap.chart;
      chart.dispatchAction({
        type: 'geoRoam',
        name: project.name,
        zoom: 3,
        center: project.center,
      });
      */
    },
    // ── 项目管理方法 ─────────────────────────────────
    // ── localStorage 存储方法（无需后端） ──────────────
    _save() {
      localStorage.setItem('cm_projects', JSON.stringify(this.projects));
      localStorage.setItem('cm_activeId', this.activeProjectId || '');
      if (this.$bus) {
        this.$bus.$emit('project-list-update', this.projects);
        this.$bus.$emit('project-change', this.activeProject);
        this.$bus.$emit('project-ifc-change', (this.activeProject && this.activeProject.ifcUrl) ? this.activeProject.ifcUrl : '');
      }
    },
    _load() {
      this.projects = [];
      this.activeProjectId = null;
      this.activeProject = null;
      this.highlightedProject = null;
      if (this.$bus) {
        this.$bus.$emit('project-list-update', this.projects);
        this.$bus.$emit('project-change', this.activeProject);
        this.$bus.$emit('project-ifc-change', (this.activeProject && this.activeProject.ifcUrl) ? this.activeProject.ifcUrl : '');
      }
      this.getData(this.code);
    },
    async fetchProjects() {
      try {
        const res = await fetch('/api/projects', { headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.success && Array.isArray(data.data)) {
          this.projects = data.data;
          this.activeProjectId = data.activeProjectId || (this.projects[0] ? this.projects[0].id : null);
          this.activeProject = this.activeProjectId
            ? (this.projects.find((project) => String(project.id) === String(this.activeProjectId)) || null)
            : (this.projects[0] || null);
          this.highlightedProject = this.activeProject;
          this._save();
          this.getData(this.code);
          return;
        }
      } catch (e) { /* ignore */ }
      this._load();
    },
    openManageModal() {
      this.fetchProjects();
      this.showManageModal = true;
    },
    closeManageModal() {
      this.showManageModal = false;
      this.expandedProjectId = null;
      this.selectedComponentIds = {};
    },
    // 打开添加项目弹窗（从管理面板触发）
    openAddProject() {
      this.addForm = {
        province: '',
        city: '',
        name: '',
        ifcUrl: '',
        ifcFileName: '',
        ifcParsedCount: 0,
      };
      this.uploadingIfc = false;
      this.parsingIfc = false;
      this.ifcUploadError = '';
      this.ifcParseError = '';
      this.newProjectIfcComponents = [];
      this.showProjectModal = true;
    },
    triggerAddProjectIfc() {
      this.$refs.addProjectIfcInput.click();
    },
    async _pollIfcParseJob(jobId, timeoutMs = 10 * 60 * 1000, intervalMs = 2000) {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        const res = await fetch(`/api/upload-ifc-status/${encodeURIComponent(jobId)}`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data || !data.success) {
          const msg = (data && (data.message || data.msg)) ? String(data.message || data.msg) : 'IFC 解析状态查询失败';
          throw new Error(msg);
        }
        if (data.status === 'done') {
          return data.parse || { success: true, elements: [] };
        }
        if (data.status === 'failed') {
          throw new Error(data.error || 'IFC 解析失败');
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      throw new Error('IFC 解析超时，请稍后重试');
    },
    async _uploadIfcAndWaitForParse(file, hooks) {
      const formData = new FormData();
      formData.append('ifc', file);
      const res = await fetch('/api/upload-ifc', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data || !data.success) {
        const msg = (data && (data.message || data.msg)) ? String(data.message || data.msg) : '上传失败';
        throw new Error(msg);
      }

      const url = data.url || '';
      const jobId = data.jobId || '';
      if (hooks && typeof hooks.onUploaded === 'function') {
        hooks.onUploaded({ url, jobId, data });
      }

      let parse = data.parse || {};
      if (jobId) {
        if (hooks && typeof hooks.onParsing === 'function') {
          hooks.onParsing({ url, jobId, data });
        }
        parse = await this._pollIfcParseJob(jobId);
      }

      if (parse && parse.success === false) {
        const msg = parse.message ? String(parse.message) : 'IFC 解析失败';
        throw new Error(msg);
      }

      return { url, parse, raw: data };
    },
    async handleAddProjectIfcChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.ifc')) {
        this.ifcUploadError = '请选择 .ifc 文件';
        e.target.value = '';
        return;
      }
      this.uploadingIfc = true;
      this.parsingIfc = false;
      this.ifcUploadError = '';
      this.ifcParseError = '';
      this.addForm.ifcParsedCount = 0;
      this.newProjectIfcComponents = [];
      try {
        const result = await this._uploadIfcAndWaitForParse(file, {
          onUploaded: ({ url }) => {
            this.addForm.ifcUrl = url;
            this.addForm.ifcFileName = file.name;
            this.uploadingIfc = false;
            this.parsingIfc = true;
          },
        });
        const elements = this._normalizeIfcImportElements(result.parse);
        this.addForm.ifcParsedCount = elements.length;
        this.newProjectIfcComponents = this._buildComponentsFromIfcElements(elements);
        if (result.parse && result.parse.fromCache) {
          this.$Message.success(`IFC 解析完成，已复用缓存结果，识别 ${elements.length} 个构件`);
        } else {
          this.$Message.success(`IFC 解析完成，已重新解析，识别 ${elements.length} 个构件`);
        }
      } catch (err) {
        this.ifcUploadError = err && err.message ? String(err.message) : '上传失败';
        this.addForm.ifcUrl = '';
        this.addForm.ifcFileName = '';
        this.addForm.ifcParsedCount = 0;
        this.newProjectIfcComponents = [];
      } finally {
        this.uploadingIfc = false;
        this.parsingIfc = false;
        e.target.value = '';
      }
    },
    openStandaloneIfcViewer() {
      this.$Message.info('请打开「管理项目」，展开具体项目后点击「项目构件管理」');
    },
    onProvinceChange() {
      this.addForm.city = '';
    },
    toggleProjectExpand(pid) {
      this.expandedProjectId = this.expandedProjectId === pid ? null : pid;
      if (!this.selectedComponentIds[pid]) this.$set(this.selectedComponentIds, pid, []);
    },
    toggleSelectAll(project, event) {
      const ids = project.components ? project.components.map(c => c.id) : [];
      this.$set(this.selectedComponentIds, project.id, event.target.checked ? ids : []);
    },
    toggleSelectComponent(pid, cid) {
      if (!this.selectedComponentIds[pid]) this.$set(this.selectedComponentIds, pid, []);
      const list = this.selectedComponentIds[pid];
      const idx = list.indexOf(cid);
      if (idx >= 0) list.splice(idx, 1); else list.push(cid);
    },
    openBatchAssign(project) {
      const selected = this.selectedComponentIds[project.id] || [];
      if (selected.length === 0) { this.$Message.warning('请先勾选要指派的构件'); return; }
      this.$Message.info('批量指派已迁移到「项目构件管理」页面，请从项目行内入口进入操作');
    },
    confirmBatchAssign() {
      this.$Message.info('批量指派已迁移到「项目构件管理」页面，请从项目行内入口进入操作');
    },
    saveInlineEdit(project, comp) {
      const p = this.projects.find(x => x.id === project.id);
      if (!p) return;
      const c = (p.components || []).find(cc => cc.id === comp.id);
      if (c) Object.assign(c, comp);
      // 内联编辑时也同步更新 beamColumnCount
      const assignedCount = (p.components || []).filter(x => x.planDate && x.planDate.trim() !== '').length;
      p.beamColumnCount = assignedCount;
      if (this.activeProjectId === p.id) {
        this.activeProject = { ...p };
        this.highlightedProject = p;
      }
      this._save();
      if (this.$bus) {
        this.$bus.$emit('project-list-update')
      }
    },
    openAddComponent(project) {
      this.$Message.info('新增构件已迁移到「项目构件管理」页面，请从项目行内入口进入操作');
    },
    confirmAddComponent() {
      this.$Message.info('新增构件已迁移到「项目构件管理」页面，请从项目行内入口进入操作');
    },
    deleteComponent(pid, cid) {
      if (!confirm('确定删除该构件吗？')) return;
      const p = this.projects.find(x => x.id === pid);
      if (!p || !p.components) return;
      p.components = p.components.filter(c => c.id !== cid);
      // 删除后也同步更新 beamColumnCount
      const assignedCount = (p.components || []).filter(x => x.planDate && x.planDate.trim() !== '').length;
      p.beamColumnCount = assignedCount;
      if (this.activeProjectId === p.id) {
        this.activeProject = { ...p };
        this.highlightedProject = p;
      }
      this._save();
      this.$Message.success('删除成功');
    },
    async setActiveProject(project) {
      if (!project || !project.id) return;
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/active`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data || !data.success) {
          throw new Error((data && (data.message || data.msg)) ? String(data.message || data.msg) : '设置当前项目失败');
        }
        await this.fetchProjects();
        const active = this.projects.find((item) => String(item.id) === String(project.id)) || project;
        this.activeProjectId = active.id;
        this.activeProject = active;
        this.highlightedProject = active;
        this._save();
        this.$Message.success(`已将「${active.name}」设为当前检测项目`);
        if (this.$bus) {
          this.$bus.$emit('project-ifc-change', active && active.ifcUrl ? active.ifcUrl : '');
          this.$bus.$emit('project-change', active);
          this.$bus.$emit('component-ifc-sync', { projectId: active.id, project: active });
        }
        this.$nextTick(() => {
          this.refreshMapHighlight();
        });
      } catch (error) {
        this.$Message.error(error && error.message ? String(error.message) : '设置当前项目失败');
      }
    },
    async deleteProject(id) {
      if (!confirm('确定删除该项目吗？')) return;
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data || !data.success) {
          throw new Error((data && (data.message || data.msg)) ? String(data.message || data.msg) : '删除项目失败');
        }
        await this.fetchProjects();
        this.$Message.success('删除成功');
      } catch (error) {
        this.$Message.error(error && error.message ? String(error.message) : '删除项目失败');
      }
    },
    async clearProjectComponents(project) {
      if (!project || !project.id) return;
      const name = project.name || '当前项目';
      const first = confirm(`确定清除「${name}」的项目构件数据吗？\n\n将删除该项目下的构件、班组指派、计划日期和检测状态数据，项目本身与 IFC 文件保留。`);
      if (!first) return;
      const second = confirm(`请再次确认：清除后需要重新同步 IFC 才能恢复「${name}」的构件列表。是否继续？`);
      if (!second) return;
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/components`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data || !data.success) {
          throw new Error((data && (data.message || data.msg)) ? String(data.message || data.msg) : '清除当前项目数据失败');
        }
        await this.fetchProjects();
        if (this.$bus) {
          this.$bus.$emit('project-list-update');
          this.$bus.$emit('component-ifc-sync', { projectId: project.id, project: data.project || project });
        }
        this.$Message.success(`已清除 ${Number(data.removed || 0)} 条项目构件数据`);
      } catch (error) {
        this.$Message.error(error && error.message ? String(error.message) : '清除当前项目数据失败');
      }
    },
        async confirmAddProject() {
      if (!this.addForm.name) { this.$Message.warning('请输入项目名称'); return; }
      const cityName = this.addForm.city || this.addForm.province;
      let coord = this.cityCenter[cityName]
        || this.cityCenter[cityName.replace(/市$/, '')]
        || this.cityCenter[cityName + '市'];
      if (!coord) {
        const key = Object.keys(this.cityCenter).find(function(k) { return k.includes(cityName) || cityName.includes(k); });
        if (key) coord = this.cityCenter[key];
      }
      if (!coord && this.addForm.province && Object.keys(this.chinaProvinceCenters || {}).length) {
        const pn = this.resolveProvinceRegionNameFromKeys(this.addForm.province, Object.keys(this.chinaProvinceCenters));
        if (pn) coord = this.chinaProvinceCenters[pn];
      }
      const components = this.newProjectIfcComponents.slice();
      // If user uploaded IFC, do NOT auto-add all parsed components.
      // Let user explicitly choose which to import via the "导入IFC构件" feature later.
      const finalComponents = components.length > 0 ? [] : [];
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            name: this.addForm.name,
            province: this.addForm.province,
            city: cityName,
            center: coord ? [coord[0], coord[1]] : null,
            ifcUrl: this.addForm.ifcUrl || '',
            ifcFileName: this.addForm.ifcFileName || '',
            ifcFileSize: 0,
            beamColumnCount: finalComponents.length
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data || !data.success) {
          throw new Error((data && (data.message || data.msg)) ? String(data.message || data.msg) : '项目添加失败');
        }
        await this.fetchProjects();
        this.showProjectModal = false;
        this.showManageModal = false;
        if (this.addForm.ifcUrl && this.addForm.ifcParsedCount > 0) {
          this.$Message.success(`项目添加成功（已上传 IFC ${this.addForm.ifcParsedCount} 个构件，请通过「导入IFC构件」选择要添加的构件）`);
        } else {
          this.$Message.success('项目添加成功');
        }
        this.newProjectIfcComponents = [];
        this.addForm = { name: '', province: '', city: '', ifcUrl: '', ifcFileName: '', ifcParsedCount: 0 };
        this.$nextTick(() => {
          this.startCarousel();
          this.refreshMapHighlight();
        });
      } catch (error) {
        this.$Message.error(error && error.message ? String(error.message) : '项目添加失败');
      }
    },
    // ── IFC：已有项目导入构件列表 ──────────────────────────────────
    openIfcImport(project) {
      this.ifcImportProject = project;
      this.ifcImportElements = [];
      this.ifcImportSelectedIds = [];
      this.ifcImportSearch = '';
      this.ifcImportType = '';
      this.projectIfcImportError = '';
      if (this.$refs.ifcImportInput) this.$refs.ifcImportInput.click();
    },
    _normalizeIfcElements(elements) {
      const list = Array.isArray(elements) ? elements : [];
      return list.map((el) => {
        const expressID = el && el.expressID != null ? String(el.expressID) : '';
        const globalId = el && el.globalId != null ? String(el.globalId) : '';
        const type = el && el.type != null ? String(el.type) : '';
        const componentMark = el && el.componentMark != null ? String(el.componentMark) : '';
        const name = el && el.name != null ? String(el.name) : (componentMark || globalId || (type && expressID ? `${type}-${expressID}` : '未命名构件'));
        return {
          expressID,
          globalId,
          type,
          name,
          componentMark,
          mainSpec: el && el.mainSpec != null ? String(el.mainSpec) : '',
          positionCode: el && el.positionCode != null ? String(el.positionCode) : '',
          bottomElevation: el && el.bottomElevation != null ? String(el.bottomElevation) : '',
          topElevation: el && el.topElevation != null ? String(el.topElevation) : '',
          length: el && el.length != null ? Number(el.length) : null,
          width: el && el.width != null ? Number(el.width) : null,
          area: el && el.area != null ? Number(el.area) : null,
          castUnitWeight: el && el.castUnitWeight != null ? Number(el.castUnitWeight) : null,
          weightNet: el && el.weightNet != null ? Number(el.weightNet) : null,
          weightGross: el && el.weightGross != null ? Number(el.weightGross) : null,
          material: el && el.material != null ? String(el.material) : '',
          mainReference: el && el.mainReference != null ? String(el.mainReference) : ''
        };
      }).filter((x) => x.expressID);
    },
    _normalizeIfcImportElements(parse) {
      const payload = parse || {};
      const elements = Array.isArray(payload.elements) ? payload.elements : [];
      const assemblySummaries = Array.isArray(payload.assemblySummaries) ? payload.assemblySummaries : [];
      const summaryByExpressId = new Map();
      const summaryByGlobalId = new Map();

      assemblySummaries.forEach((summary) => {
        const expressID = summary && summary.expressID != null ? String(summary.expressID).trim() : '';
        const globalId = summary && summary.globalId != null ? String(summary.globalId).trim() : '';
        if (expressID) summaryByExpressId.set(expressID, summary);
        if (globalId) summaryByGlobalId.set(globalId, summary);
      });

      const assemblyElements = elements.filter((el) => String(el && el.type ? el.type : '').trim() === 'IFCELEMENTASSEMBLY');
      const source = assemblyElements.length ? assemblyElements : assemblySummaries;
      const merged = source.map((el) => {
        const expressID = el && el.expressID != null ? String(el.expressID).trim() : '';
        const globalId = el && el.globalId != null ? String(el.globalId).trim() : '';
        const summary = summaryByExpressId.get(expressID) || summaryByGlobalId.get(globalId) || el || {};
        return {
          ...(el || {}),
          type: 'IFCELEMENTASSEMBLY',
          componentMark: summary && summary.componentMark != null ? summary.componentMark : (el && el.componentMark),
          mainSpec: summary && summary.mainSpec != null ? summary.mainSpec : (el && el.mainSpec),
          positionCode: summary && summary.positionCode != null ? summary.positionCode : (el && el.positionCode),
          bottomElevation: summary && summary.bottomElevation != null ? summary.bottomElevation : (el && el.bottomElevation),
          topElevation: summary && summary.topElevation != null ? summary.topElevation : (el && el.topElevation),
          length: summary && summary.length != null ? summary.length : (el && el.length),
          width: summary && summary.width != null ? summary.width : (el && el.width),
          area: summary && summary.area != null ? summary.area : (el && el.area),
          castUnitWeight: summary && summary.castUnitWeight != null ? summary.castUnitWeight : (el && el.castUnitWeight),
          weightNet: summary && summary.weightNet != null ? summary.weightNet : (el && el.weightNet),
          weightGross: summary && summary.weightGross != null ? summary.weightGross : (el && el.weightGross),
          material: summary && summary.material != null ? summary.material : (el && el.material),
          mainReference: summary && summary.mainReference != null ? summary.mainReference : (el && el.mainReference)
        };
      });

      return this._normalizeIfcElements(merged);
    },
    _buildComponentsFromIfcElements(elements) {
      return elements.map((el) => {
        const expressID = el.expressID;
        const globalId = el.globalId;
        const typeName = el.type;
        const componentMark = el.componentMark || '';
        const name = componentMark || el.name;
        return {
          id: globalId ? `ifc_${globalId}` : `ifc_${expressID}`,
          name,
          componentMark,
          spec: el.mainSpec || typeName,
          positionCode: el.positionCode || '',
          bottomElevation: el.bottomElevation || '',
          topElevation: el.topElevation || '',
          length: el.length != null ? Number(el.length) : null,
          width: el.width != null ? Number(el.width) : null,
          area: el.area != null ? Number(el.area) : null,
          castUnitWeight: el.castUnitWeight != null ? Number(el.castUnitWeight) : null,
          weightNet: el.weightNet != null ? Number(el.weightNet) : null,
          weightGross: el.weightGross != null ? Number(el.weightGross) : null,
          material: el.material || '',
          mainReference: el.mainReference || '',
          teamLeader: '',
          teamName: '',
          teamId: '',
          selfInspector: '',
          qualityInspector: '',
          qualityManager: '',
          planDate: '',
          status: '待检测',
          ifcElementId: expressID,
          ifcGlobalId: globalId,
          ifcType: typeName,
        };
      });
    },
    _mergeComponents(existing, incoming) {
      const base = Array.isArray(existing) ? existing.slice() : [];
      const existsKey = new Set(
        base.map((c) => (c && (c.ifcGlobalId || c.ifcElementId || c.id) ? String(c.ifcGlobalId || c.ifcElementId || c.id) : '')).filter(Boolean)
      );
      const toAdd = Array.isArray(incoming) ? incoming.filter((c) => {
        const k = c && (c.ifcGlobalId || c.ifcElementId || c.id) ? String(c.ifcGlobalId || c.ifcElementId || c.id) : '';
        if (!k) return false;
        if (existsKey.has(k)) return false;
        existsKey.add(k);
        return true;
      }) : [];
      return base.concat(toAdd);
    },
    async _projectExistsOnServer(projectId) {
      if (!projectId) return false;
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { headers: getAuthHeaders() });
        if (!res.ok) return false;
        const data = await res.json().catch(() => ({}));
        return !!(data && data.success && data.data);
      } catch (e) {
        return false;
      }
    },
    async _syncProjectIfcComponentsIfNeeded(project) {
      if (!project || !project.id || !project.ifcUrl) return project;
      const componentCount = Array.isArray(project.components) ? project.components.length : 0;
      if (componentCount > 0) return project;
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/components/sync-ifc`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data || !data.success) {
          throw new Error((data && (data.message || data.msg)) ? String(data.message || data.msg) : '项目 IFC 构件回填失败');
        }
        const serverProject = data.project || project;
        const idx = this.projects.findIndex((x) => String(x.id) === String(project.id));
        if (idx >= 0) this.$set(this.projects, idx, serverProject);
        if (this.activeProjectId === serverProject.id) {
          this.activeProject = serverProject;
          this.highlightedProject = serverProject;
        }
        this._save();
        return serverProject;
      } catch (err) {
        this.$Message.error(err && err.message ? String(err.message) : '项目 IFC 构件回填失败');
        return project;
      }
    },
    toggleIfcImportSelectAll(checked) {
      if (checked) {
        this.ifcImportSelectedIds = this.filteredIfcImportElements.map((e) => e.expressID);
      } else {
        this.ifcImportSelectedIds = [];
      }
    },
    isIfcImportSelected(expressID) {
      return this.ifcImportSelectedIds.includes(String(expressID));
    },
    toggleIfcImportSelected(expressID) {
      const id = String(expressID);
      const idx = this.ifcImportSelectedIds.indexOf(id);
      if (idx >= 0) this.ifcImportSelectedIds.splice(idx, 1);
      else this.ifcImportSelectedIds.push(id);
    },
    confirmIfcImport() {
      if (!this.ifcImportProject) return;
      const project = this.projects.find((x) => String(x.id) === String(this.ifcImportProject.id));
      if (!project) return;
      const picked = new Set(this.ifcImportSelectedIds.map((x) => String(x)));
      const selectedElements = (this.ifcImportElements || []).filter((e) => picked.has(String(e.expressID)));
      this.confirmIfcImportToProject(project, selectedElements);
    },
    async confirmIfcImportToProject(project, selectedElements) {
      const incoming = this._buildComponentsFromIfcElements(selectedElements);
      const existsOnServer = await this._projectExistsOnServer(project.id);
      if (existsOnServer) {
        try {
          const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/components/import-ifc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ elements: selectedElements })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data || !data.success) {
            throw new Error((data && (data.message || data.msg)) ? String(data.message || data.msg) : '后端导入 IFC 构件失败');
          }
          const serverProject = data.project || project;
          const idx = this.projects.findIndex((x) => String(x.id) === String(project.id));
          if (idx >= 0) this.$set(this.projects, idx, serverProject);
          if (this.activeProjectId === serverProject.id) {
            this.activeProject = serverProject;
            this.highlightedProject = serverProject;
          }
          this._save();
          this.showIfcImportModal = false;
          this.$Message.success(`已导入 ${Number(data.added || 0)} 个构件，请在「项目构件管理」中勾选并指派后，才会显示在主页面上`);
          return;
        } catch (err) {
          this.$Message.error(err && err.message ? String(err.message) : '后端导入 IFC 构件失败');
          return;
        }
      }

      const before = Array.isArray(project.components) ? project.components.length : 0;
      project.components = this._mergeComponents(project.components, incoming);
      const after = Array.isArray(project.components) ? project.components.length : before;
      const added = Math.max(after - before, 0);
      if (this.activeProjectId === project.id) {
        this.activeProject = project;
        this.highlightedProject = project;
      }
      this._save();
      this.showIfcImportModal = false;
      this.$Message.success(`已导入 ${added} 个构件，请在「项目构件管理」中勾选并指派后，才会显示在主页面上`);
    },
    closeIfcImportModal() {
      if (this.importingProjectIfc) return;
      this.showIfcImportModal = false;
    },
    async openIfcViewer(project) {
      let proj = project || this.activeProject;
      if (!proj) {
        this.$Message.warning('请先选择或添加项目');
        return;
      }
      proj = await this._syncProjectIfcComponentsIfNeeded(proj);
      if (!this.$router) {
        window.location.href = '/#/project-ifc?projectId=' + encodeURIComponent(proj.id);
        return;
      }
      this.$router.push({ path: '/project-ifc', query: { projectId: String(proj.id) } }).catch(function () {});
    },
    openIfcViewerWithUpload() {
      if (!this.addForm.ifcUrl) {
        this.$Message.warning('请先上传 IFC 文件');
        return;
      }
      this.$Message.info('请先点击「添加项目」保存后，在「管理项目」列表中展开该项目，再点「项目构件管理」进入');
    },
    async handleProjectIfcFileChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.ifc')) {
        this.projectIfcImportError = '请选择 .ifc 文件';
        e.target.value = '';
        return;
      }
      if (!this.ifcImportProject) {
        e.target.value = '';
        return;
      }
      this.importingProjectIfc = true;
      this.projectIfcImportError = '';
      try {
        const result = await this._uploadIfcAndWaitForParse(file);
        const url = result.url || '';
        const parse = result.parse || {};
        const elements = this._normalizeIfcImportElements(parse);
        if (parse && parse.success && elements.length === 0) {
          const total = parse.total != null ? Number(parse.total) : 0;
          if (total > 0) {
            throw new Error('IFC 解析结果为空（未识别到可导入构件）');
          }
        }
        const proj = this.projects.find((x) => String(x.id) === String(this.ifcImportProject.id));
        if (proj) {
          try {
            const bindRes = await fetch(`/api/projects/${encodeURIComponent(proj.id)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify({ ifcUrl: url })
            });
            const bindData = await bindRes.json().catch(() => ({}));
            if (!bindRes.ok || !bindData || !bindData.success || !bindData.project) {
              throw new Error((bindData && (bindData.message || bindData.msg)) ? String(bindData.message || bindData.msg) : '项目 IFC 绑定失败');
            }
            const idx = this.projects.findIndex((x) => String(x.id) === String(proj.id));
            if (idx >= 0) this.$set(this.projects, idx, bindData.project);
            if (this.activeProjectId === bindData.project.id) {
              this.activeProject = bindData.project;
              this.highlightedProject = bindData.project;
            }
          } catch (error) {
            this.projectIfcImportError = error && error.message ? String(error.message) : '项目 IFC 绑定失败';
            throw error;
          }
        }
        this.ifcImportElements = elements;
        this.ifcImportSelectedIds = elements.map((x) => x.expressID);
        this.showIfcImportModal = true;
        this._save();
        if (this.$bus) this.$bus.$emit('project-ifc-change', url || '');
        if (parse && parse.fromCache) {
          this.$Message.success(`IFC 解析完成，已复用缓存结果，识别 ${elements.length} 个构件`);
        } else {
          this.$Message.success(`IFC 解析完成，已重新解析，识别 ${elements.length} 个构件`);
        }
      } catch (err) {
        this.projectIfcImportError = err && err.message ? String(err.message) : '上传失败';
        if (this.$Message && this.$Message.error) this.$Message.error(this.projectIfcImportError);
      } finally {
        this.importingProjectIfc = false;
        e.target.value = '';
      }
    },
    _getTodayStr() {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },
    _buildCityMap() {
      return {};
    },
    // ── 原有方法 ─────────────────────────────────────
    message(text) {
      this.$Message({
        text: text,
        type: "warning",
      });
    },
    mapclick() {
      if (this.echartBindClick) return;
      // 确保图表已渲染完成
      if (!this.$refs.CenterMap || !this.$refs.CenterMap.chart) {
        clearTimeout(this.echartBindClickTimer);
        this.echartBindClickTimer = setTimeout(() => { this.mapclick(); }, 300);
        return;
      }
      const chart = this.$refs.CenterMap.chart;
      if (!chart) return;

      // 地图区域点击（省份/城市）
      chart.on("click", (params) => {
        const seriesName = params.seriesName;
        // ── 涟漪点（项目标记）点击 → 只切换当前项目，不切换地图 ─────────────
        if (seriesName === '普通项目' || seriesName === '当前项目高亮') {
          const d = params.data || {};
          let matched = null;
          const pid = d.id != null ? d.id : d.projectId;
          if (pid != null) {
            matched = this.projects.find((p) => String(p.id) === String(pid));
          }
          // 回退：用 params.name 匹配普通项目（省市简称）
          if (!matched && params.name) {
            matched = this.projects.find((p) => {
              const labelName = this.projectMapLabel(p);
              return labelName === params.name || p.name === params.name;
            });
          }
          if (matched) {
            this.setActiveProject(matched);
          }
          return; // ← 关键：涟漪点点击不触发地图切换
        }
        // ── 地图区域点击 → 切换到对应省份视图 ─────────────────────────────────
        let xzqData = xzqCode[params.name];
        if (xzqData) {
          this.getData(xzqData.adcode);
        } else {
          this.$Message.info('请在右上角"管理项目"中添加新项目');
        }
      });
      this.echartBindClick = true;
    },
  },
};
</script>
<style lang="scss" scoped>
.centermap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  .maptitle {
    height: 48px;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    padding-top: 8px;
    box-sizing: border-box;

    .titletext {
      font-size: 26px;
      font-weight: bold !important;
      letter-spacing: 6px;
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      margin: 0 12px;
    }

    .zuo,
    .you {
      background-size: 100% 100%;
      width: 29px;
      height: 20px;
      margin-top: 8px;
    }

    .zuo {
      background: url("../../assets/img/xiezuo.png") no-repeat;
    }

    .you {
      background: url("../../assets/img/xieyou.png") no-repeat;
    }
  }

  .mapwrap {
    flex: 1;
    min-height: 0;
    width: 100%;
    box-sizing: border-box;
    position: relative;

    .project-info-overlay {
      position: absolute;
      top: 8px;
      left: 10px;
      background: rgba(0, 30, 60, 0.85);
      border: 1px solid rgba(0, 186, 255, 0.4);
      border-radius: 8px;
      padding: 12px 10px;
      z-index: 10;
      min-width: 200px;
      .overlay-badge {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #ffaa00, #ff8800);
        color: #fff;
        font-size: 11px;
        font-weight: bold;
        padding: 3px 12px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(255, 170, 0, 0.5);
        white-space: nowrap;
        letter-spacing: 1px;
        animation: badge-pulse 2s ease-in-out infinite;
        .badge-star { margin-right: 4px; }
      }
      @keyframes badge-pulse {
        0%, 100% { box-shadow: 0 2px 8px rgba(255, 170, 0, 0.5); }
        50% { box-shadow: 0 2px 16px rgba(255, 170, 0, 0.8); }
      }
      .p-row { display: flex; gap: 18px; margin-bottom: 8px; &.main-info { display: block; border-bottom: 1px solid rgba(0,186,255,0.2); padding-bottom: 8px; margin-bottom: 8px; } &.p-row--metrics { gap: 34px; } &:last-child { margin-bottom: 0; } }
      .p-item {
        .p-label { color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 600; margin-bottom: 3px; &.p-label--two-line { display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; line-height: 1.2; min-height: 28px; } }
        .p-value { color: #fff; font-size: 16px; font-weight: 800; &.large-text { font-size: 17px; font-weight: 900; } &.qualified { color: #67c23a; } &.rate { color: #409eff; } }
        .num-font { font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif; font-size: 22px; font-weight: 900; }
        &.main-item {
          flex: 0 1 auto;
          min-width: 0;
          max-width: 260px;
          .info-line {
            display: flex;
            align-items: center;
            gap: 4px;
            min-width: 0;
            margin-bottom: 4px;
            &:last-child {
              margin-bottom: 0;
            }
          }
          .info-line__label {
            flex: 0 0 auto;
            color: rgba(255,255,255,0.68);
            font-size: 12px;
            font-weight: 700;
            line-height: 1.2;
          }
          .info-line__value {
            flex: 1 1 auto;
            min-width: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
          }
          .p-value.large-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .project-name-marquee {
            overflow: hidden;
            flex: 1 1 auto;
            min-width: 0;
            max-width: 206px;
          }
          .project-name-text {
            display: inline-flex;
            align-items: center;
            gap: 24px;
            min-width: 0;
            white-space: nowrap !important;
            line-height: 1.2;
            animation: none;
            &.is-scrolling {
              min-width: max-content;
              animation: project-name-marquee 10s linear infinite;
            }
            .project-name-text__copy {
              padding-right: 8px;
            }
          }
        }
        &.p-item--right {
          width: 112px;
          flex: 0 0 112px;
          margin-left: auto;
        }
      }
      @keyframes project-name-marquee {
        0%, 12% { transform: translateX(0); }
        50% { transform: translateX(calc(-50% - 14px)); }
        62%, 100% { transform: translateX(calc(-50% - 14px)); }
      }
    }

    .quanguo {
      position: absolute;
      right: 100px;
      top: -46px;
      width: 80px;
      height: 28px;
      border: 1px solid #00eded;
      border-radius: 10px;
      color: #00f7f6;
      text-align: center;
      line-height: 26px;
      letter-spacing: 6px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 237, 237, 0.5),
        0 0 6px rgba(0, 237, 237, 0.4);
    }
    .manage-btn {
      position: absolute;
      right: 20px;
      top: -46px;
      width: 80px;
      height: 28px;
      border: 1px solid #00eded;
      border-radius: 10px;
      color: #00f7f6;
      text-align: center;
      line-height: 26px;
      letter-spacing: 2px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 237, 237, 0.5),
        0 0 6px rgba(0, 237, 237, 0.4);
      font-size: 12px;
    }

  }
}

// ── 项目管理弹窗样式 ──────────────────────────────────
.project-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.72);
  z-index: 300000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
  .modal-content {
    position: relative;
    z-index: 300001;
    background: #001f3f;
    padding: 20px;
    border-radius: 8px;
    border: 2px solid #00baff;
    box-shadow: 0 0 20px rgba(0, 186, 255, 0.5);
    color: #fff;
    max-height: 85vh;
    overflow-y: auto;
    &.modal-content--manage { width: 980px; max-width: 95vw; }
    &.batch-modal { width: 480px; }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(0, 186, 255, 0.3);
      padding-bottom: 10px;
      margin-bottom: 15px;
      h3 { margin: 0; color: #00baff; font-size: 16px; }
      .close-icon { cursor: pointer; font-size: 24px; color: #fff; &:hover { color: #f56c6c; } }
    }
  }
  .manage-body {
    max-height: calc(85vh - 80px);
    overflow-y: auto;
    padding-right: 6px;
    .empty-tip { text-align: center; padding: 30px; color: #888; }
    .project-block {
      border: 1px solid rgba(0, 186, 255, 0.25);
      border-radius: 6px;
      margin-bottom: 10px;
      overflow: hidden;
      &.is-active { border-color: #00e5ff; }
      .project-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: rgba(0, 186, 255, 0.08);
        cursor: pointer;
        &:hover { background: rgba(0, 186, 255, 0.14); }
        .project-row-left { display: flex; align-items: center; gap: 10px; }
        .expand-icon { font-size: 10px; color: #00baff; transition: transform 0.2s; &.expanded { transform: rotate(90deg); } }
        .project-name { font-weight: bold; color: #fff; font-size: 14px; }
        .project-city { color: #888; font-size: 12px; }
        .project-rate { color: #00e5ff; font-size: 13px; }
        .project-row-right { display: flex; align-items: center; gap: 8px; }
        .tag-active { background: #00e5ff; color: #000; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
        .btn-set-active {
          background: rgba(0, 186, 255, 0.15); color: #00baff; border: 1px solid rgba(0, 186, 255, 0.4);
          padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;
          &:hover { background: rgba(0, 186, 255, 0.3); }
          &:disabled { opacity: 0.4; cursor: default; }
        }
        .btn-delete-project {
          background: rgba(245, 108, 108, 0.15); color: #f56c6c; border: 1px solid rgba(245, 108, 108, 0.4);
          padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;
          &:hover { background: rgba(245, 108, 108, 0.3); }
        }
      }
      .components-panel {
        background: rgba(0, 0, 0, 0.2);
        padding: 10px 12px;
        .components-toolbar { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        .btn-ifc-settings {
          background: rgba(73, 231, 194, 0.15); color: #49e7c2; border: 1px solid rgba(73, 231, 194, 0.4);
          padding: 5px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;
          &:hover:not(:disabled) { background: rgba(73, 231, 194, 0.25); }
          &:disabled { opacity: 0.45; cursor: not-allowed; }
        }
        .btn-clear-project-data {
          background: rgba(245, 108, 108, 0.12); color: #ff9b9b; border: 1px solid rgba(245, 108, 108, 0.55);
          padding: 5px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;
          &:hover { background: rgba(245, 108, 108, 0.22); border-color: #f56c6c; }
        }
        .empty-components { color: #666; font-size: 13px; padding: 10px 0; text-align: center; }
        .components-table-wrap { overflow-x: auto; }
        .components-table {
          width: 100%; border-collapse: collapse; font-size: 12px; min-width: 800px;
          th, td { padding: 6px 8px; border-bottom: 1px solid rgba(0, 186, 255, 0.1); text-align: left; }
          th { background: rgba(0, 186, 255, 0.1); color: #00baff; font-weight: 600; }
          tr:hover td { background: rgba(0, 186, 255, 0.05); }
          tr.selected td { background: rgba(0, 234, 255, 0.08); }
          .inline-input, .inline-select {
            width: 100%; background: rgba(0, 186, 255, 0.08); border: 1px solid rgba(0, 186, 255, 0.25);
            color: #fff; padding: 3px 6px; border-radius: 3px; font-size: 12px;
            &:focus { border-color: #00baff; outline: none; }
          }
          .date-input { width: 120px; }
          .btn-del-comp {
            background: rgba(245, 108, 108, 0.15); color: #f56c6c; border: 1px solid rgba(245, 108, 108, 0.4);
            padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;
            &:hover { background: rgba(245, 108, 108, 0.3); }
          }
        }
      }
    }
  }
  .batch-tip { color: #00e5ff; font-size: 13px; margin-bottom: 15px; }
  .form-item {
    margin-bottom: 12px;
    label { display: block; font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 4px; }
    input, select {
      width: 100%; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(0, 186, 255, 0.5);
      color: #fff; padding: 8px; border-radius: 4px; outline: none; font-size: 13px;
      &:focus { border-color: #00baff; }
    }
  }
  .modal-footer {
    margin-top: 20px; display: flex; justify-content: flex-end; gap: 12px;
    .cancel-btn { background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; &:hover { background: rgba(255,255,255,0.2); } }
    .save-btn { background: #00baff; color: #fff; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; &:hover { background: #0096cc; } }
    &.add-project-footer {
      .ifc-viewer-link-btn {
        flex: 1;
        background: rgba(0, 186, 255, 0.12);
        color: #00baff;
        border: 1px solid rgba(0, 186, 255, 0.4);
        padding: 8px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s;
        &:hover { background: rgba(0, 186, 255, 0.25); }
      }
    }
  }
  // IFC 上传样式
  .ifc-upload-item {
    .ifc-upload-row {
      display: flex; gap: 8px;
      input { flex: 1; }
    }
    .btn-upload-ifc {
      background: rgba(0, 186, 255, 0.2); color: #00baff; border: 1px solid rgba(0, 186, 255, 0.5);
      padding: 8px 14px; border-radius: 4px; cursor: pointer; white-space: nowrap; font-size: 13px;
      &:hover:not(:disabled) { background: rgba(0, 186, 255, 0.35); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .upload-progress { color: #00baff; font-size: 12px; margin-top: 6px; }
    .upload-error { color: #f56c6c; font-size: 12px; margin-top: 6px; }
  }

  .ifc-import-modal {
    width: min(980px, 92vw);
    max-height: 86vh;
    display: flex;
    flex-direction: column;
  }
  .ifc-import-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ifc-import-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid rgba(0, 186, 255, 0.15);
    background: rgba(0, 0, 0, 0.18);
    border-radius: 8px;
    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .check-all {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: rgba(255,255,255,0.75);
      font-size: 12px;
      input { cursor: pointer; }
    }
    .ifc-import-select {
      height: 30px;
      border-radius: 6px;
      border: 1px solid rgba(0, 186, 255, 0.25);
      background: rgba(0, 20, 40, 0.45);
      color: rgba(255, 255, 255, 0.92);
      font-size: 12px;
      padding: 0 10px;
      outline: none;
      max-width: 220px;
    }
    .ifc-import-search {
      height: 30px;
      width: min(360px, 40vw);
      border-radius: 6px;
      border: 1px solid rgba(0, 186, 255, 0.25);
      background: rgba(0, 20, 40, 0.45);
      color: rgba(255, 255, 255, 0.92);
      font-size: 12px;
      padding: 0 10px;
      outline: none;
    }
    .ifc-import-count {
      font-size: 12px;
      color: rgba(0, 234, 255, 0.9);
      white-space: nowrap;
    }
  }
  .ifc-import-error {
    color: #f56c6c;
    font-size: 12px;
    padding: 0 4px;
  }
  .ifc-import-table-wrap {
    flex: 1;
    min-height: 0;
    overflow: auto;
    border: 1px solid rgba(0, 186, 255, 0.12);
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.14);
  }
  .ifc-import-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    min-width: 820px;
    th, td { padding: 8px 10px; border-bottom: 1px solid rgba(0, 186, 255, 0.08); text-align: left; }
    th { position: sticky; top: 0; z-index: 1; background: rgba(0, 186, 255, 0.10); color: #00baff; font-weight: 700; }
    tr:hover td { background: rgba(0, 186, 255, 0.05); }
    tr.selected td { background: rgba(0, 234, 255, 0.06); }
    .mono { font-family: 'DIN Alternate', 'Helvetica Neue', monospace; color: rgba(255,255,255,0.82); }
    input[type="checkbox"] { cursor: pointer; }
  }
}

// ── 添加项目弹窗样式 ──────────────────────────────────
.add-project-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 300000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}
.add-project-modal {
  width: min(560px, 92vw);
  background: #071420;
  border: 1.5px solid #00baff;
  border-radius: 8px;
  box-shadow: 0 0 30px rgba(0, 186, 255, 0.4), inset 0 0 60px rgba(0, 30, 60, 0.5);
  color: #fff;
  padding: 20px;
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0, 186, 255, 0.25);
    padding-bottom: 10px;
    margin-bottom: 16px;
    h3 { margin: 0; color: #00baff; font-size: 16px; }
    .close-icon { cursor: pointer; font-size: 24px; color: rgba(255,255,255,0.6); &:hover { color: #f56c6c; } }
  }
  .modal-body {
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .form-item {
      margin-bottom: 14px;
      label {
        display: block;
        font-size: 12px;
        color: #00baff;
        margin-bottom: 6px;
      }
    }
    .form-input,
    .form-select {
      width: 100%;
      box-sizing: border-box;
      background: #040e1c;
      border: 1px solid rgba(0, 186, 255, 0.35);
      border-radius: 4px;
      padding: 7px 10px;
      color: rgba(255, 255, 255, 0.92);
      font-size: 13px;
      outline: none;
      &:focus { border-color: #00baff; box-shadow: 0 0 6px rgba(0, 186, 255, 0.3); }
      &:disabled { opacity: 0.45; cursor: not-allowed; }
    }
    .label-hint {
      color: rgba(0, 186, 255, 0.5);
      font-size: 11px;
    }
    .ifc-upload-item {
      border-top: 1px solid rgba(0, 186, 255, 0.12);
      padding-top: 14px;
      margin-top: 6px;
    }
    .ifc-upload-row {
      display: flex;
      gap: 8px;
      input { flex: 1; }
    }
    .btn-upload-ifc {
      background: rgba(0, 186, 255, 0.12);
      color: #00baff;
      border: 1px solid rgba(0, 186, 255, 0.5);
      padding: 7px 14px;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
      font-size: 13px;
      &:hover:not(:disabled) { background: rgba(0, 186, 255, 0.28); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .upload-progress {
      color: #00baff;
      font-size: 12px;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      &.success { color: #4ade80; }
    }
    .progress-bar {
      flex: 1;
      height: 3px;
      background: rgba(0, 186, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #00baff;
      border-radius: 2px;
      animation: progress-pulse 1.2s ease-in-out infinite;
    }
    .parsing-fill {
      background: linear-gradient(90deg, #00baff, #00ffaa);
      animation: progress-indeterminate 1.5s ease-in-out infinite;
    }
    .upload-error { color: #f56c6c; font-size: 12px; margin-top: 6px; }
  }
  .modal-footer.add-project-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 14px;
    border-top: 1px solid rgba(0, 186, 255, 0.15);
    margin-top: 4px;
    .cancel-btn {
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 8px 18px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      &:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
    }
    .ifc-viewer-link-btn {
      flex: 1;
      background: rgba(0, 186, 255, 0.1);
      color: #00baff;
      border: 1px solid rgba(0, 186, 255, 0.45);
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
      &:hover { background: rgba(0, 186, 255, 0.22); }
    }
    .save-btn {
      background: #00baff;
      color: #fff;
      border: none;
      padding: 8px 22px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: bold;
      &:hover:not(:disabled) { background: #0096dd; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  }
}
.btn-add-project-header {
  background: linear-gradient(135deg, #0055cc, #00baff);
  color: #fff;
  border: 1px solid rgba(0, 186, 255, 0.4);
  padding: 5px 14px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: linear-gradient(135deg, #0077ee, #00d4ff);
    box-shadow: 0 0 10px rgba(0, 186, 255, 0.3);
  }
}
.btn-manage {
  background: linear-gradient(135deg, #008833, #00cc55) !important;
  border-color: rgba(0, 200, 85, 0.5) !important;
  &:hover {
    box-shadow: 0 0 10px rgba(0, 200, 85, 0.4) !important;
  }
}

@keyframes progress-pulse {
  0% { width: 0%; }
  60% { width: 80%; }
  100% { width: 100%; }
}
@keyframes progress-indeterminate {
  0% { transform: translateX(-100%); width: 50%; }
  100% { transform: translateX(200%); width: 50%; }
}
</style>
