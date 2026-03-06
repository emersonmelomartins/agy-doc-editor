import { defineConfig } from '@kubb/core';
import { pluginOas } from '@kubb/plugin-oas';
import { pluginClient } from '@kubb/plugin-client';

export default defineConfig({
  root: '.',
  input: {
    path: '../api/openapi.json',
  },
  output: {
    path: 'src/lib/api-client',
    clean: true,
  },
  plugins: [
    pluginOas(),
    pluginClient({
      client: 'axios',
      output: {
        path: './generated.ts',
      },
    }),
  ],
});
