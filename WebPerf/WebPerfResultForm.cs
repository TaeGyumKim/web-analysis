    using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Windows.Forms.DataVisualization.Charting;
using WebPerf.Model;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.IO;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

namespace WebPerf
{
    internal partial class WebPerfResultForm : Form
    {
        private PerfResultModel _result = null;

        // 타임라인에서 선택된 프레임 참조
        private FrameModel _selectedFrame = null;

        // PerfScoreResult를 저장할 필드 추가
        private PerfScoreResult _lastPerfScore;

        // 클래스 상단(필드 선언부 근처)에 추가: 가중치 및 임계값을 한곳에서 조정 가능하게 함
        private double PERF_WEIGHT_METRICS = 0.5;
        private double PERF_WEIGHT_NETWORK = 0.35;
        private double PERF_WEIGHT_FRAMES = 0.15;

        // 보관용 기본값
        private readonly double DEFAULT_WEIGHT_METRICS = 0.5;

        public WebPerfResultForm()
        {
            InitializeComponent();
        }

        public WebPerfResultForm(PerfResultModel result)
        {
            InitializeComponent();

            if (result == null)
            {
                return;
            }

            _result = result;

            // 요약(상단)
            var summaryPanel = CreateSummaryPanel(result);
            summaryPanel.Dock = DockStyle.Top;
            summaryPanel.Height = 80;
            this.Controls.Add(summaryPanel);

            time_value_label.Text = string.Format("{0}초 ({1} ms)", result.RunningTime.TotalSeconds, result.RunningTime.TotalMilliseconds);

            if (result.NetworkPerfResult == null)
            {
                // 네트워크 결과가 없더라도 performance JSON은 표시할 수 있음
            }
            else
            {
                long networkSize = 0;
                for (var i = 0; i < result.NetworkPerfResult._requestLists.Count; i++)
                {
                    networkSize += result.NetworkPerfResult._requestLists[i].Size;
                }

                network_size_value_label.Text = string.Format("{0} MB ({1} 바이트)", networkSize / 1024 / 1024, networkSize);

                BuildNetworkChart();
            }

            // 우측 탭: DevTools, Frames
            var rightTab = new TabControl
            {
                Dock = DockStyle.Right,
                Width = 720
            };

            // DevTools 탭
            var devTab = new TabPage("DevTools");
            rightTab.TabPages.Add(devTab);

            // Frames 탭
            var framesTab = new TabPage("Frames & Timeline");
            rightTab.TabPages.Add(framesTab);

            // DevTools 뷰 생성 (빈 상태 방지)
            CreateDevToolsView(devTab, result.DevToolsPerformanceJson);

            CreateFramesView(framesTab, result.Frames, result.NetworkPerfResult);

            // 우선 추가 (또는 추가 후 인덱스 조정)
            this.Controls.Add(rightTab);

            // -- 핵심: 도킹 순서(=Z-Order) 보정 --
            // rightTab이 먼저(뒤쪽, 인덱스 0) 도킹되도록 설정하면 Right 도킹이 먼저 적용되고
            // 이후 Top/Fill 도킹이 남은 영역에 맞게 적용됩니다.
            this.Controls.SetChildIndex(rightTab, 0);        // rightTab을 뒤(첫번째)로 이동
            this.Controls.SetChildIndex(summaryPanel, 1);    // summaryPanel이 top으로 동작하도록 인덱스 조정

            // 나머지 동적 컨트롤 추가(이미 위에서 추가됨)
        }

        private Control CreateSummaryPanel(PerfResultModel result)
        {
            var p = new Panel { Padding = new Padding(6) };

            var lblTitle = new Label
            {
                Text = "요약",
                Font = new Font(Font.FontFamily, 10f, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(6, 6)
            };

            var info = new List<string>();
            info.Add(string.Format("총 실행 시간: {0} ms", Math.Round(result.RunningTime.TotalMilliseconds)));
            int frameCount = result.Frames?.Count ?? 0;
            info.Add($"프레임 수: {frameCount}");
            long networkSize = 0;
            if (result.NetworkPerfResult != null)
            {
                for (var i = 0; i < result.NetworkPerfResult._requestLists.Count; i++)
                {
                    networkSize += result.NetworkPerfResult._requestLists[i].Size;
                }
            }
            info.Add($"네트워크 전송량: {networkSize / 1024} KB");

            // DevTools 메트릭(가능하면)
            string metricsInfo = ExtractSimpleMetrics(result.DevToolsPerformanceJson);
            if (!string.IsNullOrEmpty(metricsInfo))
            {
                info.Add(metricsInfo);
            }

            var lblInfo = new Label
            {
                Text = string.Join("    ", info),
                AutoSize = false,
                Location = new Point(6, 30),
                Width = 800,
                Height = 40
            };

            p.Controls.Add(lblTitle);
            p.Controls.Add(lblInfo);
            return p;
        }

        private string ExtractSimpleMetrics(string devtoolsJson)
        {
            if (string.IsNullOrWhiteSpace(devtoolsJson)) return null;
            try
            {
                var root = JToken.Parse(devtoolsJson);
                var sb = new StringBuilder();
                // Performance.getMetrics 결 과 내 metrics.metric
                var metrics = root["metrics"]?["metrics"] ?? root["metrics"];
                if (metrics != null && metrics.Type == JTokenType.Array)
                {
                    var mNames = new[] { "FirstMeaningfulPaint", "FirstContentfulPaint", "DomContentLoaded", "NavigationStart", "FirstPaint" };
                    foreach (var name in mNames)
                    {
                        var val = metrics.Children<JObject>().FirstOrDefault(x => x["name"]?.ToString() == name)?["value"];
                        if (val != null)
                        {
                            sb.Append($"{name}:{Math.Round(val.Value<double>() * 1000)}ms ");
                        }
                    }
                }

                // webperfMetrics가 있으면 간단히 LCP/TBT 표시
                var web = root["webperfMetrics"];
                if (web != null)
                {
                    var lcp = web["lcp"]?["time"] ?? web["lcp"]?["time"] ?? web["lcp"]?["time"];
                    var fcp = web["fcp"];
                    var tbt = web["tbt"];
                    if (lcp != null)
                    {
                        double lcpv;
                        if (double.TryParse(lcp.ToString(), out lcpv))
                        {
                            sb.Append($"LCP:{Math.Round(lcpv)}ms ");
                        }
                    }
                    if (tbt != null)
                    {
                        double tbtv;
                        if (double.TryParse(tbt.ToString(), out tbtv))
                        {
                            sb.Append($"TBT:{Math.Round(tbtv)}ms ");
                        }
                    }
                    if (fcp != null)
                    {
                        double fcpv;
                        if (double.TryParse(fcp.ToString(), out fcpv))
                        {
                            sb.Append($"FCP:{Math.Round(fcpv)}ms ");
                        }
                    }
                }

                return sb.ToString().Trim();
            }
            catch
            {
                return null;    
            }
        }

        // DevTools JSON에서 메트릭을 딕셔너리로 추출 (이후 배지 UI에 사용)
        private Dictionary<string, double> ExtractMetricsDict(string devtoolsJson)
        {
            var dict = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrWhiteSpace(devtoolsJson)) return dict;
            try
            {
                var root = JToken.Parse(devtoolsJson);
                var metrics = root["metrics"]?["metrics"] ?? root["metrics"];
                if (metrics != null && metrics.Type == JTokenType.Array)
                {
                    foreach (var m in metrics.Children<JObject>())
                    {
                        var name = m["name"]?.ToString();
                        var vtoken = m["value"];
                        if (!string.IsNullOrEmpty(name) && vtoken != null)
                        {
                            double valSec;
                            if (double.TryParse(vtoken.ToString(), out valSec))
                            {
                                dict[name] = valSec * 1000.0; // ms
                            }
                        }
                    }
                }

                // webperfMetrics (injected LCP/TBT/FCP)
                var web = root["webperfMetrics"];
                if (web != null)
                {
                    // LCP
                    var lcp = web["lcp"]?["time"] ?? web["lcp"]?["time"] ?? web["lcp"]?["time"];
                    if (lcp != null)
                    {
                        double lcpv;
                        if (double.TryParse(lcp.ToString(), out lcpv))
                        {
                            dict["LCP"] = lcpv;
                        }
                    }
                    // TBT
                    var tbt = web["tbt"];
                    if (tbt != null)
                    {
                        double tbtv;
                        if (double.TryParse(tbt.ToString(), out tbtv))
                        {
                            dict["TBT"] = tbtv;
                        }
                    }
                    // FCP
                    var fcp = web["fcp"];
                    if (fcp != null)
                    {
                        double fcpv;
                        if (double.TryParse(fcp.ToString(), out fcpv))
                        {
                            dict["FCP"] = fcpv;
                        }
                    }
                }
            }
            catch
            {
                // 무시
            }
            return dict;
        }

        // 성능 점수와 상세 항목을 담는 단순 모델
        private class PerfScoreDetail
        {
            public string Name { get; set; }
            public double Value { get; set; } // ms 또는 기타 (bytes 등)
            public int Score { get; set; } // 0..100
            public string Source { get; set; } // "metrics", "network", "frames"
            public String Note { get; set; }
        }

        // PerfScoreResult 클래스 확장: aggregate 값을 노출하도록 변경
        private class PerfScoreResult
        {
            public int FinalScore { get; set; }
            public double MetricsAggregate { get; set; }    // 0..100 (가중 합)
            public int NetworkAggregate { get; set; }       // 0..100
            public int FramesAggregate { get; set; }        // 0..100
            public List<PerfScoreDetail> Details { get; set; } = new List<PerfScoreDetail>();
        }

        // 타이밍(ms)에 대한 서브스코어 계산 (휴리스틱)
        private double ScoreTimingMs(double ms)
        {
            if (double.IsNaN(ms) || double.IsInfinity(ms) || ms <= 0) return 100;
            if (ms <= 1000) return 100;
            // 1s~3s 구간: 완만한 감소 (100 -> 75)
            if (ms <= 3000) return 100 - (ms - 1000) * (25.0 / 2000.0);
            // 3s~7s 구간: 추가 감소 (75 -> 30)
            if (ms <= 7000) return 75 - (ms - 3000) * (45.0 / 4000.0);
            // 더 느린 경우 천천히 감소 (매 1s마다 -1)
            double rem = 30 - (ms - 7000) / 1000.0;
            return Math.Max(0, rem);
        }

        // 네트워크 관련 점수 계산
        private int ComputeNetworkScore(NetworkPerfModel network, out List<PerfScoreDetail> details)
        {
            details = new List<PerfScoreDetail>();
            if (network == null || network._requestLists == null || network._requestLists.Count == 0)
            {
                return 90;
            }

            long totalBytes = 0;
            double longestMs = 0;
            foreach (var r in network._requestLists)
            {
                totalBytes += Math.Max(0, r.Size);
                double dur = Math.Max(0, (r.EndSec - r.StartSec) * 1000.0);
                if (dur > longestMs) longestMs = dur;
            }

            int reqCount = network._requestLists.Count;

            double score = 100.0;

            // 바이트 기반 패널티: 5MB 이상이면 감점 시작 (완화된 계수)
            double mb = totalBytes / (1024.0 * 1024.0);
            if (mb > 5.0)
            {
                double p = Math.Min(30.0, (mb - 5.0) * 3.0); // 1MB당 3점 감점, 최대30
                score -= p;
            }

            // 요청 수 패널티: 40개 초과부터 감점 (완화)
            if (reqCount > 40)
            {
                double p = Math.Min(25.0, (reqCount - 40) * 0.8); // 0.8점/요청
                score -= p;
            }

            // 최장 요청 시간 패널티: 2s 초과부터 감점 (완화된 계수)
            if (longestMs > 2000)
            {
                double p = Math.Min(30.0, (longestMs - 2000.0) / 500.0 * 3.0);
                score -= p;
            }

            details.Add(new PerfScoreDetail { Name = "TotalBytes", Value = totalBytes, Score = (int)Math.Round(Math.Max(0, Math.Min(100, score))), Source = "network", Note = $"{Math.Round(mb,2)} MB, {reqCount} req" });
            details.Add(new PerfScoreDetail { Name = "LongestRequestMs", Value = longestMs, Score = (int)Math.Round(ScoreTimingMs(longestMs)), Source = "network", Note = "최장 요청 지속시간" });

            return (int)Math.Round(Math.Max(0, Math.Min(100, score)));
        }

        // 프레임 관련 점수 계산 (캡처 간격 등)
        private int ComputeFramesScore(List<FrameModel> frames, out List<PerfScoreDetail> details)
        {
            details = new List<PerfScoreDetail>();
            if (frames == null || frames.Count < 2)
            {
                details.Add(new PerfScoreDetail { Name = "Frames", Value = frames?.Count ?? 0, Score = 85, Source = "frames", Note = "프레임 데이터 부족" });
                return 85;
            }

            // 평균 간격 계산(ms)
            var diffs = new List<double>();
            for (int i = 1; i < frames.Count; i++)
            {
                diffs.Add((frames[i].TimestampSec - frames[i - 1].TimestampSec) * 1000.0);
            }
            double avg = diffs.Count > 0 ? diffs.Average() : 0;
            double median = diffs.Count > 0 ? diffs.OrderBy(x => x).ElementAt(diffs.Count / 2) : avg;

            int score;
            if (avg <= 100) score = 100;
            else if (avg <= 200) score = 90;
            else if (avg <= 400) score = 75;
            else score = 60;

            details.Add(new PerfScoreDetail { Name = "FrameAvgIntervalMs", Value = avg, Score = score, Source = "frames", Note = $"avg={Math.Round(avg)}ms median={Math.Round(median)}ms" });

            return score;
        }

        // 전체 성능 점수 계산: metrics + network + frames 합산 (가중치)
        private PerfScoreResult ComputePerformanceScore(Dictionary<string, double> metrics, NetworkPerfModel network, List<FrameModel> frames)
        {
            var result = new PerfScoreResult();

            var metricDetails = new List<PerfScoreDetail>();
            double metricsScore = 0.0;
            double totalMetricWeight = 0.0;

            var preferredWeights = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase)
            {
                { "FirstContentfulPaint", 0.28 },
                { "FirstMeaningfulPaint", 0.28 },
                { "FirstPaint", 0.12 },
                { "DomContentLoaded", 0.12 },
                { "NavigationStart", 0.20 },
                // allow LCP/FCP/TBT to participate if present
                { "LCP", 0.2 },
                { "FCP", 0.12 },
                { "TBT", 0.18 }
            };

            var available = metrics.Keys.Intersect(preferredWeights.Keys, StringComparer.OrdinalIgnoreCase).ToList();
            if (available.Count == 0 && metrics.Count > 0)
            {
                double eq = 1.0 / metrics.Count;
                foreach (var kv in metrics)
                {
                    var sc = ScoreTimingMs(kv.Value);
                    metricDetails.Add(new PerfScoreDetail { Name = kv.Key, Value = kv.Value, Score = (int)Math.Round(sc), Source = "metrics", Note = "auto" });
                    metricsScore += sc * eq;
                }
                totalMetricWeight = 1.0;
            }
            else
            {
                double sumWeights = available.Sum(k => preferredWeights.ContainsKey(k) ? preferredWeights[k] : 0.0);
                foreach (var name in available)
                {
                    double w = preferredWeights.ContainsKey(name) ? preferredWeights[name] / Math.Max(1e-6, sumWeights) : 0.0;
                    totalMetricWeight += w;
                    double val = metrics.ContainsKey(name) ? metrics[name] : 0;
                    double sc;
                    // TBT is a blocking time — lower is better, map inversely
                    if (string.Equals(name, "TBT", StringComparison.OrdinalIgnoreCase))
                    {
                        // convert TBT ms to score: less TBT -> higher score
                        sc = ScoreTimingMs(val); // reuse mapping: lower -> closer to 100
                    }
                    else
                    {
                        sc = ScoreTimingMs(val);
                    }
                    metricDetails.Add(new PerfScoreDetail { Name = name, Value = val, Score = (int)Math.Round(sc), Source = "metrics", Note = "devtools metric" });
                    metricsScore += sc * w;
                }
            }

            if (totalMetricWeight <= 0) totalMetricWeight = 1.0;
            foreach (var kv in metrics)
            {
                if (!metricDetails.Any(d => string.Equals(d.Name, kv.Key, StringComparison.OrdinalIgnoreCase)))
                {
                    double sc = ScoreTimingMs(kv.Value);
                    metricDetails.Add(new PerfScoreDetail { Name = kv.Key, Value = kv.Value, Score = (int)Math.Round(sc), Source = "metrics", Note = "additional metric" });
                }
            }

            var netDetails = new List<PerfScoreDetail>();
            int netScore = ComputeNetworkScore(network, out netDetails);

            var frameDetails = new List<PerfScoreDetail>();
            int framesScore = ComputeFramesScore(frames, out frameDetails);

            // If metrics are intentionally excluded (weight = 0) or no metrics present, normalize remaining weights.
            double final;
            if (PERF_WEIGHT_METRICS <= 0 || metrics == null || metrics.Count == 0)
            {
                double sum = PERF_WEIGHT_NETWORK + PERF_WEIGHT_FRAMES;
                if (sum <= 0) sum = 1.0;
                final = (netScore * (PERF_WEIGHT_NETWORK / sum)) + (framesScore * (PERF_WEIGHT_FRAMES / sum));
            }
            else
            {
                final = (metricsScore * PERF_WEIGHT_METRICS) + (netScore * PERF_WEIGHT_NETWORK) + (framesScore * PERF_WEIGHT_FRAMES);
            }

            int finalInt = (int)Math.Round(Math.Max(0, Math.Min(100, final)));

            result.FinalScore = finalInt;
            result.MetricsAggregate = metricsScore;
            result.NetworkAggregate = netScore;
            result.FramesAggregate = framesScore;

            // 세부 목록: 개별 metrics는 보여주되 MetricsAggregate 항목은 최종 계산에서 제외하려는 요청이므로 추가하지 않음.
            result.Details.AddRange(metricDetails);
            // (removed MetricsAggregate summary row)
            result.Details.AddRange(netDetails);
            result.Details.Add(new PerfScoreDetail { Name = "NetworkAggregate", Value = netScore, Score = netScore, Source = "network", Note = "network aggregate" });
            result.Details.AddRange(frameDetails);
            result.Details.Add(new PerfScoreDetail { Name = "FramesAggregate", Value = framesScore, Score = framesScore, Source = "frames", Note = "frames aggregate" });

            System.Diagnostics.Debug.WriteLine($"PerfScore computed (weights M/N/F = {PERF_WEIGHT_METRICS}/{PERF_WEIGHT_NETWORK}/{PERF_WEIGHT_FRAMES}): Final={result.FinalScore}, Metrics={result.MetricsAggregate:F1}, Network={result.NetworkAggregate}, Frames={result.FramesAggregate}");

            return result;
        }

        private void CreateDevToolsView(TabPage tab, string devtoolsJson)
        {
            if (string.IsNullOrWhiteSpace(devtoolsJson))
            {
                var lbl = new Label
                {
                    Text = "DevTools performance JSON이 없습니다.",
                    Dock = DockStyle.Fill,
                    TextAlign = ContentAlignment.MiddleCenter
                };
                tab.Controls.Add(lbl);
                return;
            }

            // 상단 툴바
            var tool = new ToolStrip { Dock = DockStyle.Top };
            var tbSummary = new ToolStripButton("요약 보기") { Checked = true, CheckOnClick = true };
            var tbExpand = new ToolStripButton("모두 펼치기");
            var tbCollapse = new ToolStripButton("모두 접기");
            var tbCopy = new ToolStripButton("JSON 복사");
            var searchBox = new ToolStripTextBox { Width = 200, Font = new Font("Segoe UI", 9f) };
            var tbSearch = new ToolStripButton("검색");
            tool.Items.Add(tbSummary);
            tool.Items.Add(new ToolStripSeparator());
            tool.Items.Add(tbExpand);
            tool.Items.Add(tbCollapse);
            tool.Items.Add(new ToolStripSeparator());
            tool.Items.Add(tbCopy);
            tool.Items.Add(new ToolStripSeparator());
            tool.Items.Add(new ToolStripLabel("검색:"));
            tool.Items.Add(searchBox);
            tool.Items.Add(tbSearch);

            // 점수 상세 버튼 추가
            var tbScoreDetails = new ToolStripButton("점수 상세");
            tool.Items.Add(new ToolStripSeparator());
            tool.Items.Add(tbScoreDetails);

            // 메트릭 제외 체크박스 추가
            var tbExcludeMetrics = new ToolStripButton("메트릭 제외") { CheckOnClick = true };
            tool.Items.Add(new ToolStripSeparator());
            tool.Items.Add(tbExcludeMetrics);

            // 메트릭 배지 패널 (요약)
            Panel metricsContainer = new Panel
            {
                Dock = DockStyle.Top,
                Height = 100,
                Padding = new Padding(6)
            };

            Panel scorePlaceholder = new Panel
            {
                Dock = DockStyle.Left,
                Width = 160,
                Padding = new Padding(0)
            };


            // 메트릭 제외 체크박스 상태 변경 시 처리
            tbExcludeMetrics.CheckedChanged += (s, e) =>
            {
                if (tbExcludeMetrics.Checked)
                {
                    // 메트릭을 최종 계산에서 제외
                    PERF_WEIGHT_METRICS = 0.0;
                }
                else
                {
                    // 기본값 복원
                    PERF_WEIGHT_METRICS = DEFAULT_WEIGHT_METRICS;
                }

                // 재계산 및 UI 갱신: _lastPerfScore 재계산하고 배지 갱신
                try
                {
                    var metricsDict = ExtractMetricsDict(devtoolsJson);
                    _lastPerfScore = ComputePerformanceScore(metricsDict, _result?.NetworkPerfResult, _result?.Frames);
                    // scoreBadge가 scorePlaceholder의 첫 자식이라 가정
                    if (scorePlaceholder.Controls.Count > 0 && scorePlaceholder.Controls[0] is Label sb)
                    {
                        sb.Text = $"성능 점수\n{_lastPerfScore.FinalScore} / 100";
                        var tt2 = new ToolTip();
                        string metricsTip = (PERF_WEIGHT_METRICS <= 0 || metricsDict == null || metricsDict.Count == 0) ? "excluded" : Math.Round(_lastPerfScore.MetricsAggregate, 1).ToString();
                        string tip = $"Final: {_lastPerfScore.FinalScore}/100\r\nMetrics: {metricsTip}\r\nNetwork: {_lastPerfScore.NetworkAggregate}\r\nFrames: {_lastPerfScore.FramesAggregate}";
                        tt2.SetToolTip(sb, tip);
                    }
                }
                catch { /* 무시 */ }
            };
            var metricsFlow = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                AutoScroll = true,
                FlowDirection = FlowDirection.LeftToRight,
                WrapContents = false
            };

            // 컨테이너 구성 (Flow를 먼저 추가하면 Dock 순서에 영향 없음)
            metricsContainer.Controls.Add(metricsFlow);
            metricsContainer.Controls.Add(scorePlaceholder);

            // 메트릭 배치: ExtractMetricsDict 사용
            var metrics = ExtractMetricsDict(devtoolsJson);

            // If injected webperf metrics exist, show LCP/TBT/FCP first
            if (metrics.TryGetValue("LCP", out double lcpVal))
            {
                metricsFlow.Controls.Add(CreateMetricBadge("LCP", lcpVal));
            }
            if (metrics.TryGetValue("FCP", out double fcpVal))
            {
                metricsFlow.Controls.Add(CreateMetricBadge("FCP", fcpVal));
            }
            if (metrics.TryGetValue("TBT", out double tbtVal))
            {
                metricsFlow.Controls.Add(CreateMetricBadge("TBT", tbtVal));
            }

            // 주요 메트릭 우선순위
            var primaryNames = new[] { "FirstContentfulPaint", "FirstMeaningfulPaint", "FirstPaint", "DomContentLoaded", "NavigationStart" };
            foreach (var name in primaryNames)
            {
                if (metrics.TryGetValue(name, out double ms))
                {
                    var lbl = CreateMetricBadge(name, ms);
                    metricsFlow.Controls.Add(lbl);
                }
            }
            foreach (var kv in metrics)
            {
                if (primaryNames.Contains(kv.Key) || kv.Key == "LCP" || kv.Key == "TBT" || kv.Key == "FCP") continue;
                metricsFlow.Controls.Add(CreateMetricBadge(kv.Key, kv.Value));
            }

            // Performance Score 추가: 왼쪽 고정 영역에 넣음
            try
            {
                var perfScore = ComputePerformanceScore(metrics, _result?.NetworkPerfResult, _result?.Frames);
                _lastPerfScore = perfScore;
                var scoreBadge = CreateScoreBadge(perfScore.FinalScore);
                scoreBadge.Dock = DockStyle.Fill;              // placeholder에 꽉 채움
                scorePlaceholder.Controls.Add(scoreBadge);

                // 툴팁으로 요약 노출
                var tt = new ToolTip();
                string metricsTip = (PERF_WEIGHT_METRICS <= 0 || metrics == null || metrics.Count == 0) ? "excluded" : Math.Round(perfScore.MetricsAggregate, 1).ToString();
                string tip = $"Final: {perfScore.FinalScore}/100\r\nMetrics: {metricsTip}\r\nNetwork: {perfScore.NetworkAggregate}\r\nFrames: {perfScore.FramesAggregate}";
                tt.SetToolTip(scoreBadge, tip);

                // 클릭 시 상세 창 열기
                scoreBadge.Click += (s, e) => ShowPerfScoreDetails();

                System.Diagnostics.Debug.WriteLine("Score badge tooltip set: " + tip);
            }
            catch
            {
                // 무시
            }

            // Split: 왼쪽은 Tree, 오른쪽은 metricsPanel + json viewer
            var split = new SplitContainer
            {
                Dock = DockStyle.Fill,
                Orientation = Orientation.Vertical,
                SplitterDistance = 320
            };

            var tree = new TreeView
            {
                Dock = DockStyle.Fill,
                HideSelection = false
            };

            var rightPanel = new Panel { Dock = DockStyle.Fill, Padding = new Padding(6) };
            var valueBox = new TextBox
            {
                Dock = DockStyle.Fill,
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Both,
                Font = new Font("Consolas", 9f)
            };

            var copyBtn = new Button { Text = "원본 복사", Dock = DockStyle.Bottom, Height = 28 };
            copyBtn.Click += (s, e) =>
            {
                try
                {
                    Clipboard.SetText(devtoolsJson);
                    MessageBox.Show("복사되었습니다.", "정보", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                catch
                {
                    MessageBox.Show("복사 실패", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            };

            // 오른쪽에 metricsPanel(Top) + valueBox(fill) + copyBtn(bottom)
            rightPanel.Controls.Add(valueBox);
            rightPanel.Controls.Add(copyBtn);
            rightPanel.Controls.Add(metricsContainer);
            // metricsPanel은 맨 위에 보이도록 BringToFront
            metricsContainer.BringToFront();

            split.Panel1.Controls.Add(tree);
            split.Panel2.Controls.Add(rightPanel);

            // 전체 탭에 툴바 + split 추가
            tab.Controls.Add(split);
            tab.Controls.Add(tool);

            // 트리 채우기 및 이벤트
            try
            {
                var root = JToken.Parse(devtoolsJson);
                PopulateTreeFromJToken(root, tree.Nodes, "root");
                tree.AfterSelect += (s, e) =>
                {
                    valueBox.Text = GetNodeJsonValue(e.Node);
                };
                tree.ExpandAll();
            }
            catch (Exception ex)
            {
                valueBox.Text = $"JSON 파싱 오류: {ex.Message}\r\n\r\n원본문:\r\n{devtoolsJson}";
            }

            // 툴바 버튼 동작
            tbExpand.Click += (s, e) => tree.ExpandAll();
            tbCollapse.Click += (s, e) => tree.CollapseAll();
            tbCopy.Click += (s, e) =>
            {
                try
                {
                    Clipboard.SetText(devtoolsJson);
                    MessageBox.Show("복사되었습니다.", "정보", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                catch
                {
                    MessageBox.Show("복사 실패", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            };
            tbSummary.Checked = true;
            tbSummary.CheckedChanged += (s, e) =>
            {
                metricsContainer.Visible = tbSummary.Checked;
            };

            tbSearch.Click += (s, e) =>
            {
                string q = searchBox.Text ?? "";
                if (string.IsNullOrWhiteSpace(q)) return;
                var found = SearchAndSelectTreeNode(tree, q);
                if (!found)
                {
                    MessageBox.Show("검색 결과가 없습니다.", "검색", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            };

            // 점수 상세 버튼 클릭 이벤트 연결
            tbScoreDetails.Click += (s, e) =>
            {
                try
                {
                    ShowPerfScoreDetails();
                }
                catch
                {
                    MessageBox.Show("성능 점수 상세를 표시할 수 없습니다.", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            };
        }

        // 트리에서 쿼리를 찾아 선택하고 부모들을 펼침
        private bool SearchAndSelectTreeNode(TreeView tree, string query)
        {
            if (string.IsNullOrEmpty(query)) return false;
            query = query.Trim();
            TreeNode first = null;
            // DFS 찾기
            foreach (TreeNode node in tree.Nodes)
            {
                var found = SearchNodeRecursive(node, query, ref first);
                if (found) break;
            }
            if (first != null)
            {
                tree.SelectedNode = first;
                first.EnsureVisible();
                return true;
            }
            return false;
        }

        private bool SearchNodeRecursive(TreeNode node, string query, ref TreeNode firstMatch)
        {
            if (node.Text.IndexOf(query, StringComparison.OrdinalIgnoreCase) >= 0)
            {
                firstMatch = node;
                return true;
            }
            foreach (TreeNode child in node.Nodes)
            {
                var found = SearchNodeRecursive(child, query, ref firstMatch);
                if (found) return true;
            }
            return false;
        }

        private void CreateFramesView(TabPage tab, List<FrameModel> frames, NetworkPerfModel network)
        {
            if ((frames == null || frames.Count == 0) && (network == null || network._requestLists.Count == 0))
            {
                var lbl = new Label
                {
                    Text = "수집된 프레임 또는 네트워크 데이터가 없습니다.",
                    Dock = DockStyle.Fill,
                    TextAlign = ContentAlignment.MiddleCenter
                };
                tab.Controls.Add(lbl);
                return;
            }

            // 왼쪽: 썸네일 리스트
            var thumbnailsPanel = new FlowLayoutPanel
            {
                Dock = DockStyle.Left,
                Width = 220,
                AutoScroll = true,
                FlowDirection = FlowDirection.TopDown,
                WrapContents = false,
                Padding = new Padding(6)
            };

            // 중앙 상단: 타임라인 패널
            var timelinePanel = new Panel
            {
                Dock = DockStyle.Top,
                Height = 120,
                BackColor = Color.White,
                Padding = new Padding(6)
            };

            // 중앙 우측: 큰 이미지 + 메타 + 저장 버튼
            var rightPanel = new Panel
            {
                Dock = DockStyle.Fill,
                Padding = new Padding(6)
            };

            var pictureBox = new PictureBox
            {
                Dock = DockStyle.Top,
                Height = 360,
                SizeMode = PictureBoxSizeMode.Zoom,
                BorderStyle = BorderStyle.FixedSingle
            };

            // Metadata 텍스트박스 (JSON)
            var metaText = new TextBox
            {
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Both,
                WordWrap = false,
                Font = new Font("Consolas", 9f),
                Dock = DockStyle.Fill
            };

            // DOM 스니펫 전용 텍스트박스
            var domText = new TextBox
            {
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Both,
                WordWrap = false,
                Font = new Font("Consolas", 9f),
                Dock = DockStyle.Fill
            };

            // DOM 렌더러 (WebView2)
            var domRenderer = new WebView2
            {
                Dock = DockStyle.Fill,
                Visible = true
            };

            // DOM 탭 내 복사/저장 버튼
            var domBtnPanel = new Panel { Dock = DockStyle.Bottom, Height = 30 };
            var copyDomBtn = new Button { Text = "DOM 복사", Dock = DockStyle.Right, Width = 100 };
            var saveDomBtn = new Button { Text = "DOM 저장", Dock = DockStyle.Right, Width = 100 };
            copyDomBtn.Click += (s, e) =>
            {
                try
                {
                    if (!string.IsNullOrEmpty(domText.Text))
                    {
                        Clipboard.SetText(domText.Text);
                        MessageBox.Show("DOM 스니펫이 복사되었습니다.", "정보", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    else
                    {
                        MessageBox.Show("복사할 DOM 스니펫이 없습니다.", "정보", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                }
                catch
                {
                    MessageBox.Show("복사 실패", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            };
            saveDomBtn.Click += (s, e) =>
            {
                if (string.IsNullOrEmpty(domText.Text))
                {
                    MessageBox.Show("저장할 DOM 스니펫이 없습니다.", "정보", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }
                using (var dlg = new SaveFileDialog())
                {
                    dlg.Filter = "HTML 파일|*.html|텍스트 파일|*.txt|모든 파일|*.*";
                    dlg.FileName = "dom_snippet.html";
                    if (dlg.ShowDialog() == DialogResult.OK)
                    {
                        try
                        {
                            System.IO.File.WriteAllText(dlg.FileName, domText.Text, Encoding.UTF8);
                        }
                        catch
                        {
                            MessageBox.Show("저장 실패", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }
                    }
                }
            };
            domBtnPanel.Controls.Add(saveDomBtn);
            domBtnPanel.Controls.Add(copyDomBtn);

            // DOM/Metadata 탭 컨트롤
            var metaTabs = new TabControl { Dock = DockStyle.Fill };
            var metaPage = new TabPage("Metadata");
            var domPage = new TabPage("DOM");
            metaPage.Controls.Add(metaText);

            // DOM 페이지: Split top=텍스트, bottom=렌더러
            var domSplit = new SplitContainer
            {
                Dock = DockStyle.Fill,
                Orientation = Orientation.Horizontal,
                SplitterDistance = 180
            };
            // 상단에 domText + 버튼
            var topPanel = new Panel { Dock = DockStyle.Fill };
            topPanel.Controls.Add(domText);
            topPanel.Controls.Add(domBtnPanel);
            domSplit.Panel1.Controls.Add(topPanel);

            // 하단에 WebView2 렌더러
            domSplit.Panel2.Controls.Add(domRenderer);

            domPage.Controls.Add(domSplit);

            metaTabs.TabPages.Add(metaPage);
            metaTabs.TabPages.Add(domPage);

            var saveBtn = new Button
            {
                Text = "이미지 저장",
                Dock = DockStyle.Bottom,
                Height = 28
            };

            // 분석 버튼: AI 전송용 텍스트 생성
            var analyzeBtn = new Button
            {
                Text = "프레임 분석 (AI용 텍스트 생성)",
                Dock = DockStyle.Bottom,
                Height = 28
            };

            analyzeBtn.Click += (s, e) =>
            {
                var framesLocal = frames ?? new List<FrameModel>();
                var requests = network != null ? network._requestLists : new List<RequestRecord>();
                var analysisText = GenerateFrameAnalysisText(framesLocal, requests);

                // 결과 창
                var dlg = new Form
                {
                    Text = "프레임 분석 결과 (AI용 텍스트)",
                    Width = 800,
                    Height = 600,
                    StartPosition = FormStartPosition.CenterParent
                };
                var txt = new TextBox
                {
                    Multiline = true,
                    ReadOnly = true,
                    ScrollBars = ScrollBars.Both,
                    WordWrap = false,
                    Font = new Font("Consolas", 9f),
                    Dock = DockStyle.Fill,
                    Text = analysisText
                };
                var btnPanel = new Panel { Dock = DockStyle.Bottom, Height = 36 };
                var copy = new Button { Text = "복사", Dock = DockStyle.Right, Width = 80 };
                copy.Click += (s2, e2) =>
                {
                    try
                    {
                        Clipboard.SetText(analysisText);
                        MessageBox.Show("분석 텍스트가 클립보드로 복사되었습니다.", "정보", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    catch
                    {
                        MessageBox.Show("복사 실패", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                };
                btnPanel.Controls.Add(copy);
                dlg.Controls.Add(txt);
                dlg.Controls.Add(btnPanel);
                dlg.ShowDialog(this);
            };

            saveBtn.Click += (s, e) =>
            {
                if (pictureBox.Image == null)
                {
                    MessageBox.Show("저장할 이미지가 없습니다.", "정보", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }

                using (var dlg = new SaveFileDialog())
                {
                    dlg.Filter = "PNG 파일|*.png";
                    dlg.FileName = "frame.png";
                    if (dlg.ShowDialog() == DialogResult.OK)
                    {
                        try
                        {
                            pictureBox.Image.Save(dlg.FileName, System.Drawing.Imaging.ImageFormat.Png);
                        }
                        catch
                        {
                            MessageBox.Show("저장 실패", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        }
                    }
                }
            };

            // 추가 순서: 맨 아래부터 추가 (DockStyle.Bottom 순서 고려)
            rightPanel.Controls.Add(metaTabs);
            rightPanel.Controls.Add(pictureBox);
            rightPanel.Controls.Add(saveBtn);
            rightPanel.Controls.Add(analyzeBtn);

            // 타임라인 그리기 변수 준비
            var framesLocal2 = frames ?? new List<FrameModel>();
            var requests2 = network != null ? network._requestLists : new List<RequestRecord>();

            // 타임 범위 계산 (ms)
            double maxMs = 0;
            if (framesLocal2.Count > 0)
            {
                var lastFrame = framesLocal2.Max(f => f.TimestampSec);
                maxMs = Math.Max(maxMs, lastFrame * 1000.0);
            }
            if (network != null && network._requestLists.Count > 0)
            {
                foreach (var r in network._requestLists)
                {
                    double endMs = (r.EndSec - network.NavigateStartTime) * 1000.0;
                    if (endMs > maxMs) maxMs = endMs;
                }
            }
            if (maxMs <= 0) maxMs = Math.Max(1.0, _result.RunningTime.TotalMilliseconds);

            // 타임라인 Paint 이벤트
            timelinePanel.Paint += (s, e) =>
            {
                var g = e.Graphics;
                g.Clear(timelinePanel.BackColor);
                int W = Math.Max(1, timelinePanel.ClientSize.Width - 12);
                int H = Math.Max(1, timelinePanel.ClientSize.Height - 12);
                double scale = W / maxMs;

                // 그리드: 시간 눈금 every 500ms
                using (var pen = new Pen(Color.LightGray))
                using (var brush = new SolidBrush(Color.Black))
                using (var font = new Font("Segoe UI", 8f))
                {
                    for (double t = 0; t <= maxMs; t += 500)
                    {
                        int x = 6 + (int)(t * scale);
                        g.DrawLine(pen, x, 6, x, 6 + H);
                        g.DrawString($"{(int)t}ms", font, brush, x + 2, 6);
                    }
                }

                // 네트워크 요청 그리기 (상단 영역)
                int topY = 6 + 18;
                int rowHeight = 12;
                int maxRows = Math.Min(20, requests2.Count);
                for (int i = 0; i < maxRows; i++)
                {
                    var r = requests2[i];
                    double sMs = (r.StartSec - network.NavigateStartTime) * 1000.0;
                    double eMs = (r.EndSec - network.NavigateStartTime) * 1000.0;
                    if (eMs < sMs) eMs = sMs;
                    int x1 = 6 + (int)(sMs * scale);
                    int x2 = 6 + (int)(eMs * scale);
                    var rect = new Rectangle(x1, topY + i * (rowHeight + 4), Math.Max(2, x2 - x1), rowHeight);
                    g.FillRectangle(Brushes.LightBlue, rect);
                    g.DrawRectangle(Pens.DodgerBlue, rect);
                }

                // 프레임 마커 (붉은 선)
                foreach (var f in framesLocal2)
                {
                    double tMs = f.TimestampSec * 1000.0;
                    int x = 6 + (int)(tMs * scale);
                    g.DrawLine(Pens.Red, x, 6, x, 6 + H);
                }

                // 추가: webperfMetrics에서 LCP/FCP/TBT 마커 표시 (있다면)
                try
                {
                    var root = !string.IsNullOrWhiteSpace(_result?.DevToolsPerformanceJson) ? JToken.Parse(_result.DevToolsPerformanceJson) : null;
                    var web = root?["webperfMetrics"];
                    if (web != null)
                    {
                        var lcp = web["lcp"]?["time"] ?? web["lcp"]?["time"];
                        if (lcp != null && double.TryParse(lcp.ToString(), out double lcpMs))
                        {
                            int x = 6 + (int)(lcpMs * scale);
                            using (var pen = new Pen(Color.DarkOrange, 2))
                            {
                                g.DrawLine(pen, x, 6, x, 6 + H);
                            }
                            g.DrawString("LCP", new Font("Segoe UI", 8f, FontStyle.Bold), Brushes.DarkOrange, x + 2, 6);
                        }
                        var fcp = web["fcp"];
                        if (fcp != null && double.TryParse(fcp.ToString(), out double fcpMs))
                        {
                            int x2 = 6 + (int)(fcpMs * scale);
                            using (var pen = new Pen(Color.Green, 2))
                            {
                                g.DrawLine(pen, x2, 6, x2, 6 + H);
                            }
                            g.DrawString("FCP", new Font("Segoe UI", 8f, FontStyle.Bold), Brushes.Green, x2 + 2, 6);
                        }
                        var tbt = web["tbt"];
                        if (tbt != null && double.TryParse(tbt.ToString(), out double tbtMs))
                        {
                            // show TBT as small label at top-left area
                            g.DrawString($"TBT: {Math.Round(tbtMs)} ms", new Font("Segoe UI", 8f), Brushes.DarkRed, 8, 6 + H - 16);
                        }
                    }
                }
                catch
                {
                    // 무시
                }
            };

            // 타임라인 클릭 -> 가장 가까운 프레임 선택
            timelinePanel.MouseClick += (s, e) =>
            {
                int W = Math.Max(1, timelinePanel.ClientSize.Width - 12);
                double scale = W / maxMs;
                double clickedMs = (e.X - 6) / scale;
                // 가장 가까운 프레임 찾기
                FrameModel nearest = null;
                double bestDist = double.MaxValue;
                foreach (var f in framesLocal2)
                {
                    double dist = Math.Abs(f.TimestampSec * 1000.0 - clickedMs);
                    if (dist < bestDist)
                    {
                        bestDist = dist;
                        nearest = f;
                    }
                }
                if (nearest != null)
                {
                    // 보여주기
                    DisplayFrame(nearest, pictureBox, metaText, domText, domRenderer);
                }
            };

            // 썸네일 생성 (최대 200 프레임)
            int max = Math.Min(framesLocal2.Count, 200);
            for (int i = 0; i < max; i++)
            {
                var f = framesLocal2[i];
                var pb = new PictureBox
                {
                    Width = 200,
                    Height = 112,
                    SizeMode = PictureBoxSizeMode.Zoom,
                    BorderStyle = BorderStyle.FixedSingle,
                    Tag = f,
                    Cursor = Cursors.Hand,
                    Margin = new Padding(3)
                };

                try
                {
                    byte[] imgBytes = Convert.FromBase64String(f.Base64Png);
                    using (var ms = new MemoryStream(imgBytes))
                    {
                        pb.Image = Image.FromStream(ms);
                    }
                }
                catch
                {
                    // 무시
                }

                var lbl = new Label
                {
                    Text = $"{i + 1}. {Math.Round(f.TimestampSec * 1000)} ms",
                    AutoSize = false,
                    TextAlign = ContentAlignment.MiddleCenter,
                    Width = 200,
                    Height = 18
                };

                var panel = new Panel
                {
                    Width = 200,
                    Height = 140
                };
                pb.Dock = DockStyle.Top;
                lbl.Dock = DockStyle.Bottom;
                panel.Controls.Add(pb);
                panel.Controls.Add(lbl);

                pb.Click += (s, e) =>
                {
                    var sel = (s as PictureBox)?.Tag as FrameModel;
                    if (sel == null) return;
                    DisplayFrame(sel, pictureBox, metaText, domText, domRenderer);
                };

                thumbnailsPanel.Controls.Add(panel);
            }

            // 자동 첫 프레임 표시
            if (thumbnailsPanel.Controls.Count > 0)
            {
                var firstPb = thumbnailsPanel.Controls.OfType<Panel>().First().Controls.OfType<PictureBox>().FirstOrDefault();
                if (firstPb != null)
                {
                    var sel = firstPb.Tag as FrameModel;
                    if (sel != null) DisplayFrame(sel, pictureBox, metaText, domText, domRenderer);
                }
            }

            // 레이아웃 구성: 타임라인 위에 rightPanel 내용, 왼쪽에 썸네일
            var centerPanel = new Panel { Dock = DockStyle.Fill };
            centerPanel.Controls.Add(rightPanel);
            centerPanel.Controls.Add(timelinePanel);

            tab.Controls.Add(centerPanel);
            tab.Controls.Add(thumbnailsPanel);
        }

        private string GenerateFrameAnalysisText(List<FrameModel> frames, List<RequestRecord> requests)
        {
            if (frames == null || frames.Count == 0) return "프레임 데이터가 없습니다.";
            if (requests == null) requests = new List<RequestRecord>();

            var sb = new StringBuilder();
            sb.AppendLine("프레임별 네트워크 연동 요약 (AI 평가용 기본 텍스트)");
            sb.AppendLine("분석 기준: 각 프레임의 타임스탬프 기준 윈도우 [-2000ms, +500ms], 느린 리소스 기준 >=500ms");
            sb.AppendLine();

            int frameLimit = Math.Min(frames.Count, 100); // 너무 길어지지 않게 제한
            double totalAvgDuration = 0;
            int totalCount = 0;

            for (int i = 0; i < frameLimit; i++)
            {
                var f = frames[i];
                double frameMs = f.TimestampSec * 1000.0;
                double winStart = frameMs - 2000.0;
                double winEnd = frameMs + 500.0;

                var rel = requests
                    .Select(r =>
                    {
                        double sMs = (r.StartSec - (_result?.NetworkPerfResult?.NavigateStartTime ?? 0.0)) * 1000.0;
                        double eMs = (r.EndSec - (_result?.NetworkPerfResult?.NavigateStartTime ?? 0.0)) * 1000.0;
                        if (eMs < sMs) eMs = sMs;
                        return new { Req = r, StartMs = sMs, EndMs = eMs, Duration = eMs - sMs };
                    })
                    .Where(x => x.EndMs >= winStart && x.StartMs <= winEnd)
                    .ToList();

                sb.AppendLine($"프레임 {i + 1} @ {Math.Round(frameMs)} ms: 관련 요청 {rel.Count}개");

                if (rel.Count == 0)
                {
                    sb.AppendLine("  - 이 프레임에서 네트워크 로딩 없음(또는 윈도우 내 요청 없음). UI 랜더링 지연 원인은 네트워크가 아닐 수 있음.");
                    sb.AppendLine();
                    continue;
                }

                totalCount += rel.Count;
                totalAvgDuration += rel.Sum(x => x.Duration);

                // 느린 리소스 상위 3개
                var slow = rel.OrderByDescending(x => x.Duration).Take(3).ToList();
                foreach (var sEntry in slow)
                {
                    string urlShort = sEntry.Req.Url ?? "<unknown>";
                    if (urlShort.Length > 80) urlShort = urlShort.Substring(0, 77) + "...";
                    string kind = sEntry.Req.Type ?? "unknown";
                    string cls = sEntry.Duration >= 500 ? "느림" : sEntry.Duration >= 100 ? "보통" : "빠름";
                    sb.AppendLine($"  - [{cls}] {Math.Round(sEntry.Duration)}ms  ({kind}) {urlShort}");
                }

                // 간단한 통계
                double avgDur = rel.Count > 0 ? rel.Average(x => x.Duration) : 0;
                sb.AppendLine($"  평균 지속시간: {Math.Round(avgDur)} ms");
                sb.AppendLine();
            }

            if (totalCount > 0)
            {
                sb.AppendLine("전체 요약:");
                sb.AppendLine($"  검사된 프레임 수: {frameLimit}");
                sb.AppendLine($"  검사된 관련 요청 총합: {totalCount}");
                sb.AppendLine($"  전체 평균 요청 지속시간: {Math.Round(totalAvgDuration / totalCount)} ms (대략)");
            }
            else
            {
                sb.AppendLine("전체 요약: 네트워크 관련 요청이 없습니다.");
            }

            sb.AppendLine();
            sb.AppendLine("권장: 이 텍스트를 AI에 입력하여 UI/UX 평가(지연 원인 가설, 리소스 우선순위 제안 등)를 요청하십시오.");
            return sb.ToString();
        }

        private void DisplayFrame(FrameModel sel, PictureBox pictureBox, TextBox metaText, TextBox domText, WebView2 domRenderer)
        {
            if (sel == null) return;
            _selectedFrame = sel;
            try
            {
                byte[] imgBytes = Convert.FromBase64String(sel.Base64Png);
                using (var ms = new MemoryStream(imgBytes))
                {
                    var img = Image.FromStream(ms);
                    pictureBox.Image = new Bitmap(img);
                }
            }
            catch
            {
                pictureBox.Image = null;
            }

            if (sel.Metadata != null)
            {
                metaText.Text = sel.Metadata.ToString(Formatting.Indented);
                // DOM 스니펫이 Metadata 안에 있으면 domText에 보여줌
                var domSnippet = sel.Metadata["domSnippet"]?.ToString();
                var domLen = sel.Metadata["domLength"]?.ToString();
                if (!string.IsNullOrEmpty(domSnippet))
                {
                    domText.Text = domSnippet;

                    // WebView2에 렌더링 (DOM 조각을 안전한 HTML로 래핑)
                    string wrapped = "<!doctype html><html><head><meta charset=\"utf-8\"></head><body>" + domSnippet + "</body></html>";
                    RenderDomInWebView(domRenderer, wrapped);
                }
                else if (!string.IsNullOrEmpty(domLen))
                {
                    domText.Text = $"DOM length: {domLen} (원본 스NI펫 없음)";
                    RenderDomInWebView(domRenderer, "<html><body><em>원본 DOM 스니펫이 없습니다.</em></body></html>");
                }
                else
                {
                    domText.Text = "DOM 스니펫이 없습니다.";
                    RenderDomInWebView(domRenderer, "<html><body><em>DOM 스니펫이 없습니다.</em></body></html>");
                }
            }
            else
            {
                metaText.Text = $"Timestamp: {sel.TimestampSec} s";
                domText.Text = "DOM 스니펫이 없습니다.";
                RenderDomInWebView(domRenderer, "<html><body><em>DOM 스니펫이 없습니다.</em></body></html>");
            }
        }

        private void RenderDomInWebView(WebView2 wv, string html)
        {
            if (wv == null) return;
            if (string.IsNullOrEmpty(html)) html = "<html><body></body></html>";
            try
            {
                // EnsureCoreWebView2Async 후 UI 스레드에서 NavigateToString 실행
                var t = wv.EnsureCoreWebView2Async(null);
                t.ContinueWith(tt =>
                {
                    try
                    {
                        // ContinueWith 실행 컨텍스트가 UI 스레드가 아닐 수 있으므로 Invoke로 보장
                        if (wv.InvokeRequired)
                        {
                            wv.Invoke((Action)(() =>
                            {
                                try { wv.NavigateToString(html); } catch { }
                            }));
                        }
                        else
                        {
                            try { wv.NavigateToString(html); } catch { }
                        }
                    }
                    catch { }
                }, TaskScheduler.FromCurrentSynchronizationContext());
            }
            catch
            {
                // 무시
            }
        }

        private string GetNodeJsonValue(TreeNode node)
        {
            if (node == null) return null;
            var token = node.Tag as JToken;
            if (token == null) return null;

            // 값 타입이면 간단히 문자열을 반환, 객체/배열이면 들여쓰기된 JSON 반환
            if (token.Type == JTokenType.Object || token.Type == JTokenType.Array)
            {
                return token.ToString(Formatting.Indented);
            }
            if (token is JValue)
            {
                return ((JValue)token).ToString();
            }
            return token.ToString(Formatting.Indented);
        }

        private void PopulateTreeFromJToken(JToken token, TreeNodeCollection nodes, string nodeName = null)
        {
            if (token == null) return;

            switch (token.Type)
            {
                case JTokenType.Object:
                    {
                        var obj = (JObject)token;
                        TreeNode parent = (nodeName == null) ? null : new TreeNode(nodeName) { Tag = token };
                        var targetNodes = parent == null ? nodes : parent.Nodes;
                        foreach (var prop in obj.Properties())
                        {
                            PopulateTreeFromJToken(prop.Value, targetNodes, prop.Name);
                        }
                        if (parent != null) nodes.Add(parent);
                        break;
                    }
                case JTokenType.Array:
                    {
                        var arr = (JArray)token;
                        TreeNode arrNode = (nodeName == null) ? new TreeNode($"Array [{arr.Count}]") { Tag = token } : new TreeNode(nodeName + $" [{arr.Count}]") { Tag = token };
                        int idx = 0;
                        foreach (var item in arr)
                        {
                            PopulateTreeFromJToken(item, arrNode.Nodes, $"[{idx}]");
                            idx++;
                        }
                        nodes.Add(arrNode);
                        break;
                    }
                case JTokenType.Property:
                    {
                        var prop = (JProperty)token;
                        PopulateTreeFromJToken(prop.Value, nodes, prop.Name);
                        break;
                    }
                default:
                    {
                        // JValue 또는 기타
                        string text = nodeName != null ? $"{nodeName}: {token.ToString()}" : token.ToString();
                        var leaf = new TreeNode(text) { Tag = token };
                        nodes.Add(leaf);
                        break;
                    }
            }
        }

        private void BuildNetworkChart()
        {
            network_flow_chart.Series.Clear();
            network_flow_chart.ChartAreas.Clear();
            network_flow_chart.Legends.Clear();

            var area = new ChartArea("net");
            area.AxisX.MajorGrid.Enabled = false;
            area.AxisY.MajorGrid.Enabled = true;
            area.AxisX.LabelStyle.Enabled = false;
            area.AxisX.LineWidth = 0;
            area.AxisY.MajorTickMark.Enabled = false;
            area.AxisY.MinorTickMark.Enabled = false;
            area.AxisY.Title = "";
            area.AxisX.Title = "Time (ms)";
            network_flow_chart.ChartAreas.Add(area);

            var series = new Series("Waterfall")
            {
                ChartType = SeriesChartType.RangeBar,
                ChartArea = "net"
            };
            network_flow_chart.Series.Add(series);

            var temp = _result.NetworkPerfResult._requestLists;
            temp.Sort((a, b) => ((b.EndSec - b.StartSec).CompareTo(a.EndSec - a.StartSec)));
            if (temp.Count > 50) temp = temp.GetRange(0, 50);

            int idx = 0;
            foreach (var r in temp)
            {
                double startMs = (r.StartSec - _result.NetworkPerfResult.NavigateStartTime) * 1000;
                double endMs = (r.EndSec - _result.NetworkPerfResult.NavigateStartTime) * 1000;
                if (endMs < startMs) endMs = startMs;

                string label = $"{idx + 1}. {r.Type} {Math.Round(endMs - startMs)}ms";
                var pointIndex = series.Points.AddXY(label, startMs, endMs);
                var p = series.Points[pointIndex];
                p.ToolTip = $"종류 : {r.Type} , {Math.Round(endMs - startMs)}ms , 크기 : {r.Size}바이트\n{r.Url}";
                idx++;
            }
        }

        private void network_flow_chart_Click(object sender, EventArgs e)
        {

        }

        private Label CreateMetricBadge(string name, double ms)
        {
            var lbl = new Label
            {
                AutoSize = false,
                Width = 120,
                Height = 32,
                Margin = new Padding(4),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                BorderStyle = BorderStyle.FixedSingle,
                BackColor = Color.AliceBlue,
                Text = $"{name}\n{Math.Round(ms)} ms"
            };
            return lbl;
        }

        private Label CreateScoreBadge(int score)
        {
            var lbl = new Label
            {
                AutoSize = false,
                Width = 120,
                Height = 32,
                Margin = new Padding(4),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", 11f, FontStyle.Bold),
                BorderStyle = BorderStyle.FixedSingle,
                BackColor = score >= 90 ? Color.LightGreen : score >= 70 ? Color.Khaki : Color.LightCoral,
                ForeColor = Color.Black,
                Text = $"성능 점수\n{score} / 100"
            };
            return lbl;
        }

        private void ShowPerfScoreDetails()
        {
            // _lastPerfScore가 없으면 계산 시도
            var perf = _lastPerfScore;
            if (perf == null)
            {
                var metrics = ExtractMetricsDict(_result?.DevToolsPerformanceJson ?? "");
                perf = ComputePerformanceScore(metrics, _result?.NetworkPerfResult, _result?.Frames);
            }

            var dlg = new Form
            {
                Text = "성능 점수 상세",
                Width = 800,
                Height = 480,
                StartPosition = FormStartPosition.CenterParent
            };

            var lbl = new Label
            {
                Text = $"Final Score: {perf.FinalScore} / 100",
                Dock = DockStyle.Top,
                Height = 36,
                TextAlign = ContentAlignment.MiddleLeft,
                Font = new Font("Segoe UI", 10f, FontStyle.Bold),
                Padding = new Padding(8)
            };

            var dgv = new DataGridView
            {
                Dock = DockStyle.Fill,
                ReadOnly = true,
                AllowUserToAddRows = false,
                AllowUserToDeleteRows = false,
                RowHeadersVisible = false,
                AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
                SelectionMode = DataGridViewSelectionMode.FullRowSelect
            };

            dgv.Columns.Add("Name", "Name");
            dgv.Columns.Add("Value", "Value");
            dgv.Columns.Add("Score", "Score");
            dgv.Columns.Add("Source", "Source");
            dgv.Columns.Add("Note", "Note");

            foreach (var d in perf.Details)
            {
                dgv.Rows.Add(d.Name ?? "", d.Value, d.Score, d.Source ?? "", d.Note ?? "");
            }

            // Progress 열 추가 (표시용 문자열 + 색상)
            dgv.Columns.Add("Progress", "Progress");
            dgv.CellFormatting += (s, e) =>
            {
                if (e.RowIndex < 0 || e.ColumnIndex < 0) return;
                if (dgv.Columns[e.ColumnIndex].Name == "Score")
                {
                    int v;
                    if (int.TryParse(e.Value?.ToString() ?? "0", out v))
                    {
                        // 백그라운드 색상 (성능 눈에 띄게)
                        var cellStyle = new DataGridViewCellStyle();
                        if (v >= 90) cellStyle.BackColor = Color.LightGreen;
                        else if (v >= 70) cellStyle.BackColor = Color.Khaki;
                        else cellStyle.BackColor = Color.LightCoral;
                        dgv.Rows[e.RowIndex].DefaultCellStyle = cellStyle;

                        // Progress 칸 텍스트 업데이트
                        dgv.Rows[e.RowIndex].Cells["Progress"].Value = $"{v}%";
                    }
                }
            };

            var btnPanel = new Panel { Dock = DockStyle.Bottom, Height = 40 };
            var copyBtn = new Button { Text = "클립보드 복사", Dock = DockStyle.Right, Width = 120 };
            var closeBtn = new Button { Text = "닫기", Dock = DockStyle.Right, Width = 80, DialogResult = DialogResult.OK };

            copyBtn.Click += (s, e) =>
            {
                try
                {
                    var sb = new StringBuilder();
                    sb.AppendLine($"FinalScore:\t{perf.FinalScore}");
                    sb.AppendLine("Name\tValue\tScore\tSource\tNote");
                    foreach (var d in perf.Details)
                    {
                        sb.AppendLine($"{d.Name}\t{d.Value}\t{d.Score}\t{d.Source}\t{d.Note}");
                    }
                    Clipboard.SetText(sb.ToString());
                    MessageBox.Show("세부 항목이 클립보드로 복사되었습니다.", "정보", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                catch
                {
                    MessageBox.Show("복사 실패", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            };

            btnPanel.Controls.Add(closeBtn);
            btnPanel.Controls.Add(copyBtn);

            dlg.Controls.Add(dgv);
            dlg.Controls.Add(lbl);
            dlg.Controls.Add(btnPanel);
            dlg.AcceptButton = closeBtn;
            dlg.ShowDialog(this);
        }
    }
}
