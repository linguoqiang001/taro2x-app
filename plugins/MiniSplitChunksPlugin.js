"use strict";

const path = require("path");
const fs = require("fs-extra");
const mkdirp = require("mkdirp");
const md5 = require("md5");
const SplitChunksPlugin = require("webpack/lib/optimize/SplitChunksPlugin");
const webpack_sources_1 = require("webpack-sources");
const helper_1 = require("@tarojs/helper");
const shared_1 = require("@tarojs/shared");
const PLUGIN_NAME = 'MiniSplitChunkPlugin';
const SUB_COMMON_DIR = 'sub-common';
const SUB_VENDORS_NAME = 'sub-vendors';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

function createBabelRegister({ only }) {
  require('@babel/register')({
    only: Array.from(new Set([...only])),
    presets: [
      require.resolve('@babel/preset-env'),
      require.resolve('@babel/preset-typescript')
    ],
    plugins: [
      [require.resolve('@babel/plugin-proposal-decorators'), {
        legacy: true
      }],
      require.resolve('@babel/plugin-proposal-class-properties'),
      require.resolve('@babel/plugin-proposal-object-rest-spread'),
      [require.resolve('@babel/plugin-transform-runtime'), {
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules: false,
        absoluteRuntime: path.resolve(__dirname, '..', 'node_modules/@babel/runtime')
      }]
    ],
    extensions: ['.jsx', '.js', '.ts', '.tsx'],
    babelrc: false,
    configFile: false,
    cache: false
  });
}

function createBabelRegister({ only }) {
  require('@babel/register')({
    only: Array.from(new Set([...only])),
    presets: [
      require.resolve('@babel/preset-env'),
      require.resolve('@babel/preset-typescript')
    ],
    plugins: [
      [require.resolve('@babel/plugin-proposal-decorators'), {
        legacy: true
      }],
      require.resolve('@babel/plugin-proposal-class-properties'),
      require.resolve('@babel/plugin-proposal-object-rest-spread'),
      [require.resolve('@babel/plugin-transform-runtime'), {
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules: false,
        absoluteRuntime: path.resolve(__dirname, '..', 'node_modules/@babel/runtime')
      }]
    ],
    extensions: ['.jsx', '.js', '.ts', '.tsx'],
    babelrc: false,
    configFile: false,
    cache: false
  });
}

helper_1.readConfig = function (configPath) {
  let result = {};
  if (fs.existsSync(configPath)) {
    // babelRegister_1.default({
    //   only: [configPath]
    // });
    // delete require.cache[configPath];
    result = require(configPath)
  }
  return result;
}

helper_1.resolveMainFilePath = function (p, extArrs = ['.js', '.jsx', '.ts', '.tsx']) {
  const realPath = p;
  const taroEnv = process.env.TARO_ENV;
  for (let i = 0; i < extArrs.length; i++) {
    const item = extArrs[i];
    if (taroEnv) {
      if (fs.existsSync(`${p}.${taroEnv}${item}`)) {
        return `${p}.${taroEnv}${item}`;
      }
      if (fs.existsSync(`${p}${path.sep}index.${taroEnv}${item}`)) {
        return `${p}${path.sep}index.${taroEnv}${item}`;
      }
      if (fs.existsSync(`${p.replace(/\/index$/, `.${taroEnv}/index`)}${item}`)) {
        return `${p.replace(/\/index$/, `.${taroEnv}/index`)}${item}`;
      }
    }
    if (fs.existsSync(`${p}${item}`)) {
      return `${p}${item}`;
    }
    if (fs.existsSync(`${p}${path.sep}index${item}`)) {
      return `${p}${path.sep}index${item}`;
    }
  }
  return realPath;
}

var FileExtsMap;
(function (FileExtsMap) {
  FileExtsMap["JS"] = ".js";
  FileExtsMap["JS_MAP"] = ".js.map";
  FileExtsMap["STYLE"] = ".wxss";
})(FileExtsMap || (FileExtsMap = {}));
class MiniSplitChunksPlugin extends SplitChunksPlugin {
  constructor(options) {
    super();
    /**
     * ???????????? tapAsync
     */
    this.tryAsync = fn => (arg, callback) => __awaiter(this, void 0, void 0, function* () {
      try {
        yield fn(arg);
        callback();
      }
      catch (err) {
        callback(err);
      }
    });
    // this.options = null;
    this.subCommonDeps = new Map();
    this.chunkSubCommons = new Map();
    this.subPackagesVendors = new Map();
    this.distPath = '';
    this.exclude = options.exclude || [];
  }
  apply(compiler) {
    var _a, _b;
    this.context = compiler.context;
    this.subPackages = this.getSubpackageConfig(compiler).map((subPackage) => (Object.assign(Object.assign({}, subPackage), { root: this.formatSubRoot(subPackage.root) })));
    this.subRoots = this.subPackages.map((subPackage) => subPackage.root);
    this.subRootRegExps = this.subRoots.map((subRoot) => new RegExp(`^${subRoot}\\/`));
    this.distPath = (_b = (_a = compiler === null || compiler === void 0 ? void 0 : compiler.options) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.path;
    this.isDevMode = compiler.options.mode === 'development';
    /**
     * ????????????SplitChunksPlugin???apply?????????????????????????????????
     */
    super.apply(compiler);
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.optimizeChunks.tap(PLUGIN_NAME, (chunks) => {
        var _a, _b, _c, _d, _e;
        this.subCommonDeps = new Map();
        this.chunkSubCommons = new Map();
        this.subPackagesVendors = new Map();
        /**
         * ??????????????????chunks
         */
        const subChunks = chunks.filter(chunk => this.isSubChunk(chunk));
        if (subChunks.length === 0) {
          return;
        }
        subChunks.forEach((subChunk) => {
          const modules = Array.from(subChunk.modulesIterable);
          modules.map((module) => {
            if (this.hasExclude() && this.isExcludeModule(module)) {
              return;
            }
            const chunks = Array.from(module.chunksIterable);
            /**
             * ?????????????????????????????????????????????????????????module???????????????subCommonDeps???
             */
            if (!this.hasMainChunk(chunks) && this.isSubsDep(chunks)) {
              let depPath = '';
              let depName = '';
              if (module.resource) {
                depPath = module.resource;
              }
              else {
                depPath = module._identifier;
              }
              if (this.isDevMode) {
                /**
                 * ??????????????????????????????sub-common???????????????????????????????????????sub-common????????????????????????chunk????????????copy???????????????
                 */
                depName = md5(depPath + new Date().getTime());
              }
              else {
                depName = md5(depPath);
              }
              if (!this.subCommonDeps.has(depName)) {
                const subCommonDepChunks = new Set(chunks.map(chunk => chunk.name));
                this.subCommonDeps.set(depName, {
                  identifier: module._identifier,
                  resource: module.resource,
                  chunks: subCommonDepChunks
                });
              }
              else {
                const subCommonDep = this.subCommonDeps.get(depName);
                chunks.map(chunk => subCommonDep.chunks.add(chunk.name));
                this.subCommonDeps.set(depName, subCommonDep);
              }
            }
          });
        });
        /**
         * ?????????option??????????????????cacheGroups??????
         */
        this.options = SplitChunksPlugin.normalizeOptions(Object.assign(Object.assign({}, (_b = (_a = compiler === null || compiler === void 0 ? void 0 : compiler.options) === null || _a === void 0 ? void 0 : _a.optimization) === null || _b === void 0 ? void 0 : _b.splitChunks), { cacheGroups: Object.assign(Object.assign(Object.assign({}, (_e = (_d = (_c = compiler === null || compiler === void 0 ? void 0 : compiler.options) === null || _c === void 0 ? void 0 : _c.optimization) === null || _d === void 0 ? void 0 : _d.splitChunks) === null || _e === void 0 ? void 0 : _e.cacheGroups), this.getSubPackageVendorsCacheGroup()), this.getSubCommonCacheGroup()) }));
      });
      /**
       * ??????????????????sub-vendors???sub-common????????????????????????
       */
      compilation.hooks.afterOptimizeChunks.tap(PLUGIN_NAME, (chunks) => {
        const existSubCommonDeps = new Map();
        chunks.forEach(chunk => {
          const chunkName = chunk.name;
          if (this.matchSubVendors(chunk)) {
            const subRoot = this.subRoots.find(subRoot => new RegExp(`^${subRoot}\\/`).test(chunkName));
            this.subPackagesVendors.set(subRoot, chunk);
          }
          if (this.matchSubCommon(chunk)) {
            const depName = chunkName.replace(new RegExp(`^${SUB_COMMON_DIR}\\/(.*)`), '$1');
            if (this.subCommonDeps.has(depName)) {
              existSubCommonDeps.set(depName, this.subCommonDeps.get(depName));
            }
          }
        });
        this.setChunkSubCommons(existSubCommonDeps);
        this.subCommonDeps = existSubCommonDeps;
      });
      /**
       * ?????????page????????????require
       */
      compilation.chunkTemplate.hooks.renderWithEntry.tap(PLUGIN_NAME, (modules, chunk) => {
        if (this.isSubChunk(chunk)) {
          const chunkName = chunk.name;
          const chunkSubRoot = this.subRoots.find(subRoot => new RegExp(`^${subRoot}\\/`).test(chunkName));
          const chunkAbsulutePath = path.resolve(this.distPath, chunkName);
          const source = new webpack_sources_1.ConcatSource();
          const hasSubVendors = this.subPackagesVendors.has(chunkSubRoot);
          const subVendors = this.subPackagesVendors.get(chunkSubRoot);
          const subCommon = [...(this.chunkSubCommons.get(chunkName) || [])];
          /**
           * require???????????????sub-vendors
           */
          if (hasSubVendors) {
            const subVendorsAbsolutePath = path.resolve(this.distPath, subVendors.name);
            const relativePath = this.getRealRelativePath(chunkAbsulutePath, subVendorsAbsolutePath);
            source.add(`require(${JSON.stringify(relativePath)});\n`);
          }
          // require sub-common????????????
          if (subCommon.length > 0) {
            subCommon.forEach(moduleName => {
              const moduleAbsulutePath = path.resolve(this.distPath, chunkSubRoot, SUB_COMMON_DIR, moduleName);
              const relativePath = this.getRealRelativePath(chunkAbsulutePath, moduleAbsulutePath);
              source.add(`require(${JSON.stringify(relativePath)});\n`);
            });
          }
          source.add(modules);
          source.add(';');
          return source;
        }
      });
    });
    compiler.hooks.emit.tapAsync(PLUGIN_NAME, this.tryAsync((compilation) => {
      const assets = compilation.assets;
      const subChunks = compilation.entries.filter(entry => entry.miniType === 'PAGE' && this.isSubChunk(entry));
      subChunks.forEach(subChunk => {
        const subChunkName = subChunk.name;
        const subRoot = this.subRoots.find(subRoot => new RegExp(`^${subRoot}\\/`).test(subChunkName));
        const chunkWxssName = `${subChunkName}${FileExtsMap.STYLE}`;
        const subCommon = [...(this.chunkSubCommons.get(subChunkName) || [])];
        const wxssAbsulutePath = path.resolve(this.distPath, chunkWxssName);
        const subVendorsWxssPath = path.join(subRoot, `${SUB_VENDORS_NAME}${FileExtsMap.STYLE}`);
        const source = new webpack_sources_1.ConcatSource();
        if (assets[this.formatSystemPath(subVendorsWxssPath)]) {
          const subVendorsAbsolutePath = path.resolve(this.distPath, subVendorsWxssPath);
          const relativePath = this.getRealRelativePath(wxssAbsulutePath, subVendorsAbsolutePath);
          source.add(`@import ${JSON.stringify(relativePath)};\n`);
        }
        if (subCommon.length > 0) {
          subCommon.forEach(moduleName => {
            const wxssFileName = `${moduleName}${FileExtsMap.STYLE}`;
            const wxssFilePath = path.join(SUB_COMMON_DIR, wxssFileName);
            if (assets[this.formatSystemPath(wxssFilePath)]) {
              const moduleAbsulutePath = path.resolve(this.distPath, subRoot, SUB_COMMON_DIR, wxssFileName);
              const relativePath = this.getRealRelativePath(wxssAbsulutePath, moduleAbsulutePath);
              source.add(`@import ${JSON.stringify(`${relativePath}`)};\n`);
            }
          });
        }
        if (assets[chunkWxssName]) {
          const originSource = assets[chunkWxssName].source();
          source.add(originSource);
        }
        assets[chunkWxssName] = {
          size: () => source.source().length,
          source: () => source.source()
        };
      });
    }));
    compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
      const subCommonPath = path.resolve(this.distPath, SUB_COMMON_DIR);
      if (!fs.pathExistsSync(subCommonPath)) {
        return;
      }
      this.subCommonDeps.forEach((subCommonDep, depName) => {
        const chunks = [...subCommonDep.chunks];
        const needCopySubRoots = chunks.reduce((set, chunkName) => {
          const subRoot = this.subRoots.find(subRoot => new RegExp(`^${subRoot}\\/`).test(chunkName));
          if (subRoot) {
            set.add(subRoot);
          }
          return set;
        }, new Set());
        /**
         * sub-common?????????copy?????????????????????????????????/sub-common
         */
        needCopySubRoots.forEach(needCopySubRoot => {
          for (const key in FileExtsMap) {
            const ext = FileExtsMap[key];
            const fileNameWithExt = `${depName}${ext}`;
            const sourcePath = path.resolve(subCommonPath, fileNameWithExt);
            const targetDirPath = path.resolve(this.distPath, needCopySubRoot, SUB_COMMON_DIR);
            const targetPath = path.resolve(targetDirPath, fileNameWithExt);
            /**
             * ??????????????????????????????????????????
             */
            mkdirp.sync(targetDirPath);
            if (fs.pathExistsSync(sourcePath)) {
              fs.outputFileSync(targetPath, fs.readFileSync(sourcePath));
            }
          }
        });
      });
      /**
       * ?????????????????????????????????sub-common
       */
      fs.emptyDirSync(subCommonPath);
      fs.removeSync(subCommonPath);
    });
  }
  /**
   * ?????? webpack entry ??????????????????????????????
   */
  getAppEntry(compiler) {
    const originalEntry = compiler.options.entry;
    return path.resolve(this.context, originalEntry.app[0]);
  }
  /**
   * ??????????????????
   */
  getSubpackageConfig(compiler) {
    const appEntry = this.getAppEntry(compiler);
    const appConfigPath = this.getConfigFilePath(appEntry);
    const appConfig = helper_1.readConfig(appConfigPath);
    return appConfig.subPackages || appConfig.subpackages || [];
  }
  /**
   * ?????? app?????????????????????????????????????????? config ?????????????????????
   */
  getConfigFilePath(filePath) {
    return helper_1.resolveMainFilePath(`${filePath.replace(path.extname(filePath), '')}.config`);
  }
  /**
   * ???????????????/
   */
  formatSubRoot(subRoot) {
    const lastApl = subRoot[subRoot.length - 1];
    if (lastApl === '/') {
      subRoot = subRoot.slice(0, subRoot.length - 1);
    }
    return subRoot;
  }
  isSubChunk(chunk) {
    const isSubChunk = this.subRootRegExps.find(subRootRegExp => subRootRegExp.test(chunk.name));
    return !!isSubChunk;
  }
  /**
   * match *\/sub-vendors
   */
  matchSubVendors(chunk) {
    const subVendorsRegExps = this.subRoots.map(subRoot => new RegExp(`^${this.formatSystemPath(path.join(subRoot, SUB_VENDORS_NAME))}$`));
    const isSubVendors = subVendorsRegExps.find(subVendorsRegExp => subVendorsRegExp.test(chunk.name));
    return !!isSubVendors;
  }
  /**
   * match sub-common\/*
   */
  matchSubCommon(chunk) {
    return new RegExp(`^${SUB_COMMON_DIR}\\/`).test(chunk.name);
  }
  /**
   * ??????module?????????????????????
   */
  hasMainChunk(chunks) {
    const chunkNames = chunks.map(chunk => chunk.name);
    let hasMainChunk = false;
    /**
     * ??????chunk????????????????????????chunk?????????????????????root????????????????????????chunk
     */
    chunkNames.forEach((chunkName) => {
      const isMatch = this.subRootRegExps.find(subRootRegExp => subRootRegExp.test(chunkName));
      if (!isMatch) {
        hasMainChunk = true;
      }
    });
    return hasMainChunk;
  }
  /**
   * ?????????module???????????????????????????
   */
  isSubsDep(chunks) {
    const chunkNames = chunks.map(chunk => chunk.name);
    const chunkSubRoots = new Set();
    chunkNames.forEach((chunkName) => {
      this.subRoots.forEach((subRoot) => {
        if (new RegExp(`^${subRoot}\\/`).test(chunkName)) {
          chunkSubRoots.add(subRoot);
        }
      });
    });
    return [...chunkSubRoots].length > 1;
  }
  /**
   * ?????????????????????module?????????????????????sub-vendors
   */
  getSubPackageVendorsCacheGroup() {
    const subPackageVendorsCacheGroup = {};
    this.subRoots.forEach(subRoot => {
      subPackageVendorsCacheGroup[subRoot] = {
        test: (module, chunks) => {
          if (this.hasExclude() && this.isExcludeModule(module)) {
            return false;
          }
          return chunks.every(chunk => new RegExp(`^${subRoot}\\/`).test(chunk.name));
        },
        name: this.formatSystemPath(path.join(subRoot, SUB_VENDORS_NAME)),
        minChunks: 2,
        priority: 10000
      };
    });
    return subPackageVendorsCacheGroup;
  }
  /**
   * ???????????????????????? ??????????????????????????? ?????????????????????????????????sub-common???
   */
  getSubCommonCacheGroup() {
    const subCommonCacheGroup = {};
    this.subCommonDeps.forEach((depInfo, depName) => {
      const cacheGroupName = this.formatSystemPath(path.join(SUB_COMMON_DIR, depName));
      subCommonCacheGroup[cacheGroupName] = {
        name: cacheGroupName,
        test: module => {
          if (!module.resource) {
            return module._identifier === depInfo.identifier;
          }
          return module.resource === depInfo.resource;
        },
        priority: 1000
      };
    });
    return subCommonCacheGroup;
  }
  hasExclude() {
    return shared_1.isArray(this.exclude) && this.exclude.length > 0;
  }
  isExcludeModule(module) {
    const moduleResource = module.resource;
    for (let i = 0; i < this.exclude.length; i++) {
      const excludeItem = this.exclude[i];
      if (shared_1.isString(excludeItem) && excludeItem === moduleResource) {
        return true;
      }
      if (shared_1.isFunction(excludeItem) && excludeItem(module)) {
        return true;
      }
    }
    return false;
  }
  setChunkSubCommons(subCommonDeps) {
    const chunkSubCommons = new Map();
    subCommonDeps.forEach((depInfo, depName) => {
      const chunks = [...depInfo.chunks];
      chunks.forEach(chunk => {
        if (chunkSubCommons.has(chunk)) {
          const chunkSubCommon = chunkSubCommons.get(chunk);
          chunkSubCommon.add(depName);
          chunkSubCommons.set(chunk, chunkSubCommon);
        }
        else {
          chunkSubCommons.set(chunk, new Set([depName]));
        }
      });
    });
    this.chunkSubCommons = chunkSubCommons;
  }
  /**
   * ??????page??????????????????????????????
   */
  getRealRelativePath(from, to) {
    return helper_1.promoteRelativePath(path.relative(from, to));
  }
  /**
   * ???window?????????????????????????????????/
   */
  formatSystemPath(p) {
    return p.replace(/\\/g, '/');
  }
}
module.exports = MiniSplitChunksPlugin;
//# sourceMappingURL=MiniSplitChunksPlugin.js.map