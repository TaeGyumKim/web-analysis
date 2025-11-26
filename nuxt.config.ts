import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css'],
  runtimeConfig: {
    public: {
      appName: process.env.APP_NAME || 'Web Performance Analyzer',
      gitCommit: process.env.GIT_COMMIT || '',
      gitBranch: process.env.GIT_BRANCH || '',
      gitTag: process.env.GIT_TAG || '',
      gitVersion: process.env.GIT_VERSION || '',
      gitDatetime: process.env.GIT_DATETIME || ''
    }
  },
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config',
    exposeConfig: false
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  ssr: true,
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
    },
    build: {
      cssCodeSplit: false
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
