# WTF Gestión Android

Aplicación Android basada en Capacitor/WebView para abrir:

https://gestor-de-inventario-wtf-prod-2026.web.app

## Requisitos locales

- Java 17
- Android SDK
- Capacitor

El SDK se instala en:

`%LOCALAPPDATA%\Android\Sdk`

## Comandos

```powershell
npm install
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

APK debug esperada:

`android\app\build\outputs\apk\debug\app-debug.apk`
