import puppeteer from 'puppeteer';
import type { AnalysisResult } from '~/types/performance';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ result: AnalysisResult }>(event);

    if (!body || !body.result) {
      throw createError({
        statusCode: 400,
        message: 'Analysis result is required'
      });
    }

    const result = body.result;

    // Generate HTML content for PDF
    const htmlContent = generateReportHTML(result);

    // Launch Puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    const page = await browser.newPage();

    // Set content and wait for it to render
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF with options
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();

    // Set response headers
    setResponseHeaders(event, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="performance-report-${Date.now()}.pdf"`,
      'Content-Length': pdfBuffer.length.toString()
    });

    return pdfBuffer;

  } catch (error: any) {
    console.error('PDF generation error:', error);
    throw createError({
      statusCode: 500,
      message: `Failed to generate PDF: ${error.message}`
    });
  }
});

function generateReportHTML(result: AnalysisResult): string {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getMetricColor = (value: number, threshold: { good: number; poor: number }): string => {
    if (value <= threshold.good) return '#10b981';
    if (value <= threshold.poor) return '#f59e0b';
    return '#ef4444';
  };

  const totalSize = result.networkRequests.reduce((sum, req) => sum + req.size, 0);
  const imageCount = result.networkRequests.filter(r => r.type.toLowerCase() === 'image').length;
  const cssCount = result.networkRequests.filter(r => r.type.toLowerCase() === 'stylesheet').length;
  const jsCount = result.networkRequests.filter(r => r.type.toLowerCase() === 'script').length;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Analysis Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }

    .header .url {
      font-size: 14px;
      opacity: 0.9;
      word-break: break-all;
    }

    .header .timestamp {
      font-size: 12px;
      opacity: 0.8;
      margin-top: 10px;
    }

    .container {
      padding: 0 30px 30px;
    }

    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 8px;
    }

    .score-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 30px;
    }

    .score-value {
      font-size: 64px;
      font-weight: bold;
      margin: 10px 0;
    }

    .score-label {
      font-size: 16px;
      opacity: 0.9;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }

    .metric-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    .metric-name {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .metric-description {
      font-size: 11px;
      color: #888;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }

    .stat-box {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 11px;
      color: #666;
    }

    .network-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 11px;
    }

    .network-table th {
      background: #667eea;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }

    .network-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e0e0e0;
    }

    .network-table tr:nth-child(even) {
      background: #f8f9fa;
    }

    .long-task-list {
      margin-top: 15px;
    }

    .long-task-item {
      background: #fff3cd;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      border-left: 3px solid #f59e0b;
      font-size: 12px;
    }

    .long-task-item strong {
      color: #856404;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      font-size: 11px;
      color: #888;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      color: white;
    }

    .badge-good { background: #10b981; }
    .badge-warning { background: #f59e0b; }
    .badge-poor { background: #ef4444; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 웹 성능 분석 리포트</h1>
    <div class="url">URL: ${result.url}</div>
    <div class="timestamp">생성일시: ${new Date(result.timestamp).toLocaleString('ko-KR')}</div>
  </div>

  <div class="container">
    <!-- Overall Score -->
    <div class="score-card">
      <div class="score-label">종합 성능 점수</div>
      <div class="score-value">${result.performanceScore.overall}</div>
      <div class="score-label">/ 100</div>
    </div>

    <!-- Core Web Vitals -->
    <div class="section">
      <h2 class="section-title">📊 Core Web Vitals</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-name">FCP (First Contentful Paint)</div>
          <div class="metric-value" style="color: ${getMetricColor(result.metrics.fcp || 0, { good: 1800, poor: 3000 })}">${(result.metrics.fcp || 0).toFixed(0)}ms</div>
          <div class="metric-description">첫 콘텐츠 렌더링 시간</div>
        </div>
        <div class="metric-card">
          <div class="metric-name">LCP (Largest Contentful Paint)</div>
          <div class="metric-value" style="color: ${getMetricColor(result.metrics.lcp || 0, { good: 2500, poor: 4000 })}">${(result.metrics.lcp || 0).toFixed(0)}ms</div>
          <div class="metric-description">최대 콘텐츠 렌더링 시간</div>
        </div>
        <div class="metric-card">
          <div class="metric-name">TBT (Total Blocking Time)</div>
          <div class="metric-value" style="color: ${getMetricColor(result.metrics.tbt || 0, { good: 200, poor: 600 })}">${(result.metrics.tbt || 0).toFixed(0)}ms</div>
          <div class="metric-description">총 차단 시간</div>
        </div>
        <div class="metric-card">
          <div class="metric-name">CLS (Cumulative Layout Shift)</div>
          <div class="metric-value" style="color: ${getMetricColor((result.metrics.cls || 0) * 1000, { good: 100, poor: 250 })}">${(result.metrics.cls || 0).toFixed(3)}</div>
          <div class="metric-description">누적 레이아웃 이동</div>
        </div>
      </div>
    </div>

    <!-- Network Summary -->
    <div class="section">
      <h2 class="section-title">🌐 네트워크 요약</h2>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value">${result.networkRequests.length}</div>
          <div class="stat-label">총 요청 수</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${formatBytes(totalSize)}</div>
          <div class="stat-label">총 전송 크기</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${imageCount}</div>
          <div class="stat-label">이미지</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${cssCount + jsCount}</div>
          <div class="stat-label">CSS + JS</div>
        </div>
      </div>

      <table class="network-table">
        <thead>
          <tr>
            <th>타입</th>
            <th>URL</th>
            <th>크기</th>
            <th>지속시간</th>
          </tr>
        </thead>
        <tbody>
          ${result.networkRequests.slice(0, 15).map(req => `
            <tr>
              <td><span class="badge badge-good">${req.type}</span></td>
              <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${req.url}</td>
              <td>${formatBytes(req.size)}</td>
              <td>${req.duration.toFixed(0)}ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${result.networkRequests.length > 15 ? `<p style="margin-top: 10px; font-size: 11px; color: #666;">... 외 ${result.networkRequests.length - 15}개 요청</p>` : ''}
    </div>

    <!-- Long Tasks -->
    ${result.longTasks && result.longTasks.length > 0 ? `
    <div class="section">
      <h2 class="section-title">⚠️ Long Tasks (50ms 이상)</h2>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value">${result.longTasks.length}</div>
          <div class="stat-label">총 개수</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${(result.longTasks.reduce((sum, t) => sum + t.duration, 0) / result.longTasks.length).toFixed(0)}ms</div>
          <div class="stat-label">평균 지속시간</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${Math.max(...result.longTasks.map(t => t.duration)).toFixed(0)}ms</div>
          <div class="stat-label">최대 지속시간</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${result.longTasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0).toFixed(0)}ms</div>
          <div class="stat-label">총 차단 시간</div>
        </div>
      </div>

      <div class="long-task-list">
        ${result.longTasks.slice(0, 5).map((task, i) => `
          <div class="long-task-item">
            <strong>${i + 1}. ${task.name}</strong> - ${task.duration.toFixed(0)}ms (시작: ${task.startTime.toFixed(0)}ms)
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Performance Scores -->
    <div class="section">
      <h2 class="section-title">🎯 세부 성능 점수</h2>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value" style="color: ${getScoreColor(result.performanceScore.metrics)}">${result.performanceScore.metrics}</div>
          <div class="stat-label">메트릭 점수</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color: ${getScoreColor(result.performanceScore.network)}">${result.performanceScore.network}</div>
          <div class="stat-label">네트워크 점수</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color: ${getScoreColor(result.performanceScore.frames)}">${result.performanceScore.frames}</div>
          <div class="stat-label">프레임 점수</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color: ${getScoreColor(result.performanceScore.overall)}">${result.performanceScore.overall}</div>
          <div class="stat-label">종합 점수</div>
        </div>
      </div>
    </div>

    <!-- Additional Metrics -->
    <div class="section">
      <h2 class="section-title">📈 추가 메트릭</h2>
      <div class="metrics-grid">
        ${result.metrics.ttfb ? `
        <div class="metric-card">
          <div class="metric-name">TTFB</div>
          <div class="metric-value">${result.metrics.ttfb.toFixed(0)}ms</div>
          <div class="metric-description">Time to First Byte</div>
        </div>
        ` : ''}
        ${result.metrics.domContentLoaded ? `
        <div class="metric-card">
          <div class="metric-name">DOM Content Loaded</div>
          <div class="metric-value">${result.metrics.domContentLoaded.toFixed(0)}ms</div>
          <div class="metric-description">DOM 로드 완료</div>
        </div>
        ` : ''}
        ${result.metrics.loadComplete ? `
        <div class="metric-card">
          <div class="metric-name">Load Complete</div>
          <div class="metric-value">${result.metrics.loadComplete.toFixed(0)}ms</div>
          <div class="metric-description">전체 로드 완료</div>
        </div>
        ` : ''}
        <div class="metric-card">
          <div class="metric-name">Total Running Time</div>
          <div class="metric-value">${result.runningTime.toFixed(0)}ms</div>
          <div class="metric-description">전체 분석 시간</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>생성: Web Performance Analyzer | Powered by Puppeteer & Nuxt 3</p>
      <p>본 리포트는 ${new Date().toLocaleString('ko-KR')}에 자동 생성되었습니다.</p>
    </div>
  </div>
</body>
</html>
  `;
}
