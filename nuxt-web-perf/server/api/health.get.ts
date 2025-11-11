/**
 * Health Check API
 * Docker 컨테이너 및 로드 밸런서를 위한 헬스 체크 엔드포인트
 */

export default defineEventHandler(async (event) => {
  const startTime = Date.now();

  try {
    // 기본 헬스 체크
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        api: 'ok',
        memory: 'ok',
        puppeteer: 'ok',
      },
    };

    // 메모리 사용량 체크
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    };

    // 메모리 임계값 체크 (1GB)
    if (memoryUsageMB.heapUsed > 1024) {
      health.checks.memory = 'warning';
      health.status = 'degraded';
    }

    // Puppeteer 설치 확인
    try {
      // Puppeteer가 설치되어 있는지 확인
      const puppeteerModule = await import('puppeteer');
      if (!puppeteerModule) {
        health.checks.puppeteer = 'error';
        health.status = 'degraded';
      }
    } catch (error) {
      health.checks.puppeteer = 'error';
      health.status = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;

    return {
      ...health,
      memory: memoryUsageMB,
      responseTime: `${responseTime}ms`,
    };
  } catch (error) {
    // 에러 발생 시 unhealthy 상태 반환
    setResponseStatus(event, 503);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
