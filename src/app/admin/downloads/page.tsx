'use client'

import {
  Download,
  Chrome,
  CheckCircle,
  AlertCircle,
  FileArchive,
  ExternalLink,
  Copy,
  Info,
  TrendingUp,
  Users,
  Activity,
  Calendar
} from 'lucide-react'
import { useState, useEffect } from 'react'
import AdminNav from '@/components/admin/AdminNav'

interface DownloadStats {
  total_downloads: number
  unique_users: number
  unique_ips: number
  downloads_today: number
  downloads_this_week: number
  downloads_this_month: number
  last_download: string | null
  first_download: string | null
  avg_downloads_per_day: number
}

export default function DownloadsPage() {
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<DownloadStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const extensionInfo = {
    name: 'IBV Crawler V2.15 - SAR PRODUCTION',
    version: '2.1.5',
    description: 'Support Flinks + Inverite → admin.solutionargentrapide.ca - Robust findValue() for Customer Info',
    id: 'icjjhbknppfpnfiooooajaggbmlbeagh',
    downloadUrl: '/api/download/ibv-crawler-v2.15.zip',
    fileName: 'ibv-crawler-v2.15.zip',
    fileSize: '75 KB',
    compatibility: 'Chrome, Edge, Brave (Chromium-based browsers)'
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin/downloads/stats?fileName=${encodeURIComponent(extensionInfo.fileName)}`)
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const copyExtensionId = () => {
    navigator.clipboard.writeText(extensionInfo.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const installSteps = [
    {
      step: 1,
      title: 'Télécharger l\'extension',
      description: 'Cliquez sur le bouton de téléchargement ci-dessus pour obtenir le fichier ZIP'
    },
    {
      step: 2,
      title: 'Extraire le fichier ZIP',
      description: 'Décompressez le fichier téléchargé dans un dossier de votre choix'
    },
    {
      step: 3,
      title: 'Ouvrir Chrome Extensions',
      description: 'Allez dans chrome://extensions/ (ou collez ce lien dans la barre d\'adresse)'
    },
    {
      step: 4,
      title: 'Activer le mode développeur',
      description: 'En haut à droite, activez le toggle "Mode développeur"'
    },
    {
      step: 5,
      title: 'Charger l\'extension',
      description: 'Cliquez sur "Charger l\'extension non empaquetée" et sélectionnez le dossier extrait'
    },
    {
      step: 6,
      title: 'Vérifier l\'installation',
      description: 'L\'extension apparaîtra dans la liste avec son ID et sera prête à l\'emploi'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Menu Admin fixe en haut */}
      <AdminNav currentPage="/admin/downloads" />

      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Download className="w-8 h-8 text-blue-600" />
            Téléchargements
          </h1>
          <p className="text-gray-600 mt-2">
            Extensions Chrome et outils pour l'équipe SAR
          </p>
        </div>

        {/* Extension Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-md">
                  <Chrome className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">{extensionInfo.name}</h2>
                  <p className="text-blue-100 text-sm mb-2">{extensionInfo.description}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                      Version {extensionInfo.version}
                    </span>
                    <span className="px-3 py-1 bg-green-500/30 rounded-full backdrop-blur-sm flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Production
                    </span>
                  </div>

                  {/* Stats rapides */}
                  {!loadingStats && stats && (
                    <div className="mt-4 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Download className="w-4 h-4" />
                        <span className="font-semibold">{stats.total_downloads}</span>
                        <span className="text-blue-100">téléchargements</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span className="font-semibold">{stats.unique_users}</span>
                        <span className="text-blue-100">utilisateurs</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Stats détaillées */}
            {!loadingStats && stats && (
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    <p className="text-xs text-blue-600 font-medium">Total</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{stats.total_downloads}</p>
                  <p className="text-xs text-blue-600 mt-1">téléchargements</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <p className="text-xs text-green-600 font-medium">Aujourd'hui</p>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.downloads_today}</p>
                  <p className="text-xs text-green-600 mt-1">cette journée</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <p className="text-xs text-purple-600 font-medium">Cette semaine</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{stats.downloads_this_week}</p>
                  <p className="text-xs text-purple-600 mt-1">7 derniers jours</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <p className="text-xs text-amber-600 font-medium">Moyenne/jour</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-900">{stats.avg_downloads_per_day.toFixed(1)}</p>
                  <p className="text-xs text-amber-600 mt-1">depuis le début</p>
                </div>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Extension ID</p>
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono text-gray-900 truncate">
                    {extensionInfo.id}
                  </code>
                  <button
                    onClick={copyExtensionId}
                    className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Copier l'ID"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Taille du fichier</p>
                <p className="text-sm font-semibold text-gray-900">{extensionInfo.fileSize}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Compatibilité</p>
                <p className="text-sm font-semibold text-gray-900">{extensionInfo.compatibility}</p>
              </div>
            </div>

            {/* Download Button */}
            <a
              href={extensionInfo.downloadUrl}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg font-semibold text-lg"
            >
              <Download className="w-6 h-6" />
              Télécharger l'extension Chrome
              <FileArchive className="w-5 h-5" />
            </a>

            {/* Warning */}
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Utilisation restreinte</p>
                <p>
                  Cette extension est réservée à l'équipe SAR uniquement. Ne pas partager avec des tiers.
                  Contient des clés API de production pour admin.solutionargentrapide.ca.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Instructions d'installation
          </h3>

          <div className="space-y-4">
            {installSteps.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    {step.step}
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{step.title}</h4>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Liens rapides</h4>
            <div className="flex flex-wrap gap-3">
              <a
                href="chrome://extensions/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
              >
                <Chrome className="w-4 h-4" />
                Ouvrir chrome://extensions/
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://admin.solutionargentrapide.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm"
              >
                Admin SAR
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Fonctionnalités de l'extension
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Support Flinks</p>
                <p className="text-sm text-gray-600">Intégration complète avec l'API Flinks</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Support Inverite</p>
                <p className="text-sm text-gray-600">Compatible avec les vérifications Inverite</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Extraction automatique</p>
                <p className="text-sm text-gray-600">Robust findValue() pour récupérer les infos client</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Connexion Admin SAR</p>
                <p className="text-sm text-gray-600">Envoie les données vers admin.solutionargentrapide.ca</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
