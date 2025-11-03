using Microsoft.Web.WebView2.Core;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WebPerf.Model
{
    public class RequestRecord
    {
        public string Id;
        public string Url;
        public string Type;
        public double StartSec;
        public double EndSec;
        public long Size;
    }

    public class NetworkPerfModel
    {
        private Dictionary<string, RequestRecord> _requestCtxs;
        public List<RequestRecord> _requestLists;
        public double NavigateStartTime { get; private set; }

        public NetworkPerfModel()
        {
            _requestCtxs = new Dictionary<string, RequestRecord>();
            _requestLists = new List<RequestRecord>();
            // 최초값을 -1로 둬야 OnNetworkRequestStart에서 정상적으로 첫 네비게이션 타임을 기록함.
            NavigateStartTime = -1;
        }

        public void OnNetworkRequestStart(CoreWebView2DevToolsProtocolEventReceivedEventArgs e)
        {
            if (e == null) return;

            dynamic o = JsonConvert.DeserializeObject(e.ParameterObjectAsJson);
            string id = o.requestId;

            if (string.IsNullOrWhiteSpace(id) == true)
            {
                return;
            }

            string url = (string)o.request.url;
            string type = (string)(o.type ?? "Other");
            double ts = (double)o.timestamp;

            if (NavigateStartTime == -1)
            {
                NavigateStartTime = ts;
            }

            _requestCtxs[id] = new RequestRecord() { Id = id, Type = type, StartSec = ts, Url = url };
        }

        public void OnNetworkRequestEnd(CoreWebView2DevToolsProtocolEventReceivedEventArgs e)
        {
            dynamic o = JsonConvert.DeserializeObject(e.ParameterObjectAsJson);
            string id = o.requestId;

            if (_requestCtxs.ContainsKey(id) == false)
            {
                return;
            }

            var requestCtx = _requestCtxs[id];

            requestCtx.EndSec = (double)o.timestamp;
            requestCtx.Size = (long)(o.encodedDataLength ?? 0);

            //Console.WriteLine("{0} {1} {2}", requestCtx.StartSec, requestCtx.EndSec, requestCtx.EndSec - requestCtx.StartSec);

            _requestCtxs.Remove(id);
            _requestLists.Add(requestCtx);
        }
    }

    public class PerfResultModel
    {
        public TimeSpan RunningTime;
        public NetworkPerfModel NetworkPerfResult;
        public string DevToolsPerformanceJson;

        // 수집된 프레임 리스트 (Base64 PNG + 메타)
        public List<FrameModel> Frames;
    }
}
