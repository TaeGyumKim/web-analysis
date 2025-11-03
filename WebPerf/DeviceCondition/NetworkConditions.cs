using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WebPerf.DeviceCondition
{
    internal class NetworkProfiles
    {
        public NetworkConditions.NetworkConditionOptions Options { get; set; }
        public int MaxDownloadBps { get; set; }
        public int MaxUploadBps { get; set; }
        public int LatencyMS { get; set; }
    }

    internal class NetworkProfilesManager
    {
        private static List<NetworkProfiles> s_NetworkProfiles = new List<NetworkProfiles>();
        static NetworkProfilesManager()
        {
            s_NetworkProfiles.Add(new NetworkProfiles() {
                Options = NetworkConditions.NetworkConditionOptions.Unlimited,
                MaxDownloadBps = -1,
                MaxUploadBps = -1,
                LatencyMS = 0,
            });

            s_NetworkProfiles.Add(new NetworkProfiles()
            {
                Options = NetworkConditions.NetworkConditionOptions.LTENetwork,
                MaxDownloadBps = 8000000,
                MaxUploadBps = 8000000,
                LatencyMS = 50,
            });

            s_NetworkProfiles.Add(new NetworkProfiles()
            {
                Options = NetworkConditions.NetworkConditionOptions.FiveMbps,
                MaxDownloadBps = 630000,
                MaxUploadBps = 630000,
                LatencyMS = 50,
            });

            s_NetworkProfiles.Add(new NetworkProfiles()
            {
                Options = NetworkConditions.NetworkConditionOptions.ThreeMbps,
                MaxDownloadBps = 400000,
                MaxUploadBps = 400000,
                LatencyMS = 50,
            });

            s_NetworkProfiles.Add(new NetworkProfiles()
            {
                Options = NetworkConditions.NetworkConditionOptions.OneMbps,
                MaxDownloadBps = 150000,
                MaxUploadBps = 150000,
                LatencyMS = 50,
            });

            s_NetworkProfiles.Add(new NetworkProfiles()
            {
                Options = NetworkConditions.NetworkConditionOptions.VerySlowNetwork,
                MaxDownloadBps = 40000,
                MaxUploadBps = 40000,
                LatencyMS = 70,
            });
        }

        internal static NetworkProfiles GetProfile(NetworkConditions.NetworkConditionOptions option)
        {
            return s_NetworkProfiles.Find(x=> x.Options == option);
        }
    }


    internal class NetworkConditions
    {
        internal enum NetworkConditionOptions
        {
            Unlimited = 0,
            LTENetwork,
            FiveMbps,
            ThreeMbps,
            OneMbps,
            VerySlowNetwork,
        }

        internal static List<string> GetNetworkOptionsLabels()
        {
            return new List<string>
            {
                "제한 없음",
                "모바일 네트워크",
                "5Mbps LTE QoS",
                "3Mbps LTE QoS",
                "1Mbps LTE QoS",
                "400Kbps LTE QoS",
            };
        }

        internal static string GetNetworkConditionOptionsLabel(NetworkConditionOptions options)
        {
            switch (options)
            {
                case NetworkConditionOptions.Unlimited:
                    {
                        return "제한 없음";
                    }
                case NetworkConditionOptions.LTENetwork:
                    {
                        return "모바일 네트워크";
                    }
                case NetworkConditionOptions.FiveMbps:
                    {
                        return "5Mbps LTE QoS";
                    }
                case NetworkConditionOptions.ThreeMbps:
                    {
                        return "3Mbps LTE QoS";
                    }
                case NetworkConditionOptions.OneMbps:
                    {
                        return "1Mbps LTE QoS";
                    }
                case NetworkConditionOptions.VerySlowNetwork:
                    {
                        return "400Kbps LTE QoS";
                    }
            }

            return "";
        }

        internal static NetworkConditionOptions GetNetworkOptionFromLabel(string label)
        {
            switch (label)
            {
                case "제한 없음":
                    return NetworkConditionOptions.Unlimited;
                case "모바일 네트워크":
                    return NetworkConditionOptions.LTENetwork;
                case "5Mbps LTE QoS":
                    return NetworkConditionOptions.FiveMbps;
                case "3Mbps LTE QoS":
                    return NetworkConditionOptions.ThreeMbps;
                case "1Mbps LTE QoS":
                    return NetworkConditionOptions.OneMbps;
            }

            return NetworkConditionOptions.VerySlowNetwork;
        }
    }
}
