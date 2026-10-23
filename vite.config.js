import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        admin: resolve(__dirname, "admin.html"),
        crudeOil: resolve(__dirname, "crude-oil.html"),
        realEstate: resolve(__dirname, "real-estate.html")
      }
    }
  }
});
