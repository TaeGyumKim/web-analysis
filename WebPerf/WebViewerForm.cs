using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using WebPerf.DeviceCondition;
using WebPerf.Model;

namespace WebPerf
{
    internal partial class WebViewerForm : Form
    {
        private string _url = string.Empty;
        private NetworkProfiles _networkProfiles = null;
        private CpuProfiles _cpu_profiles = null;
        private bool _useCache = false;

        private Task _initializeTask = null;

        private DateTime _startTime = DateTime.MinValue;
        private DateTime _endTime = DateTime.MinValue;

        private NetworkPerfModel _traceNetworkPerf = new NetworkPerfModel();

        // 수집한 DevTools/performance 정보 저장
        private JToken _devToolsPerf = null;

        // 캡처된 프레임 목록
        private List<FrameModel> _frames = new List<FrameModel>();
        private readonly object _framesLock = new object();

        // 캡처 타이머 (UI 스레드에서 실행)
        private System.Windows.Forms.Timer _captureTimer;

        public bool IsGracefulEnd { get; private set; } = false;

        public WebViewerForm()
        {
            InitializeComponent();
        }

        public WebViewerForm(string url, NetworkProfiles networkProfiles, CpuProfiles cpuProfiles, bool useCache)
        {
            InitializeComponent();

            _url = url;
            _networkProfiles = networkProfiles;
            _cpu_profiles_assign(cpuProfiles); // 빌드 안정성 헬퍼(무시 가능)
            _cpu_profiles = cpuprofiles_safe_assign(cpuProfiles);
            _useCache = useCache;

            _initializeTask = EnsureWebView2Async();
        }

        // 헬퍼들 (안정성)
        private void _cpu_profiles_assign(CpuProfiles _p) { /* no-op for stability */ }
        private CpuProfiles cpuprofiles_safe_assign(CpuProfiles p) { return p; }

        private async Task EnsureWebView2Async()
        {
            try
            {
                await webview.EnsureCoreWebView2Async();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"EnsureCoreWebView2Async failed: {ex}");
                return;
            }

            try
            {
                await CdpAsync("Network.enable");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Cdp Network.enable failed: {ex}");
            }

            if (_useCache == false)
            {
                try
                {
                    await CdpAsync("Network.setCacheDisabled", new { cacheDisabled = true });
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Cdp Network.setCacheDisabled failed: {ex}");
                }
            }

            try
            {
                await CdpAsync("Network.emulateNetworkConditions", new
                {
                    offline = false,
                    latency = _networkProfiles?.LatencyMS ?? 0,
                    downloadThroughput = _networkProfiles?.MaxDownloadBps ?? 0,
                    uploadThroughput = _networkProfiles?.MaxUploadBps ?? 0,
                });
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Cdp Network.emulateNetworkConditions failed: {ex}");
            }

            try
            {
                await CdpAsync("Emulation.setCPUThrottlingRate", new { rate = _cpu_profiles_safe() });
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Cdp Emulation.setCPUThrottlingRate failed: {ex}");
            }

            // Inject page script on every navigation to collect LCP / longtasks (TBT) / FCP
            try
            {
                string script = @"
(function(){
  try{
    if(window.__webperf_metrics__) return;
    window.__webperf_metrics__ = { lcp: null, fcp: null, longTasks: [], tbt: 0 };
    // LCP
    try{
      new PerformanceObserver(function(list){
        for(const entry of list.getEntries()){
          // use renderTime or startTime
          var time = entry.renderTime || entry.startTime || entry.startTime;
          window.__webperf_metrics__.lcp = { time: time, tag: (entry.element && entry.element.tagName) ? entry.element.tagName.toLowerCase() : null, snippet: entry.element ? (entry.element.outerHTML||'').substr(0,2000) : null };
        }
      }).observe({type:'largest-contentful-paint', buffered:true});
    }catch(e){}
    // Paint (FCP)
    try{
      new PerformanceObserver(function(list){
        for(const entry of list.getEntries()){
          if(entry.name === 'first-contentful-paint'){
            window.__webperf_metrics__.fcp = entry.startTime;
          }
        }
      }).observe({type:'paint', buffered:true});
    }catch(e){}
    // Long tasks -> TBT accumulation
    try{
      new PerformanceObserver(function(list){
        for(const entry of list.getEntries()){
          var dur = entry.duration || 0;
          window.__webperf_metrics__.longTasks.push({ start: entry.startTime, duration: dur });
          var over = Math.max(0, dur - 50);
          window.__webperf_metrics__.tbt += over;
        }
      }).observe({type:'longtask', buffered:true});
    }catch(e){}
    // also expose current resource timings on demand
    // no-op end
  }catch(e){}
})();";
                // Add script so it's evaluated on document creation for every navigation
                await webview.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(script);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"AddScriptToExecuteOnDocumentCreatedAsync failed: {ex}");
            }

            webview.CoreWebView2.GetDevToolsProtocolEventReceiver("Network.requestWillBeSent")
              .DevToolsProtocolEventReceived += (s, e) =>
              {
                  try
                  {
                      _traceNetworkPerf.OnNetworkRequestStart(e);
                  }
                  catch (Exception ex)
                  {
                      Debug.WriteLine($"OnNetworkRequestStart exception: {ex}");
                  }
              };

            webview.CoreWebView2.GetDevToolsProtocolEventReceiver("Network.loadingFinished")
              .DevToolsProtocolEventReceived += (s, e) =>
              {
                  try
                  {
                      _traceNetworkPerf.OnNetworkRequestEnd(e);
                  }
                  catch (Exception ex)
                  {
                      Debug.WriteLine($"OnNetworkRequestEnd exception: {ex}");
                  }
              };

            webview.NavigationStarting += Webview_NavigationStarting;
            webview.NavigationCompleted += Webview_NavigationCompleted;

            // Page 도메인 활성화
            try
            {
                await CdpAsync("Page.enable");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Cdp Page.enable failed: {ex}");
            }

            // 시작 시간 초기화(네비게이션 시작 시 설정)
            _startTime = DateTime.MinValue;

            // 핵심 변경: 네비게이션 호출 전에 캡처 타이머와 시작 시간을 설정하여
            // "로드 되기 전(초기 빈 화면)" 상태부터 캡처하도록 함.
            // StartCaptureTimer 내부에서 중복 시작을 방지하므로 NavigationCompleted에서도 안전.
            _startTime = DateTime.UtcNow;
            StartCaptureTimer();

            // 마지막으로 탐색 시작
            try
            {
                webview.CoreWebView2.Navigate(_url);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Navigate failed: {ex}");
            }
        }

        private void Webview_NavigationCompleted(object sender, Microsoft.Web.WebView2.Core.CoreWebView2NavigationCompletedEventArgs e)
        {
            loading_progress.Style = ProgressBarStyle.Continuous;
            loading_progress.Enabled = false;

            try
            {
                if (_startTime == DateTime.MinValue)
                {
                    _startTime = DateTime.UtcNow;
                }

                // 타이머 기반 캡처 시작 (UI 스레드)
                StartCaptureTimer();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"NavigationCompleted handler exception: {ex}");
            }
        }

        private void Webview_NavigationStarting(object sender, Microsoft.Web.WebView2.Core.CoreWebView2NavigationStartingEventArgs e)
        {
            loading_progress.Enabled = true;
            loading_progress.Style = ProgressBarStyle.Marquee;
        }

        private string Json(object o)
        {
            return JsonConvert.SerializeObject(o);
        }

        private async Task CdpAsync(string method, object param = null)
        {
            try
            {
                await webview.CoreWebView2.CallDevToolsProtocolMethodAsync(method, param == null ? "{}" : Json(param));
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"CdpAsync({method}) failed: {ex}");
                throw;
            }
        }

        private async Task<JToken> CdpCallAsync(string method, object param = null)
        {
            try
            {
                string res = await webview.CoreWebView2.CallDevToolsProtocolMethodAsync(method, param == null ? "{}" : Json(param));
                if (string.IsNullOrWhiteSpace(res))
                    return null;
                try
                {
                    return JToken.Parse(res);
                }
                catch
                {
                    return JValue.CreateString(res);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"CdpCallAsync({method}) failed: {ex}");
                return null;
            }
        }

        // UI 스레드 타이머 기반 캡처: 안정적으로 WebView2와 동작
        private void StartCaptureTimer()
        {
            if (_captureTimer != null)
                return;

            _captureTimer = new System.Windows.Forms.Timer();
            _captureTimer.Interval = 100; // 100ms
            _captureTimer.Tick += async (s, e) =>
            {
                try
                {
                    var res = await CdpCallAsync("Page.captureScreenshot", new { format = "png", fromSurface = true });
                    if (res != null)
                    {
                        string b64 = null;
                        if (res.Type == JTokenType.Object && res["data"] != null)
                        {
                            b64 = res["data"].ToString();
                        }
                        else
                        {
                            b64 = res.ToString();
                        }

                        if (!string.IsNullOrWhiteSpace(b64))
                        {
                            var ts = (DateTime.UtcNow - (_startTime == DateTime.MinValue ? DateTime.UtcNow : _startTime)).TotalSeconds;

                            // DOM 캡처는 비용이 있으므로 현재는 최초 프레임(또는 필요 시 조건 변경)에서만 가져오도록 함.
                            string domFull = null;
                            bool needDom = false;
                            lock (_framesLock)
                            {
                                needDom = _frames.Count == 0; // 최초 프레임에만 DOM을 저장
                            }

                            if (needDom)
                            {
                                try
                                {
                                    var domRes = await CdpCallAsync("Runtime.evaluate", new
                                    {
                                        expression = "document.documentElement.outerHTML",
                                        returnByValue = true,
                                        awaitPromise = false
                                    });

                                    if (domRes != null)
                                    {
                                        var v = domRes["result"]?["result"]?["value"] ?? domRes["result"]?["value"] ?? domRes["value"];
                                        if (v != null)
                                        {
                                            domFull = v.ToString();
                                        }
                                    }
                                }
                                catch (Exception ex)
                                {
                                    Debug.WriteLine($"DOM capture failed: {ex}");
                                }
                            }

                            // 메타데이터 구성 (timestamp + 선택적 DOM 스니펫/길이)
                            var meta = new JObject();
                            meta["timestamp"] = ts;
                            if (!string.IsNullOrEmpty(domFull))
                            {
                                // 전체 DOM은 클 수 있으니 표시/저장 목적에 따라 잘라서 저장.
                                meta["domSnippet"] = domFull.Length > 2000 ? domFull.Substring(0, 2000) : domFull;
                                meta["domLength"] = domFull.Length;
                            }

                            lock (_framesLock)
                            {
                                _frames.Add(new FrameModel
                                {
                                    TimestampSec = ts,
                                    Base64Png = b64,
                                    Metadata = meta
                                });
                                Debug.WriteLine($"Captured frame #{_frames.Count} len={b64.Length} ts={ts:F3}s domCaptured={(domFull != null)}");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Capture timer tick exception: {ex}");
                }
            };
            _captureTimer.Start();
            Debug.WriteLine("Capture timer started.");
        }

        private void StopCaptureTimer()
        {
            try
            {
                if (_captureTimer != null)
                {
                    _captureTimer.Stop();
                    _captureTimer.Tick -= null;
                    _captureTimer.Dispose();
                    _captureTimer = null;
                    Debug.WriteLine("Capture timer stopped.");
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"StopCaptureTimer exception: {ex}");
            }
        }

        private async Task CollectDevToolsPerfAsync()
        {
            try
            {
                var perfMetrics = await CdpCallAsync("Performance.getMetrics");

                var navExpr = "JSON.stringify((window.performance.getEntriesByType('navigation')[0]) || window.performance.timing)";
                var navRes = await CdpCallAsync("Runtime.evaluate", new { expression = navExpr, returnByValue = true, awaitPromise = true });

                var entriesExpr = "JSON.stringify(window.performance.getEntries())";
                var entriesRes = await CdpCallAsync("Runtime.evaluate", new { expression = entriesExpr, returnByValue = true, awaitPromise = true });

                // retrieve injected webperf metrics (LCP, FCP, longtasks/TBT)
                var webperfRes = await CdpCallAsync("Runtime.evaluate", new
                {
                    expression = "JSON.stringify(window.__webperf_metrics__ || {})",
                    returnByValue = true,
                    awaitPromise = true
                });

                var combined = new JObject();
                if (perfMetrics != null) combined["metrics"] = perfMetrics;

                JToken ExtractRuntimeValue(JToken runtimeResult)
                {
                    if (runtimeResult == null) return null;
                    var v = runtimeResult["result"]?["result"]?["value"] ?? runtimeResult["result"]?["value"] ?? runtimeResult["value"];
                    if (v == null) return null;
                    string s = v.ToString();
                    if (string.IsNullOrWhiteSpace(s)) return null;
                    try
                    {
                        return JToken.Parse(s);
                    }
                    catch
                    {
                        return JValue.CreateString(s);
                    }
                }

                var navVal = ExtractRuntimeValue(navRes);
                if (navVal != null) combined["navigationTiming"] = navVal;

                var entriesVal = ExtractRuntimeValue(entriesRes);
                if (entriesVal != null) combined["performanceEntries"] = entriesVal;

                var webperfVal = ExtractRuntimeValue(webperfRes);
                if (webperfVal != null) combined["webperfMetrics"] = webperfVal;

                _devToolsPerf = combined;
                Debug.WriteLine("Collected DevTools perf data.");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"CollectDevToolsPerfAsync exception: {ex}");
            }
        }

        private async void stop_btn_Click(object sender, EventArgs e)
        {
            _endTime = DateTime.UtcNow;

            try
            {
                if (_initializeTask != null && !_initializeTask.IsCompleted)
                {
                    await _initializeTask;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"_initializeTask wait exception: {ex}");
            }

            try
            {
                await CollectDevToolsPerfAsync();
            }
            catch (Exception ex)
            {       
                Debug.WriteLine($"CollectDevToolsPerfAsync exception (stop): {ex}");
            }

            // 타이머 중지
            StopCaptureTimer();

            try
            {
                await CdpAsync("Page.stopScreencast");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Page.stopScreencast failed: {ex}");
            }

            try
            {
                webview.Stop();
                webview.Dispose();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"webview dispose exception: {ex}");
            }

            if (_initializeTask != null && _initializeTask.IsCompleted == true)
            {
                IsGracefulEnd = true;
            }

            this.Close();
        }

        public TimeSpan GetWorkingTime()
        {
            return (_endTime == DateTime.MinValue) ? (DateTime.UtcNow - _startTime) : (_endTime - _startTime);
        }

        public NetworkPerfModel GetNetworkPerfResults()
        {
            return _traceNetworkPerf;
        }

        public string GetPerformanceJson()
        {
            try
            {
                return _devToolsPerf?.ToString(Formatting.None);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"GetPerformanceJson exception: {ex}");
                return null;
            }
        }

        public List<FrameModel> GetCapturedFrames()
        {
            lock (_framesLock)
            {
                return new List<FrameModel>(_frames);
            }
        }

        private float _cpu_profiles_safe()
        {
            try
            {
                return _cpu_profiles?.Throttles ?? 0f;
            }
            catch
            {
                return 0f;
            }
        }

        private void rotate_btn_Click(object sender, EventArgs e)
        {
            this.SuspendLayout();

            var cs = this.ClientSize;
            this.ClientSize = new Size(cs.Height, cs.Width);

            this.ResumeLayout();
        }
    }
}
