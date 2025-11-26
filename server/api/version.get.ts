import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(() => {
  const runtimeConfig = useRuntimeConfig();

  // Git info is baked at build time via process.env in nuxt.config.ts
  // Runtime override still works via NUXT_PUBLIC_GIT_COMMIT etc.
  const gitCommit = runtimeConfig.public.gitCommit || null;
  const gitBranch = runtimeConfig.public.gitBranch || null;
  const gitTag = runtimeConfig.public.gitTag || null;
  const gitVersion = runtimeConfig.public.gitVersion || null;
  const gitDatetime = runtimeConfig.public.gitDatetime || null;

  return {
    app_name: runtimeConfig.public.appName || 'Web Performance Analyzer',
    git_commit: gitCommit,
    git_branch: gitBranch,
    git_tag: gitTag,
    git_version: gitVersion,
    git_datetime: gitDatetime
  };
});
