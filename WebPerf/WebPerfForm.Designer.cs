namespace WebPerf
{
    partial class WebPerfForm
    {
        /// <summary>
        /// 필수 디자이너 변수입니다.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// 사용 중인 모든 리소스를 정리합니다.
        /// </summary>
        /// <param name="disposing">관리되는 리소스를 삭제해야 하면 true이고, 그렇지 않으면 false입니다.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form 디자이너에서 생성한 코드

        /// <summary>
        /// 디자이너 지원에 필요한 메서드입니다. 
        /// 이 메서드의 내용을 코드 편집기로 수정하지 마세요.
        /// </summary>
        private void InitializeComponent()
        {
            this.addr_label = new System.Windows.Forms.Label();
            this.addr_textbox = new System.Windows.Forms.TextBox();
            this.start_btn = new System.Windows.Forms.Button();
            this.perf_limit_group = new System.Windows.Forms.GroupBox();
            this.device_perf_cmb = new System.Windows.Forms.ComboBox();
            this.label1 = new System.Windows.Forms.Label();
            this.network_perf_cmb = new System.Windows.Forms.ComboBox();
            this.network_label = new System.Windows.Forms.Label();
            this.cache_label = new System.Windows.Forms.Label();
            this.cache_chk = new System.Windows.Forms.CheckBox();
            this.perf_limit_group.SuspendLayout();
            this.SuspendLayout();
            // 
            // addr_label
            // 
            this.addr_label.AutoSize = true;
            this.addr_label.Font = new System.Drawing.Font("Arial", 9F);
            this.addr_label.Location = new System.Drawing.Point(12, 15);
            this.addr_label.Name = "addr_label";
            this.addr_label.Size = new System.Drawing.Size(31, 15);
            this.addr_label.TabIndex = 0;
            this.addr_label.Text = "주소";
            // 
            // addr_textbox
            // 
            this.addr_textbox.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.addr_textbox.Location = new System.Drawing.Point(50, 12);
            this.addr_textbox.Name = "addr_textbox";
            this.addr_textbox.Size = new System.Drawing.Size(304, 21);
            this.addr_textbox.TabIndex = 1;
            // 
            // start_btn
            // 
            this.start_btn.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.start_btn.Location = new System.Drawing.Point(279, 240);
            this.start_btn.Name = "start_btn";
            this.start_btn.Size = new System.Drawing.Size(75, 23);
            this.start_btn.TabIndex = 2;
            this.start_btn.Text = "측정 시작";
            this.start_btn.UseVisualStyleBackColor = true;
            this.start_btn.Click += new System.EventHandler(this.start_btn_Click);
            // 
            // perf_limit_group
            // 
            this.perf_limit_group.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.perf_limit_group.Controls.Add(this.cache_chk);
            this.perf_limit_group.Controls.Add(this.cache_label);
            this.perf_limit_group.Controls.Add(this.device_perf_cmb);
            this.perf_limit_group.Controls.Add(this.label1);
            this.perf_limit_group.Controls.Add(this.network_perf_cmb);
            this.perf_limit_group.Controls.Add(this.network_label);
            this.perf_limit_group.Location = new System.Drawing.Point(15, 48);
            this.perf_limit_group.Name = "perf_limit_group";
            this.perf_limit_group.Size = new System.Drawing.Size(339, 108);
            this.perf_limit_group.TabIndex = 5;
            this.perf_limit_group.TabStop = false;
            this.perf_limit_group.Text = "기기 환경";
            // 
            // device_perf_cmb
            // 
            this.device_perf_cmb.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.device_perf_cmb.FormattingEnabled = true;
            this.device_perf_cmb.Location = new System.Drawing.Point(94, 50);
            this.device_perf_cmb.Name = "device_perf_cmb";
            this.device_perf_cmb.Size = new System.Drawing.Size(239, 23);
            this.device_perf_cmb.TabIndex = 3;
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(7, 54);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(58, 15);
            this.label1.TabIndex = 2;
            this.label1.Text = "기기 성능";
            // 
            // network_perf_cmb
            // 
            this.network_perf_cmb.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.network_perf_cmb.FormattingEnabled = true;
            this.network_perf_cmb.Location = new System.Drawing.Point(94, 19);
            this.network_perf_cmb.Name = "network_perf_cmb";
            this.network_perf_cmb.Size = new System.Drawing.Size(239, 23);
            this.network_perf_cmb.TabIndex = 1;
            // 
            // network_label
            // 
            this.network_label.AutoSize = true;
            this.network_label.Location = new System.Drawing.Point(6, 22);
            this.network_label.Name = "network_label";
            this.network_label.Size = new System.Drawing.Size(82, 15);
            this.network_label.TabIndex = 0;
            this.network_label.Text = "네트워크 환경";
            // 
            // cache_label
            // 
            this.cache_label.AutoSize = true;
            this.cache_label.Location = new System.Drawing.Point(7, 83);
            this.cache_label.Name = "cache_label";
            this.cache_label.Size = new System.Drawing.Size(121, 15);
            this.cache_label.TabIndex = 4;
            this.cache_label.Text = "네트워크 Cache 사용";
            // 
            // cache_chk
            // 
            this.cache_chk.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.cache_chk.AutoSize = true;
            this.cache_chk.Location = new System.Drawing.Point(318, 84);
            this.cache_chk.Name = "cache_chk";
            this.cache_chk.Size = new System.Drawing.Size(15, 14);
            this.cache_chk.TabIndex = 5;
            this.cache_chk.UseVisualStyleBackColor = true;
            // 
            // WebPerfForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(96F, 96F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Dpi;
            this.ClientSize = new System.Drawing.Size(366, 275);
            this.Controls.Add(this.perf_limit_group);
            this.Controls.Add(this.start_btn);
            this.Controls.Add(this.addr_textbox);
            this.Controls.Add(this.addr_label);
            this.Font = new System.Drawing.Font("Arial", 9F);
            this.Name = "WebPerfForm";
            this.Text = "Web UI Performance Tester";
            this.perf_limit_group.ResumeLayout(false);
            this.perf_limit_group.PerformLayout();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Label addr_label;
        private System.Windows.Forms.TextBox addr_textbox;
        private System.Windows.Forms.Button start_btn;
        private System.Windows.Forms.GroupBox perf_limit_group;
        private System.Windows.Forms.ComboBox network_perf_cmb;
        private System.Windows.Forms.Label network_label;
        private System.Windows.Forms.ComboBox device_perf_cmb;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.CheckBox cache_chk;
        private System.Windows.Forms.Label cache_label;
    }
}

