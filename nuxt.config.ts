import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      APP_NAME: process.env.APP_NAME || 'Web Performance Analyzer',
      GIT_COMMIT: process.env.GIT_COMMIT || '',
      GIT_BRANCH: process.env.GIT_BRANCH || '',
      GIT_TAG: process.env.GIT_TAG || '',
      GIT_VERSION: process.env.GIT_VERSION || '',
      GIT_DATETIME: process.env.GIT_DATETIME || ''
    }
  },
  app: {
    head: {
      title: 'Web Performance Analyzer',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Analyze web page loading performance for designers and non-developers'
        }
      ]
    }
  },
  typescript: {
    tsConfig: {
      exclude: ['../dist']
    }
  },
  vite: {
    vue: {
      script: {
        propsDestructure: false
      }
    }
  },
  hooks: {
    'build:before': () => {
      const tsconfigPath = resolve('.nuxt/tsconfig.json');
      const tsconfigFiles = [
        '.nuxt/tsconfig.app.json',
        '.nuxt/tsconfig.shared.json',
        '.nuxt/tsconfig.node.json'
      ];

      if (existsSync(tsconfigPath)) {
        const tsconfig = readFileSync(tsconfigPath, 'utf-8');

        tsconfigFiles.forEach(file => {
          const filePath = resolve(file);
          if (!existsSync(filePath)) {
            writeFileSync(filePath, tsconfig);
          }
        });
      }
    }
  }
});
