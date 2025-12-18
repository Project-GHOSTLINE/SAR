'use client'

import { useState, useEffect } from 'react'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Sparkles, ArrowRight, Zap } from 'lucide-react'

export default function AdminLoginPage() {
  const [mode, setMode] = useState<'magic' | 'password'>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Check for URL errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errorType = params.get('error')
    if (errorType === 'expired') {
      setError('Le lien a expire. Demande un nouveau.')
    } else if (errorType === 'invalid') {
      setError('Lien invalide.')
    }
  }, [])

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Check ton email! Un lien de connexion arrive.')
        setEmail('')
      } else {
        setError(data.error || 'Erreur')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (res.ok) {
        window.location.href = '/admin/dashboard'
      } else {
        setError(data.error || 'Mot de passe incorrect')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0d10] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-[#00874e]/20 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[20%] w-[300px] h-[300px] bg-[#3b82f6]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,135,78,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,135,78,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glass Card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00874e]/30 to-[#00874e]/10 rounded-3xl blur-xl opacity-50"></div>
          <div className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 overflow-hidden">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none"></div>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            {/* Header */}
            <div className="text-center mb-8 relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00874e] to-[#006341] rounded-2xl shadow-lg shadow-[#00874e]/30"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                <span className="relative text-white text-3xl font-black">$</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Admin SAR</h1>
              <p className="text-white/40 text-sm">Solution Argent Rapide</p>
            </div>

            {/* Toggle Mode */}
            <div className="flex gap-2 p-1 bg-white/[0.03] rounded-2xl mb-6 border border-white/[0.06]">
              <button
                onClick={() => { setMode('magic'); setError(''); setSuccess(''); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  mode === 'magic'
                    ? 'bg-gradient-to-r from-[#00874e] to-[#006341] text-white shadow-lg shadow-[#00874e]/20'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                <Zap size={16} />
                Magic Link
              </button>
              <button
                onClick={() => { setMode('password'); setError(''); setSuccess(''); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  mode === 'password'
                    ? 'bg-gradient-to-r from-[#00874e] to-[#006341] text-white shadow-lg shadow-[#00874e]/20'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                <Lock size={16} />
                Mot de passe
              </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded-xl text-[#f6465d] mb-6">
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-[#00874e]/10 border border-[#00874e]/20 rounded-xl text-[#00874e] mb-6">
                <CheckCircle size={18} />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Magic Link Form */}
            {mode === 'magic' && (
              <form onSubmit={handleMagicLink} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-3">
                    Ton email admin
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                      <Mail size={20} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00874e]/50 focus:ring-2 focus:ring-[#00874e]/20 transition-all"
                      placeholder="ton@email.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-[#00874e] to-[#006341] text-white font-semibold rounded-xl shadow-lg shadow-[#00874e]/30 hover:shadow-[#00874e]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Envoyer le Magic Link
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-center text-white/30 text-xs">
                  Un lien de connexion sera envoye a ton email
                </p>
              </form>
            )}

            {/* Password Form */}
            {mode === 'password' && (
              <form onSubmit={handlePassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-3">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                      <Lock size={20} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00874e]/50 focus:ring-2 focus:ring-[#00874e]/20 transition-all"
                      placeholder="••••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-[#00874e] to-[#006341] text-white font-semibold rounded-xl shadow-lg shadow-[#00874e]/30 hover:shadow-[#00874e]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Connexion...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          Acces reserve aux administrateurs autorises
        </p>
      </div>
    </div>
  )
}
