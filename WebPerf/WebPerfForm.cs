using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using WebPerf.DeviceCondition;
using WebPerf.Model;

namespace WebPerf
{
    public partial class WebPerfForm : Form
    {
        private WebViewerForm _viewerForm = null;

        public WebPerfForm()
        {
            InitializeComponent();

            var networkItems = NetworkConditions.GetNetworkOptionsLabels();
            foreach (var networkItem in networkItems)
            {
                this.network_perf_cmb.Items.Add(networkItem);
            }
            this.network_perf_cmb.SelectedIndex = 0;

            var cpuItems = CpuConditions.GetCpuOptionsLabels();
            foreach (var cpuItem in cpuItems)
            {
                this.device_perf_cmb.Items.Add(cpuItem);
            }
            this.device_perf_cmb.SelectedIndex = 0;

        }

        private void start_btn_Click(object sender, EventArgs e)
        {
            string addr = this.addr_textbox.Text;

            if (string.IsNullOrWhiteSpace(addr))
            {
                MessageBox.Show("웹 사이트 주소를 입력하십시오.", "WebPerfView", MessageBoxButtons.OK, MessageBoxIcon.Warning);

                return;
            }

            var op = NetworkConditions.GetNetworkOptionFromLabel(this.network_perf_cmb.SelectedItem.ToString());

            var profile = NetworkProfilesManager.GetProfile(op);

            if (_viewerForm != null)
            {
                _viewerForm.Dispose();
                _viewerForm = null;
            }

            var cpuOp = CpuConditions.GetCpuOptionFromLabel(this.device_perf_cmb.SelectedItem.ToString());

            var cpuProfile = CpuProfilesManager.GetProfile(cpuOp);

            _viewerForm = new WebViewerForm(addr, profile, cpuProfile, cache_chk.Checked);
            _viewerForm.ShowDialog();

            if (_viewerForm.IsGracefulEnd == true)
            {
                PerfResultModel result = new PerfResultModel();
                result.RunningTime = _viewerForm.GetWorkingTime();
                result.NetworkPerfResult = _viewerForm.GetNetworkPerfResults();

                // WebViewerForm이 수집한 DevTools / window.performance JSON을 결과에 포함
                result.DevToolsPerformanceJson = _viewerForm.GetPerformanceJson();

                // 캡처된 프레임을 결과에 포함
                result.Frames = _viewerForm.GetCapturedFrames();

                var resultForm = new WebPerfResultForm(result);
                resultForm.ShowDialog();
            }
        }
    }
}