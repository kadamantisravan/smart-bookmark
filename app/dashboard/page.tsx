'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('date') // 'date', 'title', 'favorites'
  
  // Edit modal states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
        fetchBookmarks()
      }
    }
    getUser()

    // Listen for auth changes across tabs via storage events
    const handleStorageChange = async () => {
      console.log('Storage changed, checking auth')
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        console.log('User not authenticated, redirecting to login')
        setUser(null)
        router.push('/login')
      }
    }

    // Listen for auth changes via Supabase listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/login')
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        fetchBookmarks()
      }
    })

    // Also listen for storage events for cross-tab logout
    window.addEventListener('storage', handleStorageChange)

    // Periodic check for auth state (backup for cross-tab detection)
    const authCheckInterval = setInterval(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user && user) {
        console.log('Auth check detected logout in another tab')
        setUser(null)
        router.push('/login')
      }
    }, 2000)

    return () => {
      subscription?.unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(authCheckInterval)
    }
  }, [router, user])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`bookmarks-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT',
          schema: 'public', 
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime INSERT:', payload)
          fetchBookmarks()
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE',
          schema: 'public', 
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime UPDATE:', payload)
          fetchBookmarks()
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE',
          schema: 'public', 
          table: 'bookmarks'
        },
        (payload) => {
          console.log('Realtime DELETE event received:', payload)
          fetchBookmarks()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const fetchBookmarks = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch error:', error)
      return
    }

    console.log('Bookmarks fetched:', data?.length)
    if (data) setBookmarks(data)
  }

  const updateBookmark = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Update error:', error)
        alert('Failed to update bookmark')
        return
      }

      setEditingId(null)
      fetchBookmarks()
    } catch (err) {
      console.error('Error updating bookmark:', err)
      alert('Failed to update bookmark')
    }
  }

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    await updateBookmark(id, { is_favorite: !isFavorite })
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    alert('URL copied to clipboard!')
  }

  const addBookmark = async () => {
    if (!url) {
      alert('Please enter a URL')
      return
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('URL must start with http:// or https://')
      return
    }

    // Validate URL is valid
    try {
      new URL(url)
    } catch (err) {
      alert('Please enter a valid URL')
      return
    }

    try {
      // Check if bookmark URL already exists for this user
      const { data: existing } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('url', url)
        .limit(1)

      console.log('Existing bookmark check:', existing)

      if (existing && existing.length > 0) {
        alert('This bookmark already exists!')
        return
      }

      const { error } = await supabase.from('bookmarks').insert({
        url,
        title: title || url,
        category,
        user_id: user.id,
        is_favorite: false,
      })

      if (error) {
        console.error('Insert error:', error)
        if (error.message.includes('duplicate')) {
          alert('This bookmark already exists!')
        } else {
          alert('Failed to add bookmark: ' + error.message)
        }
        return
      }

      setUrl('')
      setTitle('')
      setCategory('general')
      fetchBookmarks()
    } catch (err) {
      console.error('Error adding bookmark:', err)
      alert('Failed to add bookmark')
    }
  }

  const deleteBookmark = async (id: string) => {
    try {
      console.log('Deleting bookmark:', id)
      
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Delete error:', error)
        alert('Failed to delete bookmark: ' + error.message)
        return
      }

      console.log('Bookmark deleted:', id)
      // Always refresh after successful delete
      fetchBookmarks()
    } catch (err) {
      console.error('Error deleting bookmark:', err)
      alert('Failed to delete bookmark')
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        alert('Failed to logout')
        return
      }
      console.log('User logged out')
    } catch (err) {
      console.error('Error during logout:', err)
      alert('Failed to logout')
    }
  }

  // Filter and sort bookmarks
  const filteredBookmarks = bookmarks
    .filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.url.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      } else if (sortBy === 'favorites') {
        return (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0)
      }
      // Default: sort by date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  // Get unique categories
  const categories = ['all', 'general', ...new Set(bookmarks.map(b => b.category))]

  if (!user) return <p>Loading...</p>

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-indigo-200'} shadow-md border-b transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>📚 Smart Bookmarks</h1>
            <p className={`text-sm mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Welcome, {user.user_metadata?.full_name || user.email}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Add Bookmark Section */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8 mb-8 transition-colors duration-300 border-t-4 border-indigo-500`}>
          <h2 className={`text-2xl font-bold mb-6 flex items-center transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <span className="text-3xl mr-2">➕</span> Add New Bookmark
          </h2>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                URL <span className="text-red-500">*</span> Required
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-400' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-indigo-500'
                } border focus:outline-none focus:ring-2 focus:border-transparent`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Title <span className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>(Optional)</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave empty to use URL as title"
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-400' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-indigo-500'
                } border focus:outline-none focus:ring-2 focus:border-transparent`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Category
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Work, Learning, Design"
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-400' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-indigo-500'
                } border focus:outline-none focus:ring-2 focus:border-transparent`}
              />
            </div>
            <button
              onClick={addBookmark}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 duration-200"
            >
              Save Bookmark
            </button>
          </div>
        </div>

        {/* Search, Filter, Sort Section */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6 mb-8 transition-colors duration-300 space-y-4`}>
          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              🔍 Search Bookmarks
            </label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or URL..."
              className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-400' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-indigo-500'
              } border focus:outline-none focus:ring-2 focus:border-transparent`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                🏷️ Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-400' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-indigo-500'
                } border focus:outline-none focus:ring-2 focus:border-transparent`}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                📊 Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-400' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-indigo-500'
                } border focus:outline-none focus:ring-2 focus:border-transparent`}
              >
                <option value="date">Latest First</option>
                <option value="title">Title (A-Z)</option>
                <option value="favorites">Favorites First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bookmarks List */}
        <div>
          <h2 className={`text-2xl font-bold mb-6 flex items-center transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <span className="text-3xl mr-2">🔖</span> Your Bookmarks ({filteredBookmarks.length})
          </h2>
          
          {filteredBookmarks.length === 0 ? (
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-12 text-center transition-colors duration-300`}>
              <p className={`text-lg transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {bookmarks.length === 0 ? 'No bookmarks yet. Add one to get started! 👆' : 'No bookmarks match your search. Try different keywords! 🔍'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBookmarks.map((b) => (
                <div
                  key={b.id}
                  className={`${isDarkMode ? 'bg-gray-800 hover:bg-gray-750 border-indigo-400' : 'bg-white hover:shadow-lg'} rounded-xl shadow-md p-6 transition-all duration-300 border-l-4 transform hover:-translate-y-1`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`text-lg font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {b.title}
                        </h3>
                        {b.is_favorite && <span className="text-2xl">⭐</span>}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`text-xs px-3 py-1 rounded-full ${isDarkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}`}>
                          {b.category || 'general'}
                        </span>
                      </div>
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'} hover:underline break-all text-sm transition-colors duration-300`}
                      >
                        {b.url}
                      </a>
                      <p className={`text-xs mt-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        📅 {new Date(b.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 whitespace-nowrap">
                      <button
                        onClick={() => copyToClipboard(b.url)}
                        className={`${
                          isDarkMode 
                            ? 'bg-blue-900 hover:bg-blue-700 text-blue-200' 
                            : 'bg-blue-100 hover:bg-blue-500 text-blue-600 hover:text-white'
                        } px-3 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm`}
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={() => toggleFavorite(b.id, b.is_favorite)}
                        className={`${
                          b.is_favorite
                            ? isDarkMode 
                              ? 'bg-yellow-900 hover:bg-yellow-700 text-yellow-200' 
                              : 'bg-yellow-100 hover:bg-yellow-500 text-yellow-600 hover:text-white'
                            : isDarkMode 
                              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                              : 'bg-gray-100 hover:bg-gray-500 text-gray-600 hover:text-white'
                        } px-3 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm`}
                      >
                        {b.is_favorite ? '⭐ Favorited' : '☆ Favorite'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(b.id)
                          setEditUrl(b.url)
                          setEditTitle(b.title)
                          setEditCategory(b.category || 'general')
                        }}
                        className={`${
                          isDarkMode 
                            ? 'bg-green-900 hover:bg-green-700 text-green-200' 
                            : 'bg-green-100 hover:bg-green-500 text-green-600 hover:text-white'
                        } px-3 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm`}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteBookmark(b.id)}
                        className={`${ isDarkMode 
                          ? 'bg-red-900 hover:bg-red-700 text-red-200' 
                          : 'bg-red-100 hover:bg-red-500 text-red-600 hover:text-white'
                        } px-3 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm`}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl p-8 max-w-md w-full transition-colors duration-300`}>
              <h2 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                ✏️ Edit Bookmark
              </h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    URL
                  </label>
                  <input
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-400' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-indigo-500'
                    } border focus:outline-none focus:ring-2 focus:border-transparent`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Title
                  </label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-400' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-indigo-500'
                    } border focus:outline-none focus:ring-2 focus:border-transparent`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Category
                  </label>
                  <input
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-400' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-indigo-500'
                    } border focus:outline-none focus:ring-2 focus:border-transparent`}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => updateBookmark(editingId, { url: editUrl, title: editTitle, category: editCategory })}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className={`flex-1 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} font-bold py-2 rounded-lg transition-all`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}