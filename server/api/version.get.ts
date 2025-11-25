import { defineEventHandler } from 'h3';
import { useAppConfig, useRuntimeConfig } from '#imports';

export default defineEventHandler(() => {
  const runtimeConfig = useRuntimeConfig();
  const appConfig = useAppConfig();

  return {
    app_name: appConfig.appName ?? runtimeConfig.public.APP_NAME,
    git_commit: appConfig.git?.commit ?? runtimeConfig.public.GIT_COMMIT,
    git_branch: appConfig.git?.branch ?? runtimeConfig.public.GIT_BRANCH,
    git_tag: appConfig.git?.tag ?? runtimeConfig.public.GIT_TAG,
    git_version: appConfig.git?.version ?? runtimeConfig.public.GIT_VERSION,
    git_datetime: appConfig.git?.datetime ?? runtimeConfig.public.GIT_DATETIME
  };
});
