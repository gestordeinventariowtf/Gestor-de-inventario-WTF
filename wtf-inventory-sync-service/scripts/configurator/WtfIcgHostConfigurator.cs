using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Security.Principal;
using System.Text;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        if (!IsAdministrator())
        {
            try
            {
                Process.Start(new ProcessStartInfo {
                    FileName = Application.ExecutablePath,
                    UseShellExecute = true,
                    Verb = "runas"
                });
            }
            catch { }
            return;
        }
        Application.Run(new ConfigForm(ResolveRoot()));
    }

    private static bool IsAdministrator()
    {
        using (var identity = WindowsIdentity.GetCurrent())
        {
            var principal = new WindowsPrincipal(identity);
            return principal.IsInRole(WindowsBuiltInRole.Administrator);
        }
    }

    private static string ResolveRoot()
    {
        var baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
        var parent = Directory.GetParent(baseDir);
        return String.Equals(Path.GetFileName(baseDir), "app", StringComparison.OrdinalIgnoreCase) && parent != null
            ? parent.FullName : baseDir;
    }
}

internal sealed class ConfigForm : Form
{
    private readonly string root;
    private readonly string envPath;
    private readonly TextBox database = new TextBox();
    private readonly TextBox sqlDataPath = new TextBox();
    private readonly TextBox webApp = new TextBox();
    private readonly TextBox project = new TextBox();
    private readonly TextBox gateway = new TextBox();
    private readonly TextBox terminal = new TextBox();
    private readonly TextBox technicalCredential = new TextBox();
    private readonly TextBox apiKey = new TextBox();
    private readonly ComboBox mode = new ComboBox();
    private readonly Label status = new Label();

    public ConfigForm(string installRoot)
    {
        root = installRoot;
        envPath = Path.Combine(root, ".env");
        Text = "WTF ICG Host | Configurador";
        Width = 760; Height = 610; MinimumSize = new Size(700, 560);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(243, 244, 246);
        Font = new Font("Segoe UI", 9F);
        BuildUi();
        LoadValues();
    }

    private void BuildUi()
    {
        var header = new Panel { Dock = DockStyle.Top, Height = 78, BackColor = Color.FromArgb(15, 118, 110) };
        header.Controls.Add(new Label { Text = "WTF ICG Host", ForeColor = Color.White, Font = new Font("Segoe UI", 18F, FontStyle.Bold), Left = 24, Top = 12, AutoSize = true });
        header.Controls.Add(new Label { Text = "Configuración segura de conexión y sincronización", ForeColor = Color.WhiteSmoke, Left = 26, Top = 45, AutoSize = true });
        Controls.Add(header);

        var content = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(22, 18, 22, 8), ColumnCount = 2, RowCount = 11 };
        content.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 205));
        content.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        AddRow(content, 0, "Nombre de base de datos", database, "Ejemplo: DBFREST o FRS_WTFOODVZL");
        var pathPanel = new Panel { Dock = DockStyle.Fill };
        sqlDataPath.Dock = DockStyle.Fill; pathPanel.Controls.Add(sqlDataPath);
        var browse = new Button { Text = "Examinar", Width = 90, Dock = DockStyle.Right };
        browse.Click += (s, e) => BrowseFolder(); pathPanel.Controls.Add(browse);
        AddRow(content, 1, "Ruta de datos SQL Server", pathPanel, "Carpeta que contiene los archivos de datos de ICG");
        AddRow(content, 2, "Web.App", webApp, "Dirección central de WTF Sistema");
        AddRow(content, 3, "Proyecto Firebase", project, "ID del proyecto, no una contraseña");
        AddRow(content, 4, "Gateway técnico", gateway, "Endpoint usado por el Host para escribir en Firestore");
        AddRow(content, 5, "Terminal ID", terminal, "Identidad técnica ya autorizada");
        technicalCredential.UseSystemPasswordChar = true;
        AddRow(content, 6, "Nueva credencial técnica", technicalCredential, "Opcional. Se protege con DPAPI; vacío conserva la actual");
        apiKey.UseSystemPasswordChar = true;
        AddRow(content, 7, "Clave local del panel", apiKey, "Opcional. Se usa solo en 127.0.0.1");
        mode.DropDownStyle = ComboBoxStyle.DropDownList; mode.Items.AddRange(new object[] { "automatico", "manual" });
        AddRow(content, 8, "Modo de sincronización", mode, "Manual muestra el envío bajo demanda y detiene el temporizador");
        var note = new Label { Text = "La configuración se guarda con copia de respaldo y el Host se reinicia para aplicar los cambios. No se modifica Firebase Auth ni se sube ninguna contraseña a la nube.", AutoSize = false, Height = 45, Dock = DockStyle.Fill, ForeColor = Color.FromArgb(75, 85, 99) };
        content.Controls.Add(note, 0, 9); content.SetColumnSpan(note, 2);
        status.Text = "Listo"; status.AutoSize = false; status.Height = 30; status.Dock = DockStyle.Fill; status.ForeColor = Color.FromArgb(21, 128, 61);
        content.Controls.Add(status, 0, 10); content.SetColumnSpan(status, 2);
        Controls.Add(content);

        var buttons = new Panel { Dock = DockStyle.Bottom, Height = 58, Padding = new Padding(22, 8, 22, 12), BackColor = Color.White };
        var cancel = new Button { Text = "Cancelar", Width = 105, Height = 32, Dock = DockStyle.Right };
        cancel.Click += (s, e) => Close();
        var save = new Button { Text = "Guardar y reiniciar Host", Width = 190, Height = 32, Dock = DockStyle.Right, BackColor = Color.FromArgb(21, 128, 61), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
        save.Click += (s, e) => SaveValues(save);
        buttons.Controls.Add(cancel); buttons.Controls.Add(new Label { Width = 10, Dock = DockStyle.Right }); buttons.Controls.Add(save);
        Controls.Add(buttons);
    }

    private static void AddRow(TableLayoutPanel table, int row, string label, Control input, string hint)
    {
        table.RowStyles.Add(new RowStyle(SizeType.Absolute, 43));
        var labelPanel = new Panel { Dock = DockStyle.Fill };
        labelPanel.Controls.Add(new Label { Text = label, AutoSize = true, Top = 4, Left = 0, Font = new Font("Segoe UI", 9F, FontStyle.Bold) });
        table.Controls.Add(labelPanel, 0, row);
        input.Dock = DockStyle.Top; input.Height = 25; table.Controls.Add(input, 1, row);
        input.Tag = hint;
    }

    private void LoadValues()
    {
        var values = ReadEnv();
        database.Text = Get(values, "ICG_LIVE_DATABASE_NAME", "");
        sqlDataPath.Text = Get(values, "ICG_SQL_DATA_PATH", @"C:\ICG\Microsoft SQL Server\MSSQL12.MSSQLSERVER\MSSQL\DATA");
        webApp.Text = Get(values, "WTF_WEB_APP_URL", "https://gestor-de-inventario-wtf-29056.web.app");
        project.Text = Get(values, "WTF_FIREBASE_PROJECT_ID", "gestor-de-inventario-wtf-29056");
        gateway.Text = Get(values, "WTF_HOST_SYNC_ENDPOINT", "https://us-central1-gestor-de-inventario-wtf-29056.cloudfunctions.net/wtfHostFirestoreGateway");
        terminal.Text = Get(values, "WTF_TERMINAL_ID", "");
        apiKey.Text = Get(values, "WTF_API_KEY", "");
        mode.SelectedItem = Get(values, "WTF_MODE", "automatico").Equals("manual", StringComparison.OrdinalIgnoreCase) ? "manual" : "automatico";
    }

    private void BrowseFolder()
    {
        using (var dialog = new FolderBrowserDialog { Description = "Selecciona la carpeta de datos de SQL Server", SelectedPath = sqlDataPath.Text })
            if (dialog.ShowDialog(this) == DialogResult.OK) sqlDataPath.Text = dialog.SelectedPath;
    }

    private void SaveValues(Button save)
    {
        try
        {
            if (String.IsNullOrWhiteSpace(database.Text) || String.IsNullOrWhiteSpace(sqlDataPath.Text) || String.IsNullOrWhiteSpace(webApp.Text) || String.IsNullOrWhiteSpace(project.Text) || String.IsNullOrWhiteSpace(gateway.Text))
                throw new Exception("Completa la base de datos, la ruta SQL, Web.App, Firebase y el gateway.");
            save.Enabled = false; status.ForeColor = Color.FromArgb(180, 83, 9); status.Text = "Guardando copia y validando configuración...";
            var values = ReadEnv();
            Set(values, "ICG_LIVE_DATABASE_NAME", database.Text.Trim());
            Set(values, "ICG_SQL_DATA_PATH", sqlDataPath.Text.Trim());
            Set(values, "ICG_SQL_CONNECTION_STRING", "Server=" + Get(values, "ICG_SQL_SERVER", "localhost") + ";Database=" + database.Text.Trim() + ";Trusted_Connection=True;TrustServerCertificate=True");
            Set(values, "WTF_WEB_APP_URL", webApp.Text.Trim()); Set(values, "WTF_FIREBASE_PROJECT_ID", project.Text.Trim()); Set(values, "WTF_HOST_SYNC_ENDPOINT", gateway.Text.Trim());
            Set(values, "WTF_TERMINAL_ID", terminal.Text.Trim()); Set(values, "WTF_MODE", mode.Text); Set(values, "WTF_API_KEY", apiKey.Text);
            if (!String.IsNullOrWhiteSpace(technicalCredential.Text)) Set(values, "WTF_TERMINAL_SECRET_PROTECTED", ProtectSecret(technicalCredential.Text.Trim()));
            var backup = envPath + ".backup-" + DateTime.Now.ToString("yyyyMMdd-HHmmss");
            if (File.Exists(envPath)) File.Copy(envPath, backup, true);
            var temp = envPath + ".tmp-" + Guid.NewGuid().ToString("N");
            WriteEnv(temp, values); if (File.Exists(envPath)) File.Replace(temp, envPath, null); else File.Move(temp, envPath);
            RestartHost();
            status.ForeColor = Color.FromArgb(21, 128, 61); status.Text = "Guardado. El Host fue reiniciado con la nueva configuración.";
        }
        catch (Exception ex) { status.ForeColor = Color.FromArgb(185, 28, 28); status.Text = ex.Message; save.Enabled = true; }
    }

    private Dictionary<string, string> ReadEnv()
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!File.Exists(envPath)) return result;
        foreach (var line in File.ReadAllLines(envPath))
        {
            var trimmed = line.Trim(); if (trimmed.StartsWith("#") || !trimmed.Contains("=")) continue;
            var index = trimmed.IndexOf('='); result[trimmed.Substring(0, index).Trim()] = trimmed.Substring(index + 1);
        }
        return result;
    }

    private static string Get(Dictionary<string, string> values, string name, string fallback) { string value; return values.TryGetValue(name, out value) ? value : fallback; }
    private static void Set(Dictionary<string, string> values, string name, string value) { values[name] = value ?? ""; }

    private void WriteEnv(string path, Dictionary<string, string> values)
    {
        var lines = new List<string>(); var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (File.Exists(envPath))
            foreach (var line in File.ReadAllLines(envPath))
            {
                var trimmed = line.Trim(); var index = trimmed.IndexOf('=');
                if (index > 0 && !trimmed.StartsWith("#")) { var name = trimmed.Substring(0, index).Trim(); string value; if (values.TryGetValue(name, out value)) { lines.Add(name + "=" + value); seen.Add(name); continue; } }
                lines.Add(line);
            }
        foreach (var pair in values) if (!seen.Contains(pair.Key)) lines.Add(pair.Key + "=" + pair.Value);
        File.WriteAllLines(path, lines, new UTF8Encoding(false));
    }

    private static string ProtectSecret(string secret)
    {
        var psi = new ProcessStartInfo { FileName = "powershell.exe", Arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command \"$s=[Console]::In.ReadToEnd(); ConvertFrom-SecureString (ConvertTo-SecureString $s -AsPlainText -Force)\"", UseShellExecute = false, RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true };
        using (var process = Process.Start(psi)) { process.StandardInput.Write(secret); process.StandardInput.Close(); var output = process.StandardOutput.ReadToEnd().Trim(); process.WaitForExit(); if (process.ExitCode != 0 || String.IsNullOrWhiteSpace(output)) throw new Exception("No se pudo proteger la credencial técnica."); return output; }
    }

    private void RestartHost()
    {
        var normalized = Path.GetFullPath(root).TrimEnd('\\') + "\\";
        foreach (var name in new[] { "wtf-icg-host-tray", "wtf-icg-host" })
            foreach (var process in Process.GetProcessesByName(name))
                try { if (process.MainModule != null && process.MainModule.FileName.StartsWith(normalized, StringComparison.OrdinalIgnoreCase)) { process.Kill(); process.WaitForExit(4000); } } catch { }
        var tray = Path.Combine(root, "app", "wtf-icg-host-tray.exe");
        var host = Path.Combine(root, "app", "wtf-icg-host.exe");
        if (File.Exists(tray)) Process.Start(new ProcessStartInfo { FileName = tray, WorkingDirectory = Path.GetDirectoryName(tray), UseShellExecute = false, WindowStyle = ProcessWindowStyle.Hidden });
        else if (File.Exists(host)) Process.Start(new ProcessStartInfo { FileName = host, WorkingDirectory = root, UseShellExecute = false, WindowStyle = ProcessWindowStyle.Hidden });
    }
}
