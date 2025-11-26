import { defineEventHandler } from 'h3';
import { useAppConfig, useRuntimeConfig } from '#imports';

export default defineEventHandler(() => {
  const runtimeConfig = useRuntimeConfig();
  const appConfig = useAppConfig();

  // Nuxt runtime config can be overridden by NUXT_PUBLIC_* env vars at runtime
  // NUXT_PUBLIC_GIT_COMMIT -> runtimeConfig.public.gitCommit (camelCase mapping)
  const gitCommit = appConfig.git?.commit || runtimeConfig.public.gitCommit || null;
  const gitBranch = appConfig.git?.branch || runtimeConfig.public.gitBranch || null;
  const gitTag = appConfig.git?.tag || runtimeConfig.public.gitTag || null;
  const gitVersion = appConfig.git?.version || runtimeConfig.public.gitVersion || null;
  const gitDatetime = appConfig.git?.datetime || runtimeConfig.public.gitDatetime || null;

  return {
    app_name: appConfig.appName || runtimeConfig.public.appName || 'Web Performance Analyzer',
    git_commit: gitCommit,
    git_branch: gitBranch,
    git_tag: gitTag,
    git_version: gitVersion,
    git_datetime: gitDatetime
  };
});
