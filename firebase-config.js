window.WTF_FIREBASE_CONFIG = {
  enabled: true,
  firebaseConfig: {
    apiKey: "AIzaSyDYnwKvcVLQ-ikk0vkQCBSC8gFtMiwuUc8",
    authDomain: "gestor-de-inventario-wtf-29056.firebaseapp.com",
    projectId: "gestor-de-inventario-wtf-29056",
    storageBucket: "gestor-de-inventario-wtf-29056.firebasestorage.app",
    messagingSenderId: "863301490729",
    appId: "1:863301490729:web:f5018bd6e6489f69686438"
  },
  collection: "wtfSistema",
  documentId: "estadoGeneral",
  ai: {
    enabled: true,
    endpoint: "https://us-central1-gestor-de-inventario-wtf-29056.cloudfunctions.net/wtfAiAssistant",
    provider: "ollama",
    fallbackProvider: "openai",
    model: "gpt-5.6",
    ollamaModel: "gemma4:31b-cloud"
  },
  push: {
    enabled: true,
    vapidPublicKey: "BBykS-efnBriT-5tkedsaNxcq5UOy33lL8Mag_0FilyAAx3iOBFLFmLs5ApJkhIoMEVxzEl_0UHhU8q7zTKdigg"
  }
};
