'use strict';
const fs = require('fs');
const path = require('path');
const url = require('url');

function buildManifest(compiler, compilation) {
  let context = compiler.options.context;
  let manifest = {};

  compilation.chunkGroups.forEach(function(chunkGroup) {
    let files = [];
    chunkGroup.chunks.forEach(function(chunk) {
      chunk.files.forEach(function(file) {
        var publicPath = url.resolve(
          compilation.outputOptions.publicPath || '',
          file,
        );
        files.push({
          file,
          publicPath,
          chunkName: chunk.name,
        });
      });
    });

    chunkGroup.blocksIterable.forEach(function(block) {
      let name;
      let id = null;
      let dependency;

      block.module.dependencies.forEach(function(dep) {
        if (dep.request === block.request && !dependency)
          dependency = dep;
      });

      if (dependency) {
        id = dependency.module.id;
        name =
          typeof dependency.module.libIdent === 'function'
            ? dependency.module.libIdent({ context })
            : null;
        console.log(dependency);
      }

      files.forEach(function(file) {
        file.id = id;
        file.name = name;
      });

      manifest[block.request] = files;
    });

    console.log({ files });
  });

  return manifest;
}

class ReactLoadablePlugin {
  constructor(opts = {}) {
    this.filename = opts.filename;
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      const manifest = buildManifest(compiler, compilation);
      var json = JSON.stringify(manifest, null, 2);
      const outputDirectory = path.dirname(this.filename);
      try {
        fs.mkdirSync(outputDirectory);
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
      fs.writeFileSync(this.filename, json);
      callback();
    });
  }
}

function getBundles(manifest, moduleIds) {
  return moduleIds.reduce((bundles, moduleId) => {
    return bundles.concat(manifest[moduleId]);
  }, []);
}

exports.ReactLoadablePlugin = ReactLoadablePlugin;
exports.getBundles = getBundles;
