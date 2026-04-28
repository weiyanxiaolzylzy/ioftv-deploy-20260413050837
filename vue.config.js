/*
 * @Author: daidai
 * @Date: 2021-11-22 14:57:15
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-04-29 15:12:50
 */
const path = require("path");
function resolve(dir) {
  return path.join(__dirname, dir);
}

const normalizeDevApiTarget = (raw) => {
  if (!raw) return 'http://localhost:8890'
  const s = String(raw).trim()
  return s.replace(/^['"]|['"]$/g, '')
}

const devApiTarget = normalizeDevApiTarget(process.env.VUE_APP_BASE_API) || 'http://localhost:8890'

module.exports = {
  publicPath: './',
  outputDir: process.env.VUE_APP_outputDir || 'dist',
  assetsDir: 'static',
  filenameHashing: true,
  lintOnSave: false,
  runtimeCompiler: false,
  transpileDependencies: [
    'three-dxf',
    'dxf-parser',
    '@dxfom/mtext',
    'fast-png',
    'iobuffer',
    'jspdf',
    // web-ifc: 加入 transpileDependencies 以转译可选链等新语法，
    // 同时在 splitChunks 中排除，防止 webpack 将 Emscripten WASM 模块拆散导致
    // WebAssembly.instantiate 报错 "Import #0 env: module is not an object"。
    'web-ifc',
  ],
  productionSourceMap: false,
  css: {
    // 是否使用css分离插件 ExtractTextPlugin
    extract: process.env.NODE_ENV === "production" ? true : false,//是否将组件中的 CSS 提取至一个独立的 CSS 文件中 (而不是动态注入到 JavaScript 中的 inline 代码)。
    sourceMap: false,//是否为 CSS 开启 source map。设置为 true 之后可能会影响构建的性能。
    loaderOptions: {
      sass: {
        prependData: `@import "@/assets/css/variable.scss";`
      }
    },
    requireModuleExtension: true,
  },

  chainWebpack: (config) => {
    // ─── 关键修复：web-ifc / web-ifc-viewer 不能被 splitChunks 分割 ─────────────
    // web-ifc 是 Emscripten 编译的库，其 WASM 模块对 import 对象有严格依赖关系。
    // 一旦被 webpack splitChunks 拆散，Emscripten 的 "env" 导入对象就会丢失，
    // 导致 WebAssembly.instantiate 报错 "Import #0 env: module is not an object"。
    // 因此将 web-ifc 相关包排除在所有代码分割策略之外，强制内联到使用它的 chunk 中。
    config.optimization.splitChunks.cacheGroups = {
      ...(config.optimization.splitChunks.cacheGroups || {}),
      'web-ifc-exclude': {
        test(module) {
          const resource = module.resource || '';
          return /[\\/]node_modules[\\/]web-ifc[\\/]/.test(resource);
        },
        chunks: 'all',
        priority: 999,
        enforce: true,
        name: false,
      },
    };

    // 处理 .mjs / .node.js 文件中的可选链等新语法
    config.module
      .rule('mjs')
      .test(/\.(mjs|node\.js)$/)
      .include
        .add(/node_modules/)
        .end()
      .type('javascript/auto');

    // 扩展 babel-loader 以处理 .mjs 文件
    config.module
      .rule('js')
      .test(/\.(js|mjs|jsx)$/);

    // 配置别名
    config.resolve.alias
      .set('@', resolve('src'))
      .set('@beifen', resolve('src/beifen_project'))
      .set('assets', resolve('src/assets'))
      .set('assetsBig', resolve('src/pages/big-screen/assets'))
      .set('components', resolve('src/components'))
      .set('views', resolve('src/views'))
      .set('api', resolve('src/api'))
      .set('lib', resolve('src/lib'))

    if (process.env.NODE_ENV === "production") {
      config.optimization.delete("splitChunks");
    }

    // 删除预加载
    //  // 移除 prefetch  插件
    //  config.plugins.delete('prefetch-index')
    //  // 移除 preload 插件
    //  config.plugins.delete('preload-index');
    //   config.optimization.minimizer('terser').tap((args) => {
    //     // 去除生产环境console
    //     args[0].terserOptions.compress.drop_console = true
    //     return args
    //   })
  },
  configureWebpack: config => {
    // 给输出的js名称添加hash
    config.output.filename = "static/js/[name].[hash].js";
    config.output.chunkFilename = "static/js/[name].[hash].js";
    config.optimization = {
      splitChunks: {
        cacheGroups: {
          // 抽离所有入口的公用资源为一个chunk
          common: {
            name: "chunk-common",
            chunks: "initial",
            minChunks: 2,
            maxInitialRequests: 5,
            minSize: 0,
            priority: 1,
            reuseExistingChunk: true,
            enforce: true
          },
          // 抽离node_modules下的库为一个chunk
          // vendors: {
          //   name: "chunk-vendors",
          //   test: /[\\/]node_modules[\\/]/,
          //   chunks: "initial",
          //   priority: 2,
          //   reuseExistingChunk: true,
          //   enforce: true
          // },
          element: {
            name: "chunk-element-ui",
            test: /[\\/]node_modules[\\/]element-ui[\\/]/,
            chunks: "all",
            priority: 3,
            reuseExistingChunk: true,
            enforce: true
          },
          yhhtUi: {
            name: "chunk-yhht-ui",
            test: /[\\/]node_modules[\\/]yhht-ui[\\/]/,
            chunks: "all",
            priority: 4,
            reuseExistingChunk: true,
            enforce: true
          },
          datav: {
            name: "chunk-datav",
            test: /[\\/]node_modules[\\/]@jiaminghi[\\/]data-view[\\/]/,
            chunks: "all",
            priority: 4,
            reuseExistingChunk: true,
            enforce: true
          },
        }
      }
    };
  },
  // 是否为 Babel 或 TypeScript 使用 thread-loader。该选项在系统的 CPU 有多于一个内核时自动启用，仅作用于生产构建。
  parallel: false,

  devServer: {
    port: 8080,
    contentBase: path.join(__dirname, 'public'),
    before(app, server) {
      app.use((req, res, next) => {
        const url = req.url.split('?')[0];
        if (url.match(/\.wasm$/)) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        if (url.match(/\/map-geojson\//)) {
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Pragma', 'no-cache');
        }
        next();
      });
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/api/ply': {
        // PlyCloudWeb 点云后端（FastAPI 运行在 8000）
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 代理 PlyCloudWeb 上传的原始 PLY 文件
      '/ply-uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ply-uploads/, '/uploads'),
      },
      '/api': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/uploads': {
        target: devApiTarget,
        changeOrigin: true
      },
      '/wasm': {
        target: devApiTarget,
        changeOrigin: true
      },
      // 代理 IFC 独立查看器（开发模式下 Vite 在 5173 端口）
      '/ifc': {
        target: devApiTarget,
        changeOrigin: true,
      }
    }
  },
  pluginOptions: {
  }
}
