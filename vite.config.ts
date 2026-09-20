import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 相対パスでビルドし、どのホスティング先（サブパス含む）でも動くようにする
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
