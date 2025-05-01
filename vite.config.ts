import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api/simplemdm': {
          target: 'https://a.simplemdm.com/api/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/simplemdm/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', function(proxyReq) {
              // Create Basic Auth header with API key
              const auth = `Basic ${Buffer.from(`${env.VITE_SIMPLEMDM_API_KEY}:`, 'utf-8').toString('base64')}`;
              proxyReq.setHeader('Authorization', auth);
            });
          }
        }
      }
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
