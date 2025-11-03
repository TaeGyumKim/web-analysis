using Newtonsoft.Json.Linq;

namespace WebPerf.Model
{
    public class FrameModel
    {
        // CDP metadata.timestamp (초 단위, navigationStart 기준이 아님)
        public double TimestampSec { get; set; }

        // Base64로 인코딩된 PNG 데이터 (data: 없이 raw base64)
        public string Base64Png { get; set; }

        // 프레임 메타 정보(크기, timestamp 등)
        public JToken Metadata { get; set; }
    }
}