namespace WebPerf
{
    partial class WebViewerForm
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
            this.webview = new Microsoft.Web.WebView2.WinForms.WebView2();
            this.loading_progress = new System.Windows.Forms.ProgressBar();
            this.stop_btn = new System.Windows.Forms.Button();
            this.rotate_btn = new System.Windows.Forms.Button();
            ((System.ComponentModel.ISupportInitialize)(this.webview)).BeginInit();
            this.SuspendLayout();
            // 
            // webview
            // 
            this.webview.AllowExternalDrop = true;
            this.webview.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.webview.CreationProperties = null;
            this.webview.DefaultBackgroundColor = System.Drawing.Color.White;
            this.webview.Location = new System.Drawing.Point(13, 52);
            this.webview.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.webview.Name = "webview";
            this.webview.Size = new System.Drawing.Size(855, 463);
            this.webview.TabIndex = 0;
            this.webview.ZoomFactor = 1D;
            // 
            // loading_progress
            // 
            this.loading_progress.Location = new System.Drawing.Point(13, 6);
            this.loading_progress.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.loading_progress.Name = "loading_progress";
            this.loading_progress.Size = new System.Drawing.Size(564, 39);
            this.loading_progress.TabIndex = 1;
            // 
            // stop_btn
            // 
            this.stop_btn.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.stop_btn.Font = new System.Drawing.Font("Arial", 9F);
            this.stop_btn.Location = new System.Drawing.Point(740, 6);
            this.stop_btn.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.stop_btn.Name = "stop_btn";
            this.stop_btn.Size = new System.Drawing.Size(128, 39);
            this.stop_btn.TabIndex = 2;
            this.stop_btn.Text = "측정 종료";
            this.stop_btn.UseVisualStyleBackColor = true;
            this.stop_btn.Click += new System.EventHandler(this.stop_btn_Click);
            // 
            // rotate_btn
            // 
            this.rotate_btn.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.rotate_btn.Location = new System.Drawing.Point(583, 6);
            this.rotate_btn.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.rotate_btn.Name = "rotate_btn";
            this.rotate_btn.Size = new System.Drawing.Size(151, 39);
            this.rotate_btn.TabIndex = 3;
            this.rotate_btn.Text = "회전";
            this.rotate_btn.UseVisualStyleBackColor = true;
            this.rotate_btn.Click += new System.EventHandler(this.rotate_btn_Click);
            // 
            // WebViewerForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 15F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(880, 531);
            this.Controls.Add(this.rotate_btn);
            this.Controls.Add(this.stop_btn);
            this.Controls.Add(this.loading_progress);
            this.Controls.Add(this.webview);
            this.Font = new System.Drawing.Font("Arial", 9F);
            this.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.Name = "WebViewerForm";
            this.Text = "WebViewer";
            ((System.ComponentModel.ISupportInitialize)(this.webview)).EndInit();
            this.ResumeLayout(false);

        }

        #endregion

        private Microsoft.Web.WebView2.WinForms.WebView2 webview;
        private System.Windows.Forms.ProgressBar loading_progress;
        private System.Windows.Forms.Button stop_btn;
        private System.Windows.Forms.Button rotate_btn;
    }
}