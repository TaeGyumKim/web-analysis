
namespace WebPerf
{
    partial class WebPerfResultForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            System.Windows.Forms.DataVisualization.Charting.ChartArea chartArea1 = new System.Windows.Forms.DataVisualization.Charting.ChartArea();
            System.Windows.Forms.DataVisualization.Charting.Legend legend1 = new System.Windows.Forms.DataVisualization.Charting.Legend();
            System.Windows.Forms.DataVisualization.Charting.Series series1 = new System.Windows.Forms.DataVisualization.Charting.Series();
            this.basic_result_groupbox = new System.Windows.Forms.GroupBox();
            this.network_size_value_label = new System.Windows.Forms.Label();
            this.network_size_label = new System.Windows.Forms.Label();
            this.time_value_label = new System.Windows.Forms.Label();
            this.time_label = new System.Windows.Forms.Label();
            this.network_groupbox = new System.Windows.Forms.GroupBox();
            this.network_flow_chart = new System.Windows.Forms.DataVisualization.Charting.Chart();
            this.basic_result_groupbox.SuspendLayout();
            this.network_groupbox.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.network_flow_chart)).BeginInit();
            this.SuspendLayout();
            // 
            // basic_result_groupbox
            // 
            this.basic_result_groupbox.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.basic_result_groupbox.Controls.Add(this.network_size_value_label);
            this.basic_result_groupbox.Controls.Add(this.network_size_label);
            this.basic_result_groupbox.Controls.Add(this.time_value_label);
            this.basic_result_groupbox.Controls.Add(this.time_label);
            this.basic_result_groupbox.Location = new System.Drawing.Point(13, 16);
            this.basic_result_groupbox.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.basic_result_groupbox.Name = "basic_result_groupbox";
            this.basic_result_groupbox.Padding = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.basic_result_groupbox.Size = new System.Drawing.Size(657, 72);
            this.basic_result_groupbox.TabIndex = 0;
            this.basic_result_groupbox.TabStop = false;
            this.basic_result_groupbox.Text = "측정 결과";
            // 
            // network_size_value_label
            // 
            this.network_size_value_label.AutoSize = true;
            this.network_size_value_label.Location = new System.Drawing.Point(118, 48);
            this.network_size_value_label.Name = "network_size_value_label";
            this.network_size_value_label.Size = new System.Drawing.Size(11, 15);
            this.network_size_value_label.TabIndex = 3;
            this.network_size_value_label.Text = "-";
            // 
            // network_size_label
            // 
            this.network_size_label.AutoSize = true;
            this.network_size_label.ImageAlign = System.Drawing.ContentAlignment.MiddleRight;
            this.network_size_label.Location = new System.Drawing.Point(7, 48);
            this.network_size_label.Name = "network_size_label";
            this.network_size_label.Size = new System.Drawing.Size(94, 15);
            this.network_size_label.TabIndex = 2;
            this.network_size_label.Text = "네트워크 사용량";
            // 
            // time_value_label
            // 
            this.time_value_label.AutoSize = true;
            this.time_value_label.Location = new System.Drawing.Point(118, 22);
            this.time_value_label.Name = "time_value_label";
            this.time_value_label.Size = new System.Drawing.Size(11, 15);
            this.time_value_label.TabIndex = 1;
            this.time_value_label.Text = "-";
            // 
            // time_label
            // 
            this.time_label.AutoSize = true;
            this.time_label.Location = new System.Drawing.Point(7, 22);
            this.time_label.Name = "time_label";
            this.time_label.Size = new System.Drawing.Size(58, 15);
            this.time_label.TabIndex = 0;
            this.time_label.Text = "소요 시간";
            // 
            // network_groupbox
            // 
            this.network_groupbox.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.network_groupbox.Controls.Add(this.network_flow_chart);
            this.network_groupbox.Location = new System.Drawing.Point(13, 95);
            this.network_groupbox.Name = "network_groupbox";
            this.network_groupbox.Size = new System.Drawing.Size(657, 361);
            this.network_groupbox.TabIndex = 1;
            this.network_groupbox.TabStop = false;
            this.network_groupbox.Text = "네트워크 통신 과정";
            // 
            // network_flow_chart
            // 
            this.network_flow_chart.BackImageAlignment = System.Windows.Forms.DataVisualization.Charting.ChartImageAlignmentStyle.Top;
            chartArea1.Name = "ChartArea1";
            this.network_flow_chart.ChartAreas.Add(chartArea1);
            this.network_flow_chart.Dock = System.Windows.Forms.DockStyle.Fill;
            legend1.Name = "Legend1";
            this.network_flow_chart.Legends.Add(legend1);
            this.network_flow_chart.Location = new System.Drawing.Point(3, 17);
            this.network_flow_chart.Name = "network_flow_chart";
            series1.ChartArea = "ChartArea1";
            series1.Legend = "Legend1";
            series1.Name = "Series1";
            this.network_flow_chart.Series.Add(series1);
            this.network_flow_chart.Size = new System.Drawing.Size(651, 341);
            this.network_flow_chart.TabIndex = 0;
            this.network_flow_chart.Text = "chart1";
            this.network_flow_chart.Click += new System.EventHandler(this.network_flow_chart_Click);
            // 
            // WebPerfResultForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 15F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(682, 468);
            this.Controls.Add(this.network_groupbox);
            this.Controls.Add(this.basic_result_groupbox);
            this.Font = new System.Drawing.Font("Arial", 9F);
            this.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.Name = "WebPerfResultForm";
            this.Text = "WebPerfResultForm";
            this.basic_result_groupbox.ResumeLayout(false);
            this.basic_result_groupbox.PerformLayout();
            this.network_groupbox.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.network_flow_chart)).EndInit();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.GroupBox basic_result_groupbox;
        private System.Windows.Forms.Label time_value_label;
        private System.Windows.Forms.Label time_label;
        private System.Windows.Forms.Label network_size_value_label;
        private System.Windows.Forms.Label network_size_label;
        private System.Windows.Forms.GroupBox network_groupbox;
        private System.Windows.Forms.DataVisualization.Charting.Chart network_flow_chart;
    }
}