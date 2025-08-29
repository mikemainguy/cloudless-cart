import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default [
  // Browser build with bundled dependencies
  {
    input: 'src/browser-index.ts',
    output: {
      file: 'dist/browser/cloudless-cart.js',
      format: 'umd',
      name: 'CloudlessCart',
      exports: 'named',
      globals: {
        'crypto': 'crypto',
        'fs': 'fs',
        'path': 'path',
        'util': 'util',
        'buffer': 'Buffer'
      },
      inlineDynamicImports: true
    },
    external: ['crypto', 'fs', 'path', 'util', 'buffer', 'brotli'],
    plugins: [
      typescript({
        declaration: false,
        outDir: 'dist/browser',
        target: 'es2015',
        module: 'esnext'
      }),
      resolve({
        browser: true,
        preferBuiltins: false,
        resolveOnly: [
          /^(?!brotli$)/  // Don't resolve the Node.js 'brotli' package
        ]
      }),
      commonjs({
        ignore: ['brotli']  // Ignore Node.js brotli in commonjs transform
      })
    ],
    onwarn: (warning, warn) => {
      // Ignore certain warnings
      if (warning.code === 'UNRESOLVED_IMPORT') return;
      if (warning.code === 'EVAL') return;
      warn(warning);
    }
  },
  // Minified version
  {
    input: 'src/browser-index.ts',
    output: {
      file: 'dist/browser/cloudless-cart.min.js',
      format: 'umd',
      name: 'CloudlessCart',
      exports: 'named',
      globals: {
        'crypto': 'crypto',
        'fs': 'fs',
        'path': 'path',
        'util': 'util',
        'buffer': 'Buffer'
      },
      inlineDynamicImports: true
    },
    external: ['crypto', 'fs', 'path', 'util', 'buffer', 'brotli'],
    plugins: [
      typescript({
        declaration: false,
        outDir: 'dist/browser',
        target: 'es2015',
        module: 'esnext'
      }),
      resolve({
        browser: true,
        preferBuiltins: false,
        resolveOnly: [
          /^(?!brotli$)/  // Don't resolve the Node.js 'brotli' package
        ]
      }),
      commonjs({
        ignore: ['brotli']  // Ignore Node.js brotli in commonjs transform
      }),
      terser()
    ],
    onwarn: (warning, warn) => {
      // Ignore certain warnings
      if (warning.code === 'UNRESOLVED_IMPORT') return;
      if (warning.code === 'EVAL') return;
      warn(warning);
    }
  }
];