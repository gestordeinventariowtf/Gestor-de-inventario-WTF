using System;
using System.Diagnostics;
using System.Drawing;
using System.Net;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new QueueManagerForm());
    }
}

internal sealed class QueueManagerForm : Form
{
    private readonly Label status;

    public QueueManagerForm()
    {
        Text = "WTF ICG Host - Gestor de Cola";
        Width = 520;
        Height = 270;
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;

        var title = new Label { Text = "Gestor seguro de cola de movimientos", Dock = DockStyle.Top, Height = 42, Font = new Font("Segoe UI", 14, FontStyle.Bold), Padding = new Padding(14, 10, 0, 0) };
        var info = new Label { Text = "Selecciona movimientos individuales o todos desde el panel local.\r\nLa cancelación conserva una marca para que no vuelvan a subir por error.", Dock = DockStyle.Top, Height = 58, Padding = new Padding(14, 4, 10, 0) };
        var open = new Button { Text = "Abrir gestor de cola", Width = 190, Height = 38, Left = 14, Top = 118 };
        var folder = new Button { Text = "Abrir carpeta de datos", Width = 190, Height = 38, Left = 214, Top = 118 };
        status = new Label { Text = "Verificando WTF ICG Host...", Left = 14, Top = 180, Width = 470, Height = 32, ForeColor = Color.DarkSlateGray };

        open.Click += (sender, args) => OpenPanel();
        folder.Click += (sender, args) => OpenFolder();
        Controls.Add(status);
        Controls.Add(open);
        Controls.Add(folder);
        Controls.Add(info);
        Controls.Add(title);
        Shown += (sender, args) => CheckHost();
    }

    private void CheckHost()
    {
        try
        {
            var request = WebRequest.CreateHttp("http://127.0.0.1:8787/api/health");
            request.Timeout = 2000;
            using (request.GetResponse()) status.Text = "WTF ICG Host activo en 127.0.0.1:8787.";
        }
        catch { status.Text = "El Host no responde. Inícialo antes de abrir el gestor."; status.ForeColor = Color.DarkOrange; }
    }

    private void OpenPanel()
    {
        try { Process.Start(new ProcessStartInfo { FileName = "http://127.0.0.1:8787", UseShellExecute = true }); }
        catch (Exception ex) { MessageBox.Show(ex.Message, "Gestor de Cola", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }

    private void OpenFolder()
    {
        try { Process.Start(new ProcessStartInfo { FileName = "explorer.exe", Arguments = @"C:\ProgramData\WTF ICG Host\data", UseShellExecute = true }); }
        catch (Exception ex) { MessageBox.Show(ex.Message, "Gestor de Cola", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }
}
