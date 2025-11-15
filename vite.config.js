import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// https://vitejs.dev/config/
export default defineConfig(({}) => ({
	plugins: [preact()],
	optimizeDeps: {
		include: ['codemirror']
	},
	define: {
		'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
	}
}));
