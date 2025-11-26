import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(() => {
  const runtimeConfig = useRuntimeConfig();

  // Git info can be set at build time via process.env or
  // overridden at runtime via NUXT_PUBLIC_GIT_COMMIT etc.
  return {
    app_name: runtimeConfig.public.appName || 'Web Performance Analyzer',
    git_commit: runtimeConfig.public.gitCommit || null,
    git_branch: runtimeConfig.public.gitBranch || null,
    git_tag: runtimeConfig.public.gitTag || null,
    git_version: runtimeConfig.public.gitVersion || null,
    git_datetime: runtimeConfig.public.gitDatetime || null
  };
});
