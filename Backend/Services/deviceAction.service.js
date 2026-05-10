import { exec } from "child_process";

const isWindows = process.platform === "win32";

const runPowerShell = (command) =>
  new Promise((resolve, reject) => {
    if (!isWindows) {
      reject(new Error("Device automation is currently configured only for Windows."));
      return;
    }

    const safeCommand = command.replace(/"/g, '\\"');
    exec(
      `powershell.exe -NoProfile -NonInteractive -Command "${safeCommand}"`,
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr?.trim() || error.message));
          return;
        }

        resolve((stdout || "").trim());
      }
    );
  });

const escapePowerShellValue = (value = "") => String(value).replace(/'/g, "''");

export const openUrlOnLaptop = async (url) => {
  const safeUrl = escapePowerShellValue(url);
  await runPowerShell(`Start-Process '${safeUrl}'`);
};

export const closeChromeOnLaptop = async () => {
  await runPowerShell(
    "Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force"
  );
};

export const openAppOnLaptop = async (appName) => {
  const safeAppName = escapePowerShellValue(appName);
  await runPowerShell(`Start-Process '${safeAppName}'`);
};

export const openVSCodeOnLaptop = async () => {
  const script = [
    "$paths = @(",
    "  \"$env:LocalAppData\\Programs\\Microsoft VS Code\\Code.exe\",",
    "  \"$env:ProgramFiles\\Microsoft VS Code\\Code.exe\",",
    "  \"$env:ProgramFiles(x86)\\Microsoft VS Code\\Code.exe\"",
    ");",
    "$code = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1;",
    "if ($code) {",
    "  Start-Process -FilePath $code;",
    "} else {",
    "  Start-Process 'code';",
    "}",
  ].join(" ");

  await runPowerShell(script);
};

export const openChromeOnLaptop = async (url = "") => {
  const safeUrl = escapePowerShellValue(url);
  const argsPart = safeUrl ? ` -ArgumentList '${safeUrl}'` : "";
  const script = [
    "$chromePaths = @(",
    "  \"$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe\",",
    "  \"$env:ProgramFiles(x86)\\Google\\Chrome\\Application\\chrome.exe\",",
    "  \"$env:LocalAppData\\Google\\Chrome\\Application\\chrome.exe\"",
    ");",
    "$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1;",
    "if ($chrome) {",
    `  Start-Process -FilePath $chrome${argsPart};`,
    "} else {",
    `  Start-Process '${safeUrl || "https://www.google.com"}';`,
    "}",
  ].join(" ");

  await runPowerShell(script);
};

export const sleepLaptop = async () => {
  await runPowerShell("rundll32.exe powrprof.dll,SetSuspendState 0,1,0");
};

export const shutdownLaptop = async () => {
  await runPowerShell("shutdown /s /t 0");
};

export const restartLaptop = async () => {
  await runPowerShell("shutdown /r /t 0");
};
