"use client"

import type React from "react"

import { useState } from "react"
import { auth } from "@/lib/firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth"
import { saveUserData } from "@/lib/firebase-storage"

interface AuthModalProps {
  onClose: () => void
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError("")
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      await saveUserData(result.user.uid, result.user.email!, result.user.displayName)
      console.log("[v0] Google sign-in successful, user data saved")
      onClose()
    } catch (err: any) {
      console.error("[v0] Google sign-in error:", err)
      setError(err.message || "Failed to sign in with Google")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError("")
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(userCredential.user)
      await saveUserData(userCredential.user.uid, userCredential.user.email!)
      console.log("[v0] Email sign-up successful, user data saved")
      setMessage("Verification email sent! Please check your inbox.")
      setTimeout(() => onClose(), 2000)
    } catch (err: any) {
      console.error("[v0] Email sign-up error:", err)
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use")
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters")
      } else {
        setError(err.message || "Failed to sign up")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError("")
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      if (!userCredential.user.emailVerified) {
        setError("Please verify your email before signing in")
        await auth.signOut()
        return
      }

      await saveUserData(userCredential.user.uid, userCredential.user.email!)
      console.log("[v0] Email sign-in successful, user data updated")
      onClose()
    } catch (err: any) {
      console.error("[v0] Email sign-in error:", err)
      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password")
      } else {
        setError(err.message || "Failed to sign in")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError("")
      await sendPasswordResetEmail(auth, email)
      setMessage("Password reset email sent! Check your inbox.")
      setTimeout(() => setMode("login"), 2000)
    } catch (err: any) {
      setError(err.message || "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#E8E3D9] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-extrabold">
            {mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Reset Password"}
          </h2>
          <button onClick={onClose} className="text-2xl font-bold hover:opacity-70 transition-opacity">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border-2 border-red-600 text-red-800 text-sm font-medium">{error}</div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-100 border-2 border-green-600 text-green-800 text-sm font-medium">
            {message}
          </div>
        )}

        {mode !== "forgot" && (
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mb-4 px-4 py-3 bg-white border-3 border-black font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
          >
            Continue with Google
          </button>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-black"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#E8E3D9] font-bold">OR</span>
          </div>
        </div>

        <form
          onSubmit={mode === "forgot" ? handleForgotPassword : mode === "login" ? handleEmailSignIn : handleEmailSignUp}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mb-4 px-4 py-3 border-3 border-black font-medium focus:outline-none focus:ring-4 focus:ring-[#FF6B35]"
          />

          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full mb-4 px-4 py-3 border-3 border-black font-medium focus:outline-none focus:ring-4 focus:ring-[#FF6B35]"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-black text-[#E8E3D9] border-3 border-black font-bold hover:bg-[#FF6B35] hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(255,107,53,1)] transition-all disabled:opacity-50"
          >
            {loading ? "Loading..." : mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Send Reset Email"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === "login" && (
            <>
              <button onClick={() => setMode("forgot")} className="font-bold hover:underline mr-4">
                Forgot password?
              </button>
              <button onClick={() => setMode("signup")} className="font-bold hover:underline">
                Create account
              </button>
            </>
          )}
          {mode === "signup" && (
            <button onClick={() => setMode("login")} className="font-bold hover:underline">
              Already have an account? Log in
            </button>
          )}
          {mode === "forgot" && (
            <button onClick={() => setMode("login")} className="font-bold hover:underline">
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
