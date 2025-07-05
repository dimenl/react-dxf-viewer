import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/index.tsx',
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      useTsconfigDeclarationDir: true
    })
  ],
  external: ['react', 'react-dom', 'three', 'dxf-parser']
};
