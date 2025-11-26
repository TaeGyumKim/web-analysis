import { defineEventHandler } from 'h3';
import { useAppConfig, useRuntimeConfig } from '#imports';

export default defineEventHandler(() => {
  const runtimeConfig = useRuntimeConfig();
  const appConfig = useAppConfig();

  // Nuxt runtime config can be overridden by NUXT_PUBLIC_* env vars at runtime
  // Priority: appConfig > runtimeConfig (which includes NUXT_PUBLIC_* overrides)
  const gitCommit = appConfig.git?.commit || runtimeConfig.public.GIT_COMMIT || null;
  const gitBranch = appConfig.git?.branch || runtimeConfig.public.GIT_BRANCH || null;
  const gitTag = appConfig.git?.tag || runtimeConfig.public.GIT_TAG || null;
  const gitVersion = appConfig.git?.version || runtimeConfig.public.GIT_VERSION || null;
  const gitDatetime = appConfig.git?.datetime || runtimeConfig.public.GIT_DATETIME || null;

  return {
    app_name: appConfig.appName || runtimeConfig.public.APP_NAME || 'Web Performance Analyzer',
    git_commit: gitCommit,
    git_branch: gitBranch,
    git_tag: gitTag,
    git_version: gitVersion,
    git_datetime: gitDatetime
  };
});
