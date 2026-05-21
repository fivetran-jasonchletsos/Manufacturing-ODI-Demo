import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages will serve at /Manufacturing-ODI-Demo/.
// Override with VITE_BASE=/ when previewing at root.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/Manufacturing-ODI-Demo/',
});
