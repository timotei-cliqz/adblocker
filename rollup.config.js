import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
  input: 'build/es6/index.js',
  output: {
    file: 'adblocker.umd.js',
    name: 'adblocker',
    format: 'umd',
  },
  plugins: [
    json({
      preferConst: true,
      indent: '  ',
    }),

    nodeResolve({
      jsnext: true,
      main: true,
      preferBuiltins: false,
      extensions: [ '.js', '.json' ],
      // pass custom options to the resolve plugin
      customResolveOptions: {
        moduleDirectory: 'node_modules'
      }
    }),

    commonjs({
      include: 'node_modules/**',  // Default: undefined
      extensions: [ '.js', '.json' ],  // Default: [ '.js' ]
      // if false then skip sourceMap generation for CommonJS modules
      sourceMap: false,  // Default: true
    })
  ]
};
