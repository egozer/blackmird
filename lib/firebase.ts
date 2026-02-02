import { initializeApp, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyCSvfqaIOiMKfTkgw2_FcCkd1ublz5NA4I",
  authDomain: "koluna-ai.firebaseapp.com",
  projectId: "koluna-ai",
  storageBucket: "koluna-ai.firebasestorage.app",
  messagingSenderId: "284342231316",
  appId: "1:284342231316:web:a5d23326927d957394e201",
  databaseURL: "https://koluna-ai-default-rtdb.asia-southeast1.firebasedatabase.app",
}

// Initialize app safely
let app: any
try {
  app = getApp()
} catch {
  app = initializeApp(firebaseConfig)
}

// Export lazy-initialized instances
export const auth = getAuth(app)
export const database = getDatabase(app)
