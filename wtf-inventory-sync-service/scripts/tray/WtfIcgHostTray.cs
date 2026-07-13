using Microsoft.Win32;
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace WtfIcgHostTray
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            bool createdNew;
            using (var mutex = new Mutex(true, "Global\\WTF_ICG_HOST_TRAY_SINGLE_INSTANCE", out createdNew))
            {
                if (!createdNew) return;
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new TrayContext());
            }
        }
    }

    internal sealed class TrayContext : ApplicationContext
    {
        private const string AppName = "WTF ICG Host";
        private const string StartupRunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        private readonly NotifyIcon tray;
        private readonly string installDir;
        private readonly string serviceExe;
        private readonly string panelUrl;
        private Process serviceProcess;
        private ToolStripMenuItem statusItem;
        private ToolStripMenuItem startupItem;

        public TrayContext()
        {
            installDir = ResolveInstallDir();
            serviceExe = ResolveServiceExe(installDir);
            panelUrl = "http://127.0.0.1:8787";

            tray = new NotifyIcon
            {
                Icon = SystemIcons.Application,
                Text = AppName,
                Visible = true,
                ContextMenuStrip = BuildMenu()
            };
            tray.DoubleClick += (sender, args) => OpenPanel();

            StartHost();
            UpdateStatus();
        }

        private ContextMenuStrip BuildMenu()
        {
            var menu = new ContextMenuStrip();
            statusItem = new ToolStripMenuItem("Estado: iniciando...") { Enabled = false };
            startupItem = new ToolStripMenuItem("Iniciar con Windows") { Checked = IsStartupEnabled() };
            startupItem.Click += (sender, args) => ToggleStartup();

            menu.Items.Add(statusItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Abrir panel local", null, (sender, args) => OpenPanel());
            menu.Items.Add("Sincronizar CMS ahora", null, (sender, args) => PostLocal("/api/sync-latest-cms"));
            menu.Items.Add("Abrir carpeta de datos", null, (sender, args) => OpenDataFolder());
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Iniciar servicio", null, (sender, args) => { StartHost(); UpdateStatus(); });
            menu.Items.Add("Reiniciar servicio", null, (sender, args) => { StopHost(); StartHost(); UpdateStatus(); });
            menu.Items.Add("Detener servicio", null, (sender, args) => { StopHost(); UpdateStatus(); });
            menu.Items.Add(startupItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Salir", null, (sender, args) => ExitApp());
            return menu;
        }

        private void StartHost()
        {
            if (IsHostRunning()) return;
            if (!File.Exists(serviceExe))
            {
                tray.ShowBalloonTip(5000, AppName, "No se encontro wtf-icg-host.exe en la instalacion.", ToolTipIcon.Error);
                return;
            }

            var startInfo = new ProcessStartInfo
            {
                FileName = serviceExe,
                WorkingDirectory = installDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            serviceProcess = Process.Start(startInfo);
            tray.ShowBalloonTip(2500, AppName, "Servicio local activo en segundo plano.", ToolTipIcon.Info);
        }

        private string ResolveInstallDir()
        {
            var baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
            var parentDir = Directory.GetParent(baseDir);
            if (String.Equals(Path.GetFileName(baseDir), "app", StringComparison.OrdinalIgnoreCase) && parentDir != null)
            {
                return parentDir.FullName;
            }
            return baseDir;
        }

        private string ResolveServiceExe(string rootDir)
        {
            var baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
            var candidates = new[]
            {
                Path.Combine(baseDir, "wtf-icg-host.exe"),
                Path.Combine(rootDir, "app", "wtf-icg-host.exe"),
                Path.Combine(rootDir, "wtf-icg-host.exe")
            };
            foreach (var candidate in candidates)
            {
                if (File.Exists(candidate)) return candidate;
            }
            return candidates[0];
        }

        private bool IsHostRunning()
        {
            if (serviceProcess != null && !serviceProcess.HasExited) return true;
            foreach (var process in Process.GetProcessesByName("wtf-icg-host"))
            {
                try
                {
                    if (String.Equals(Path.GetFullPath(process.MainModule.FileName), Path.GetFullPath(serviceExe), StringComparison.OrdinalIgnoreCase))
                    {
                        serviceProcess = process;
                        return true;
                    }
                }
                catch { }
            }
            return false;
        }

        private void StopHost()
        {
            if (!IsHostRunning()) return;
            try
            {
                serviceProcess.Kill();
                serviceProcess.WaitForExit(5000);
            }
            catch { }
            serviceProcess = null;
        }

        private void UpdateStatus()
        {
            if (statusItem == null) return;
            statusItem.Text = IsHostRunning() ? "Estado: activo y oculto" : "Estado: detenido";
            startupItem.Checked = IsStartupEnabled();
        }

        private void OpenPanel()
        {
            Process.Start(new ProcessStartInfo { FileName = panelUrl, UseShellExecute = true });
        }

        private void OpenDataFolder()
        {
            var dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "WTF ICG Host", "data");
            Directory.CreateDirectory(dataDir);
            Process.Start(new ProcessStartInfo { FileName = dataDir, UseShellExecute = true });
        }

        private void PostLocal(string path)
        {
            try
            {
                var request = (HttpWebRequest)WebRequest.Create(panelUrl + path);
                request.Method = "POST";
                request.Timeout = 12000;
                using (var response = (HttpWebResponse)request.GetResponse()) { }
                tray.ShowBalloonTip(3500, AppName, "Solicitud enviada al host local.", ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                tray.ShowBalloonTip(5000, AppName, "No se pudo conectar al host local: " + ex.Message, ToolTipIcon.Warning);
            }
        }

        private bool IsStartupEnabled()
        {
            using (var key = Registry.LocalMachine.OpenSubKey(StartupRunKey, false))
            {
                return key != null && key.GetValue(AppName) != null;
            }
        }

        private void ToggleStartup()
        {
            try
            {
                using (var key = Registry.LocalMachine.OpenSubKey(StartupRunKey, true))
                {
                    if (key == null) return;
                    if (IsStartupEnabled()) key.DeleteValue(AppName, false);
                    else key.SetValue(AppName, "\"" + Application.ExecutablePath + "\"", RegistryValueKind.String);
                }
                startupItem.Checked = IsStartupEnabled();
            }
            catch (Exception ex)
            {
                tray.ShowBalloonTip(5000, AppName, "Ejecuta como administrador para cambiar el inicio con Windows: " + ex.Message, ToolTipIcon.Warning);
            }
        }

        private void ExitApp()
        {
            StopHost();
            tray.Visible = false;
            tray.Dispose();
            Application.Exit();
        }
    }
}
