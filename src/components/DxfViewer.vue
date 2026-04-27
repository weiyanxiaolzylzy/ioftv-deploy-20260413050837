<template>
  <div ref="dxfContainer" class="dxf-container">
    <div v-if="loading" class="loading">加载中...</div>
  </div>
</template>

<script>
export default {
  name: 'DxfViewer',
  props: {
    dxfUrl: {
      type: String,
      required: true
    }
  },
  data: function() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      loading: true,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      rotationX: 0,
      rotationY: 0,
      scale: 1,
      panX: 0,
      panY: 0,
      meshGroup: null
    };
  },
  mounted: function() {
    this.loadDxf();
  },
  beforeDestroy: function() {
    this.removeEventListeners();
    if (this.renderer) {
      this.renderer.dispose();
    }
  },
  methods: {
    loadDxf: function() {
      var self = this;
      var container = this.$refs.dxfContainer;
      var width = container.clientWidth || 400;
      var height = container.clientHeight || 300;

      if (window.THREE) {
        self.initThree(width, height, container);
        self.fetchAndParseDxf();
      } else {
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
        script.onload = function() {
          self.initThree(width, height, container);
          self.fetchAndParseDxf();
        };
        document.head.appendChild(script);
      }
    },
    initThree: function(width, height, container) {
      var THREE = window.THREE;
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x1a1a2e);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000000);
      this.camera.position.set(0, 0, 50000);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);
      container.appendChild(this.renderer.domElement);

      var light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(1, 1, 1);
      this.scene.add(light);
      this.scene.add(new THREE.AmbientLight(0x606060));

      this.meshGroup = new THREE.Group();
      this.scene.add(this.meshGroup);

      this.addEventListeners();
    },
    addEventListeners: function() {
      var self = this;
      var container = this.$refs.dxfContainer;
      
      this._onMouseDown = function(e) { self.onMouseDown(e); };
      this._onMouseMove = function(e) { self.onMouseMove(e); };
      this._onMouseUp = function(e) { self.onMouseUp(e); };
      this._onWheel = function(e) { self.onWheel(e); };
      
      container.addEventListener('mousedown', this._onMouseDown);
      container.addEventListener('mousemove', this._onMouseMove);
      container.addEventListener('mouseup', this._onMouseUp);
      container.addEventListener('mouseleave', this._onMouseUp);
      container.addEventListener('wheel', this._onWheel);
    },
    removeEventListeners: function() {
      var container = this.$refs.dxfContainer;
      if (container) {
        container.removeEventListener('mousedown', this._onMouseDown);
        container.removeEventListener('mousemove', this._onMouseMove);
        container.removeEventListener('mouseup', this._onMouseUp);
        container.removeEventListener('mouseleave', this._onMouseUp);
        container.removeEventListener('wheel', this._onWheel);
      }
    },
    onMouseDown: function(e) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    },
    onMouseMove: function(e) {
      if (!this.isDragging || !this.meshGroup) return;
      
      var deltaX = e.clientX - this.lastMouseX;
      var deltaY = e.clientY - this.lastMouseY;
      
      if (e.shiftKey) {
        // Shift + 拖动 = 平移
        this.panX += deltaX * 100;
        this.panY -= deltaY * 100;
        this.meshGroup.position.x = this.panX;
        this.meshGroup.position.y = this.panY;
      } else {
        // 普通拖动 = 旋转（无角度限制，360度自由旋转）
        this.rotationY += deltaX * 0.01;
        this.rotationX += deltaY * 0.01;
        // 不限制旋转角度
        this.meshGroup.rotation.x = this.rotationX;
        this.meshGroup.rotation.y = this.rotationY;
      }
      
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.render();
    },
    onMouseUp: function() {
      this.isDragging = false;
    },
    onWheel: function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale *= delta;
      this.scale = Math.max(0.1, Math.min(10, this.scale));
      if (this.meshGroup) {
        this.meshGroup.scale.set(this.scale, this.scale, this.scale);
        this.render();
      }
    },
    fetchAndParseDxf: function() {
      var self = this;
      fetch(this.dxfUrl)
        .then(function(response) { return response.text(); })
        .then(function(data) {
          self.parseDxf(data);
          self.loading = false;
        })
        .catch(function(error) {
          console.error('Error loading DXF:', error);
          self.loading = false;
        });
    },
    parseDxf: function(dxfText) {
      var THREE = window.THREE;
      var self = this;
      var lines = dxfText.split('\n');
      var vertices = [];
      var faces = [];
      var i = 0;
      var minX = Infinity, maxX = -Infinity;
      var minY = Infinity, maxY = -Infinity;
      var minZ = Infinity, maxZ = -Infinity;
      var inEntities = false;
      var currentPolyline = null;
      var vertexIndex = 0;

      while (i < lines.length) {
        var line = lines[i].trim();
        if (line === 'ENTITIES') {
          inEntities = true;
        } else if (line === 'ENDSEC' && inEntities) {
          break;
        } else if (line === 'SEQEND') {
          currentPolyline = null;
          vertexIndex = 0;
        } else if (inEntities && line === 'POLYLINE') {
          currentPolyline = { vertices: [], faces: [], startIndex: vertices.length };
        } else if (inEntities && line === 'VERTEX') {
          var x = 0, y = 0, z = 0;
          var isFace = false;
          var f1 = 0, f2 = 0, f3 = 0, f4 = 0;
          i++;
          while (i < lines.length) {
            var code = lines[i].trim();
            var value = lines[i + 1] ? lines[i + 1].trim() : '';
            if (code === '100' && value === 'AcDbFaceRecord') {
              isFace = true;
            } else if (code === '10') { x = parseFloat(value); }
            else if (code === '20') { y = parseFloat(value); }
            else if (code === '30') { z = parseFloat(value); }
            else if (code === '71') { f1 = parseInt(value); }
            else if (code === '72') { f2 = parseInt(value); }
            else if (code === '73') { f3 = parseInt(value); }
            else if (code === '74') { f4 = parseInt(value); }
            else if (code === '0') { break; }
            i += 2;
          }
          if (isFace) {
            var baseIdx = currentPolyline ? currentPolyline.startIndex : 0;
            var idx1 = Math.abs(f1) - 1 + baseIdx;
            var idx2 = Math.abs(f2) - 1 + baseIdx;
            var idx3 = Math.abs(f3) - 1 + baseIdx;
            faces.push([idx1, idx2, idx3]);
            if (f4 !== 0 && Math.abs(f4) !== Math.abs(f3)) {
              var idx4 = Math.abs(f4) - 1 + baseIdx;
              faces.push([idx1, idx3, idx4]);
            }
          } else {
            vertices.push({ x: x, y: y, z: z });
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
          }
          continue;
        }
        i++;
      }

      if (vertices.length === 0) {
        console.log('No vertices found');
        return;
      }

      var centerX = (minX + maxX) / 2;
      var centerY = (minY + maxY) / 2;
      var centerZ = (minZ + maxZ) / 2;
      var size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

      // 创建网格几何体
      var geometry = new THREE.BufferGeometry();
      var positions = [];
      var indices = [];

      vertices.forEach(function(v) {
        positions.push(v.x - centerX, v.y - centerY, v.z - centerZ);
      });

      faces.forEach(function(f) {
        if (f[0] < vertices.length && f[1] < vertices.length && f[2] < vertices.length) {
          indices.push(f[0], f[1], f[2]);
        }
      });

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      
      if (indices.length > 0) {
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // 用线框模式显示
        var material = new THREE.MeshBasicMaterial({ 
          color: 0x00ff00, 
          wireframe: true,
          wireframeLinewidth: 1
        });
        var mesh = new THREE.Mesh(geometry, material);
        this.meshGroup.add(mesh);
        
        // 再加一个实体材质
        var solidMaterial = new THREE.MeshLambertMaterial({ 
          color: 0x1a5f7a, 
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });
        var solidMesh = new THREE.Mesh(geometry.clone(), solidMaterial);
        this.meshGroup.add(solidMesh);
      } else {
        // 没有面数据，用点云
        var pointMaterial = new THREE.PointsMaterial({ color: 0x00ff00, size: size / 500 });
        var points = new THREE.Points(geometry, pointMaterial);
        this.meshGroup.add(points);
      }

      this.camera.position.set(0, 0, size * 1.5);
      this.camera.lookAt(0, 0, 0);

      this.render();
    },
    render: function() {
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }
};
</script>

<style scoped>
.dxf-container {
  width: 100%;
  height: 100%;
  background-color: #1a1a2e;
  cursor: grab;
  position: relative;
}
.dxf-container:active {
  cursor: grabbing;
}
.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #00ff00;
  font-size: 14px;
}
</style>
