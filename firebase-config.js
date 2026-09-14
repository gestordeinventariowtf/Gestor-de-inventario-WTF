window.WTF_FIREBASE_CONFIG = {
  enabled: true,
  firebaseConfig: {
    apiKey: "AIzaSyDGrhP6UEMWkJO94qewT_WF4t5x9Zpi_Es",
    authDomain: "gestor-de-inventario-wtf-2d070.firebaseapp.com",
    projectId: "gestor-de-inventario-wtf-2d070",
    storageBucket: "gestor-de-inventario-wtf-2d070.firebasestorage.app",
    messagingSenderId: "244265346407",
    appId: "1:244265346407:web:1849e137419822ab3b3bc2"
  },
  collection: "wtfSistema",
  documentId: "estadoGeneral",
  ai: {
    enabled: true,
    endpoint: "https://us-central1-gestor-de-inventario-wtf-2d070.cloudfunctions.net/wtfAiAssistant",
    provider: "ollama",
    fallbackProvider: "openai",
    model: "gpt-5.6",
    ollamaModel: "gemma4:31b-cloud"
  },
  push: {
    enabled: true,
    vapidPublicKey: "BBykS-efnBriT-5tkedsaNxcq5UOy33lL8Mag_0FilyAAx3iOBFLFmLs5ApJkhIoMEVxzEl_0UHhU8q7zTKdigg",
    processEndpoint: "https://us-central1-gestor-de-inventario-wtf-2d070.cloudfunctions.net/wtfProcessPendingPushMessages"
  },
  controlHorario: {
    terminalEndpoint: "https://us-central1-gestor-de-inventario-wtf-2d070.cloudfunctions.net/wtfAuthorizedTerminal",
    defaultBranchId: "wtf-av-venezuela"
  }
};
