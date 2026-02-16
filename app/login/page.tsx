'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        router.push('/dashboard')
      }
    }
    checkUser()

    // Listen for auth state changes across tabs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('User signed out')
        // Redirect to login on sign out
        router.push('/login')
      }
    })

    return () => subscription?.unsubscribe()
  }, [router])

  const login = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      alert('Failed to login')
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      {/* Theme Toggle */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className={`absolute top-6 right-6 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-white hover:bg-gray-100 text-gray-800 shadow-md'}`}
      >
        {isDarkMode ? '☀️ Light' : '🌙 Dark'}
      </button>

      {/* Login Card */}
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl p-12 w-full max-w-md transition-colors duration-300`}>
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            📚 Smart Bookmarks
          </h1>
          <p className={`text-lg transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Save and organize your favorite URLs
          </p>
        </div>

        <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6 mb-8 transition-colors duration-300`}>
          <p className={`text-center transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Sign in with your Google account to get started
          </p>
        </div>

        <button
          onClick={login}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-bold text-white transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg'
          }`}
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              Signing in...
            </>
          ) : (
            <>
              <span>🔐</span>
              Sign in with Google
            </>
          )}
        </button>

        <p className={`text-center text-xs mt-6 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          Your bookmarks are private and secure. We only access your email.
        </p>
      </div>
    </div>
  )
}