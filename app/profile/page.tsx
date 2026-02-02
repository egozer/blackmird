"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Trash2, User, Tag } from "lucide-react"
import { auth } from "@/lib/firebase"
import {
  updateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth"
import { getDatabase, ref, remove } from "firebase/database"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const [user, setUser] = useState(auth.currentUser)
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [promoCode, setPromoCode] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [password, setPassword] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const router = useRouter()

  const isGoogleUser = user?.providerData.some((provider) => provider.providerId === "google.com")

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setDisplayName(currentUser.displayName || "")
      } else {
        router.push("/")
      }
    })
    return () => unsubscribe()
  }, [router])

  const handleUpdateName = async () => {
    if (!user || !displayName.trim()) return

    try {
      await updateProfile(user, { displayName: displayName.trim() })
      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error updating name:", error)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    try {
      if (isGoogleUser) {
        // For Google users, re-authenticate with popup
        const provider = new GoogleAuthProvider()
        await reauthenticateWithPopup(user, provider)
      } else if (user.email && password) {
        // For email/password users, use credential
        const credential = EmailAuthProvider.credential(user.email, password)
        await reauthenticateWithCredential(user, credential)
      }

      // Delete user data from database
      const db = getDatabase()
      const userRef = ref(db, `users/${user.uid}`)
      await remove(userRef)

      // Delete user account
      await deleteUser(user)

      router.push("/")
    } catch (error: any) {
      console.error("Error deleting account:", error)
      setDeleteError(error.message || "Failed to delete account. Please try again.")
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
        <div className="text-[#6b6b6b]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      {/* Header */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-[#d4d0c8]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 hover:bg-[#e8e4dc] transition-colors border border-[#d4d0c8]"
          >
            <ArrowLeft className="w-5 h-5 text-[#0a0a0a]" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0a0a0a]">Profile</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b]">Account Settings</p>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-8 py-16">
        {saveSuccess && (
          <div className="mb-6 p-4 bg-[#d1fae5] border-2 border-[#0a0a0a] text-[#065f46] font-medium animate-in fade-in slide-in-from-top-2 duration-300">
            Profile updated successfully!
          </div>
        )}

        {/* Display Name Section */}
        <section className="mb-12 bg-white border-2 border-[#0a0a0a] p-8 shadow-[4px_4px_0px_0px_#0a0a0a]">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-[#0a0a0a]" />
            <h2 className="text-2xl font-bold text-[#0a0a0a]">Display Name</h2>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-[#f5f3ef] border-2 border-[#0a0a0a] text-[#0a0a0a] placeholder-[#6b6b6b] focus:outline-none focus:border-[#2a2a2a] font-medium"
                placeholder="Enter your name"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setDisplayName(user.displayName || "")
                  }}
                  className="flex-1 px-4 py-3 bg-[#e8e4dc] hover:bg-[#d4d0c8] text-[#0a0a0a] font-medium transition-colors border border-[#d4d0c8]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateName}
                  disabled={!displayName.trim()}
                  className="flex-1 px-4 py-3 bg-[#0a0a0a] hover:bg-[#2a2a2a] disabled:opacity-50 text-[#f5f3ef] font-bold transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-lg text-[#0a0a0a] font-medium">{displayName || "No name set"}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-[#0a0a0a] hover:bg-[#2a2a2a] text-[#f5f3ef] text-sm font-medium transition-colors"
              >
                Edit
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-[#d4d0c8]">
            <p className="text-sm text-[#6b6b6b]">
              <span className="font-medium">Email:</span> {user.email}
            </p>
          </div>
        </section>

        {/* Promo Code Section */}
        <section className="mb-12 bg-white border-2 border-[#0a0a0a] p-8 shadow-[4px_4px_0px_0px_#0a0a0a]">
          <div className="flex items-center gap-3 mb-6">
            <Tag className="w-6 h-6 text-[#0a0a0a]" />
            <h2 className="text-2xl font-bold text-[#0a0a0a]">Promo Code</h2>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="w-full px-4 py-3 bg-[#f5f3ef] border-2 border-[#0a0a0a] text-[#0a0a0a] placeholder-[#6b6b6b] focus:outline-none focus:border-[#2a2a2a] font-medium uppercase"
              placeholder="Enter promo code"
            />
            <button disabled className="w-full px-4 py-3 bg-[#d4d0c8] text-[#6b6b6b] font-bold cursor-not-allowed">
              Apply Code (Coming Soon)
            </button>
            <p className="text-xs text-[#a0a0a0]">Promo code functionality will be available soon.</p>
          </div>
        </section>

        {/* Delete Account Section */}
        <section className="bg-[#fee2e2] border-2 border-[#dc2626] p-8 shadow-[4px_4px_0px_0px_#dc2626]">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-6 h-6 text-[#dc2626]" />
            <h2 className="text-2xl font-bold text-[#dc2626]">Danger Zone</h2>
          </div>

          <p className="text-sm text-[#7f1d1d] mb-6">
            Once you delete your account, there is no going back. All your projects and data will be permanently
            deleted.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-4 p-6 bg-white border-2 border-[#dc2626]">
              {isGoogleUser ? (
                <>
                  <p className="text-sm font-medium text-[#0a0a0a] mb-4">
                    Are you sure you want to delete your account? This action cannot be undone. You will be asked to
                    sign in with Google to confirm.
                  </p>
                  {deleteError && <p className="text-sm text-[#dc2626] font-medium">{deleteError}</p>}
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteError("")
                      }}
                      className="flex-1 px-4 py-3 bg-[#e8e4dc] hover:bg-[#d4d0c8] text-[#0a0a0a] font-medium transition-colors border border-[#d4d0c8]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="flex-1 px-4 py-3 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold transition-colors"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-[#0a0a0a] mb-4">
                    Please enter your password to confirm account deletion:
                  </p>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-3 bg-[#f5f3ef] border-2 border-[#0a0a0a] text-[#0a0a0a] placeholder-[#6b6b6b] focus:outline-none focus:border-[#dc2626] font-medium"
                  />
                  {deleteError && <p className="text-sm text-[#dc2626] font-medium">{deleteError}</p>}
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setPassword("")
                        setDeleteError("")
                      }}
                      className="flex-1 px-4 py-3 bg-[#e8e4dc] hover:bg-[#d4d0c8] text-[#0a0a0a] font-medium transition-colors border border-[#d4d0c8]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={!password}
                      className="flex-1 px-4 py-3 bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 text-white font-bold transition-colors"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
