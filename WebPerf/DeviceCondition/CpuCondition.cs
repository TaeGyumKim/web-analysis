using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WebPerf.DeviceCondition
{
    internal class CpuProfiles
    {
        public CpuConditions.CpuConditionOptions Options { get; set; }
        public float Throttles { get; set; }
    }

    internal class CpuProfilesManager
    {
        private static List<CpuProfiles> s_CpuProfiles = new List<CpuProfiles>();
        static CpuProfilesManager()
        {
            s_CpuProfiles.Add(new CpuProfiles()
            {
                Options = CpuConditions.CpuConditionOptions.Unlimited,
                Throttles = 1.0f,
            });

            s_CpuProfiles.Add(new CpuProfiles()
            {
                Options = CpuConditions.CpuConditionOptions.HighSpecdSmartphone,
                Throttles = 3.0f,
            });

            s_CpuProfiles.Add(new CpuProfiles()
            {
                Options = CpuConditions.CpuConditionOptions.MidSpecSmartphone,
                Throttles = 7.0f,
            });

            s_CpuProfiles.Add(new CpuProfiles()
            {
                Options = CpuConditions.CpuConditionOptions.LowSpecSmartphone,
                Throttles = 12.0f,
            });

            s_CpuProfiles.Add(new CpuProfiles()
            {
                Options = CpuConditions.CpuConditionOptions.UltraLowSpecSmartphone,
                Throttles = 14.0f,
            });
        }

        internal static CpuProfiles GetProfile(CpuConditions.CpuConditionOptions option)
        {
            return s_CpuProfiles.Find(x => x.Options == option);
        }
    }

    internal class CpuConditions
    {
        internal enum CpuConditionOptions
        {
            Unlimited = 0,
            HighSpecdSmartphone,
            MidSpecSmartphone,
            LowSpecSmartphone,
            UltraLowSpecSmartphone,
        }

        internal static List<string> GetCpuOptionsLabels()
        {
            return new List<string>
            {
                "제한 없음",
                "고급형 스마트폰",
                "중급형 스마트폰",
                "보급형 스마트폰",
                "초저사양 스마트폰",
            };
        }

        internal static string GetCpuConditionOptionsLabel(CpuConditionOptions options)
        {
            switch (options)
            {
                case CpuConditionOptions.Unlimited:
                    {
                        return "제한 없음";
                    }
                case CpuConditionOptions.HighSpecdSmartphone:
                    {
                        return "고급형 스마트폰";
                    }
                case CpuConditionOptions.MidSpecSmartphone:
                    {
                        return "중급형 스마트폰";
                    }
                case CpuConditionOptions.LowSpecSmartphone:
                    {
                        return "보급형 스마트폰";
                    }
                case CpuConditionOptions.UltraLowSpecSmartphone:
                    {
                        return "초저사양 스마트폰";
                    }
            }

            return "";
        }

        internal static CpuConditionOptions GetCpuOptionFromLabel(string label)
        {
            switch (label)
            {
                case "제한 없음":
                    return CpuConditionOptions.Unlimited;
                case "고급형 스마트폰":
                    return CpuConditionOptions.HighSpecdSmartphone;
                case "중급형 스마트폰":
                    return CpuConditionOptions.MidSpecSmartphone;
                case "보급형 스마트폰":
                    return CpuConditionOptions.LowSpecSmartphone;
                case "초저사양 스마트폰":
                    return CpuConditionOptions.UltraLowSpecSmartphone;
            }

            return CpuConditionOptions.Unlimited;
        }
    }
}
