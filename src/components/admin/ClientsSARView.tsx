'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, AlertTriangle, Shield, User, TrendingUp, Database, Download, BarChart3, Users, Target } from 'lucide-react'

interface ClientSAR {
  id: string
  margill_id: string
  dossier_id?: string
  nom_complet?: string
  email?: string
  telephone?: string
  telephone_mobile?: string
  ville?: string
  province?: string
  employeur?: string
  banque_institution?: string
  banque_transit?: string
  banque_compte?: string
  capital_origine?: number
  etat_dossier?: string
  score_fraude: number
  niveau_risque?: string
  flag_pas_ibv: boolean
  flag_mauvaise_creance: boolean
  flag_paiement_rate_precoce: boolean
  flag_documents_email: boolean
  nombre_paiements_non_payes?: number
  solde_actuel?: number
  date_creation_dossier?: string
  lien_ibv?: string
  autres_contrats?: number
}

interface Stats {
  total: number
  sansIBV: number
  mauvaisesCreances: number
  concordancesElevees?: number
  risque: {
    critique: number
    eleve: number
    moyen: number
    faible: number
  }
  parEtat: Record<string, number>
  topRisque: Array<{
    margill_id: string
    nom_complet?: string
    score_fraude: number
    etat_dossier?: string
  }>
}

interface Concordance {
  type: string
  valeur: string
  clients: Array<{
    margill_id: string
    nom_complet: string
    score_fraude: number
    etat_dossier?: string
  }>
  nombre: number
  risque: 'critique' | 'eleve' | 'moyen' | 'faible'
}

type TabType = 'recherche' | 'dashboard' | 'patterns' | 'liste-noire'

export default function ClientsSARView() {
  const [activeTab, setActiveTab] = useState<TabType>('recherche')
  const [clients, setClients] = useState<ClientSAR[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<ClientSAR | null>(null)
  const [concordances, setConcordances] = useState<Concordance[]>([])
  const [concordancesLoading, setConcordancesLoading] = useState(false)
  const [autresContrats, setAutresContrats] = useState<any[]>([])
  const [autresContratsLoading, setAutresContratsLoading] = useState(false)

  // Filtres
  const [searchQuery, setSearchQuery] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [etatDossier, setEtatDossier] = useState('')
  const [flagIBV, setFlagIBV] = useState<string>('')
  const [flagMauvaisCreance, setFlagMauvaisCreance] = useState(false)
  const [filterConcordances, setFilterConcordances] = useState(false)
  const [clientsAvecConcordances, setClientsAvecConcordances] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState<'all' | 'sans-ibv' | 'concordances' | 'critique' | 'eleve' | 'mauvaises-creances'>('all')

  // Pagination
  const [offset, setOffset] = useState(0)
  const [limit] = useState(50)
  const [total, setTotal] = useState(0)

  // Charger les statistiques
  useEffect(() => {
    loadStats()
  }, [])

  // Charger les clients
  useEffect(() => {
    if (activeTab === 'recherche') {
      loadClients()
    }
  }, [searchQuery, minScore, etatDossier, flagIBV, flagMauvaisCreance, filterConcordances, offset, activeTab])

  const loadStats = async () => {
    try {
      setStatsLoading(true)

      // Charger les stats principales et concordances en parallèle
      const [statsResponse, concordancesStatsResponse] = await Promise.all([
        fetch('/api/admin/clients-sar/stats'),
        fetch('/api/admin/clients-sar/concordances-stats')
      ])

      const statsData = await statsResponse.json()
      const concordancesData = await concordancesStatsResponse.json()

      if (statsData.success) {
        setStats({
          ...statsData.stats,
          concordancesElevees: concordancesData.success ? concordancesData.total : 0
        })
      }

      // Charger la liste des clients avec concordances pour le filtrage
      if (concordancesData.success && concordancesData.clientIds) {
        setClientsAvecConcordances(new Set(concordancesData.clientIds))
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        q: searchQuery,
        minScore: minScore.toString(),
        limit: filterConcordances ? '1000' : limit.toString(), // Charger plus si filtre concordances
        offset: filterConcordances ? '0' : offset.toString()
      })

      if (etatDossier) params.append('etatDossier', etatDossier)
      if (flagIBV) params.append('flagIBV', flagIBV)
      if (flagMauvaisCreance) params.append('flagMauvaisCreance', 'true')

      const response = await fetch(`/api/admin/clients-sar/search?${params}`)
      const data = await response.json()

      if (data.success) {
        let clientsFiltered = data.data

        // Filtrer par concordances si activé
        if (filterConcordances && clientsAvecConcordances.size > 0) {
          clientsFiltered = clientsFiltered.filter((c: ClientSAR) =>
            clientsAvecConcordances.has(c.margill_id)
          )
          setTotal(clientsFiltered.length)
        } else {
          setTotal(data.pagination.total)
        }

        // Appliquer pagination manuelle si filtre concordances
        if (filterConcordances) {
          const start = offset
          const end = offset + limit
          setClients(clientsFiltered.slice(start, end))
        } else {
          setClients(clientsFiltered)
        }
      }
    } catch (error) {
      console.error('Erreur chargement clients:', error)
    } finally {
      setLoading(false)
    }
  }

  // UNIFIED DOSSIER ENDPOINT - Replaces N+1 calls
  const loadClientDossier = async (margillId: string) => {
    try {
      setConcordancesLoading(true)
      setAutresContratsLoading(true)

      // SINGLE CALL - Replaces 2 separate calls
      const response = await fetch(`/api/admin/client/${margillId}/dossier`)
      const data = await response.json()

      if (response.ok) {
        // Extract data from unified response
        setConcordances(data.concordances || [])
        setAutresContrats(data.autres_contrats || [])
      } else {
        console.error('Erreur chargement dossier:', data.error)
        setConcordances([])
        setAutresContrats([])
      }
    } catch (error) {
      console.error('Erreur chargement dossier:', error)
      setConcordances([])
      setAutresContrats([])
    } finally {
      setConcordancesLoading(false)
      setAutresContratsLoading(false)
    }
  }

  const handleSelectClient = (client: ClientSAR) => {
    setSelectedClient(client)
    setConcordances([])
    setAutresContrats([])
    loadClientDossier(client.margill_id) // SINGLE CALL - was 2 calls before
  }

  const applyStatFilter = (filterType: 'all' | 'sans-ibv' | 'concordances' | 'critique' | 'eleve' | 'mauvaises-creances') => {
    // Réinitialiser tous les filtres
    setSearchQuery('')
    setMinScore(0)
    setEtatDossier('')
    setFlagIBV('')
    setFlagMauvaisCreance(false)
    setFilterConcordances(false)
    setOffset(0)

    // Mettre à jour le filtre actif
    setActiveFilter(filterType)

    // Appliquer le filtre spécifique
    switch (filterType) {
      case 'sans-ibv':
        setFlagIBV('true')
        break
      case 'concordances':
        setFilterConcordances(true)
        break
      case 'critique':
        setMinScore(80)
        break
      case 'eleve':
        setMinScore(60)
        break
      case 'mauvaises-creances':
        setFlagMauvaisCreance(true)
        break
      case 'all':
      default:
        // Tous les filtres déjà réinitialisés
        break
    }
  }

  const handleSearch = useCallback(() => {
    setOffset(0)
    loadClients()
  }, [searchQuery, minScore, etatDossier, flagIBV, flagMauvaisCreance, filterConcordances])

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800 border-red-300'
    if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-300'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-green-100 text-green-800 border-green-300'
  }

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'CRITIQUE'
    if (score >= 60) return 'ÉLEVÉ'
    if (score >= 40) return 'MOYEN'
    return 'FAIBLE'
  }

  const exportToCSV = () => {
    if (clients.length === 0) return

    const headers = [
      'Margill ID', 'Nom', 'Email', 'Téléphone', 'Ville', 'Province',
      'Employeur', 'Banque', 'Capital', 'État', 'Score Fraude', 'Risque',
      'Pas IBV', 'Mauvaise Créance', 'Paiement Raté Précoce'
    ]

    const rows = clients.map(c => [
      c.margill_id,
      c.nom_complet || '',
      c.email || '',
      c.telephone || c.telephone_mobile || '',
      c.ville || '',
      c.province || '',
      c.employeur || '',
      c.banque_institution || '',
      c.capital_origine || '',
      c.etat_dossier || '',
      c.score_fraude,
      getRiskLabel(c.score_fraude),
      c.flag_pas_ibv ? 'OUI' : 'NON',
      c.flag_mauvaise_creance ? 'OUI' : 'NON',
      c.flag_paiement_rate_precoce ? 'OUI' : 'NON'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `clients-sar-fraude-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const tabs = [
    { id: 'recherche' as TabType, label: 'Recherche', icon: Search },
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: BarChart3 },
    { id: 'patterns' as TabType, label: 'Patterns de Fraude', icon: Target },
    { id: 'liste-noire' as TabType, label: 'Liste Noire', icon: Shield }
  ]

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Base de Données Clients SAR</h1>
          <p className="mt-1 text-sm text-gray-500">
            Système de détection de fraude avec scoring automatique
          </p>
        </div>
        {activeTab === 'recherche' && (
          <button
            onClick={exportToCSV}
            disabled={clients.length === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon
                  className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'recherche' && (
        <RechercheTab
          clients={clients}
          stats={stats}
          statsLoading={statsLoading}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          minScore={minScore}
          setMinScore={setMinScore}
          etatDossier={etatDossier}
          setEtatDossier={setEtatDossier}
          flagIBV={flagIBV}
          setFlagIBV={setFlagIBV}
          flagMauvaisCreance={flagMauvaisCreance}
          setFlagMauvaisCreance={setFlagMauvaisCreance}
          filterConcordances={filterConcordances}
          handleSearch={handleSearch}
          total={total}
          offset={offset}
          setOffset={setOffset}
          limit={limit}
          selectedClient={selectedClient}
          handleSelectClient={handleSelectClient}
          concordances={concordances}
          concordancesLoading={concordancesLoading}
          autresContrats={autresContrats}
          autresContratsLoading={autresContratsLoading}
          setSelectedClient={setSelectedClient}
          applyStatFilter={applyStatFilter}
          activeFilter={activeFilter}
          getRiskColor={getRiskColor}
          getRiskLabel={getRiskLabel}
        />
      )}

      {activeTab === 'dashboard' && (
        <DashboardTab stats={stats} statsLoading={statsLoading} />
      )}

      {activeTab === 'patterns' && (
        <PatternsTab />
      )}

      {activeTab === 'liste-noire' && (
        <ListeNoireTab />
      )}
    </div>
  )
}

// Composant Onglet Recherche
function RechercheTab({ clients, stats, statsLoading, loading, searchQuery, setSearchQuery, minScore, setMinScore, etatDossier, setEtatDossier, flagIBV, setFlagIBV, flagMauvaisCreance, setFlagMauvaisCreance, filterConcordances, handleSearch, total, offset, setOffset, limit, selectedClient, handleSelectClient, concordances, concordancesLoading, autresContrats, autresContratsLoading, setSelectedClient, applyStatFilter, activeFilter, getRiskColor, getRiskLabel }: any) {
  return (
    <>
      {/* Légende Score de Risque */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">ℹ️</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Score de Risque de Fraude (0-100)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="font-semibold text-gray-700 mb-1.5">Facteurs de calcul:</div>
                <div className="space-y-0.5 text-gray-600">
                  <div>• Pas d'IBV: <span className="font-medium text-red-600">+40 pts</span></div>
                  <div>• Documents par email: <span className="font-medium text-red-600">+30 pts</span></div>
                  <div>• Multiples demandes: <span className="font-medium text-red-600">+30 pts</span></div>
                  <div>• Paiement raté précoce: <span className="font-medium text-orange-600">+25 pts</span></div>
                  <div>• Mauvaise créance: <span className="font-medium text-orange-600">+20 pts</span></div>
                  <div>• Ratio impayés {'>'}50%: <span className="font-medium text-orange-600">+20 pts</span></div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-1.5">Niveaux de risque:</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      80-100 Critique
                    </span>
                    <span className="text-gray-500">Risque très élevé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                      60-79 Élevé
                    </span>
                    <span className="text-gray-500">Attention requise</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                      40-59 Moyen
                    </span>
                    <span className="text-gray-500">Surveillance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      0-39 Faible
                    </span>
                    <span className="text-gray-500">Risque minimal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Total clients */}
          <div
            onClick={() => applyStatFilter('all')}
            className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow border-2 ${
              activeFilter === 'all' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-blue-300'
            }`}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.total.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Sans IBV */}
          <div
            onClick={() => applyStatFilter('sans-ibv')}
            className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow border-2 ${
              activeFilter === 'sans-ibv' ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-orange-300'
            }`}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Sans IBV</dt>
                    <dd className="text-lg font-semibold text-orange-600">
                      {stats.sansIBV.toLocaleString()}
                      <span className="text-sm text-gray-500 ml-1">
                        ({((stats.sansIBV / stats.total) * 100).toFixed(1)}%)
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Concordances Élevées */}
          <div
            onClick={() => applyStatFilter('concordances')}
            className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow border-2 ${
              activeFilter === 'concordances' ? 'border-purple-500 bg-purple-50' : 'border-transparent hover:border-purple-300'
            }`}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Concordances</dt>
                    <dd className="text-lg font-semibold text-purple-700">
                      {(stats.concordancesElevees || 0).toLocaleString()}
                      <span className="text-sm text-gray-500 ml-1">
                        ({(((stats.concordancesElevees || 0) / stats.total) * 100).toFixed(1)}%)
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Risque Critique */}
          <div
            onClick={() => applyStatFilter('critique')}
            className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow border-2 ${
              activeFilter === 'critique' ? 'border-red-500 bg-red-50' : 'border-transparent hover:border-red-300'
            }`}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Risque Critique</dt>
                    <dd className="text-lg font-semibold text-red-600">
                      {stats.risque.critique.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Risque Élevé */}
          <div
            onClick={() => applyStatFilter('eleve')}
            className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow border-2 ${
              activeFilter === 'eleve' ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-orange-300'
            }`}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Risque Élevé</dt>
                    <dd className="text-lg font-semibold text-orange-600">
                      {stats.risque.eleve.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Mauvaises créances */}
          <div
            onClick={() => applyStatFilter('mauvaises-creances')}
            className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow border-2 ${
              activeFilter === 'mauvaises-creances' ? 'border-red-500 bg-red-50' : 'border-transparent hover:border-red-300'
            }`}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Mauvaises Créances</dt>
                    <dd className="text-lg font-semibold text-red-600">
                      {stats.mauvaisesCreances.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres de recherche */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Recherche textuelle */}
          <div className="col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Nom, email, téléphone, N° contrat (ex: MC9004), Margill ID, NAS..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Score minimum */}
          <div>
            <label htmlFor="minScore" className="block text-sm font-medium text-gray-700 mb-1">
              Score fraude minimum
            </label>
            <select
              id="minScore"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="0">Tous (0+)</option>
              <option value="40">Moyen (40+)</option>
              <option value="60">Élevé (60+)</option>
              <option value="80">Critique (80+)</option>
            </select>
          </div>

          {/* État du dossier */}
          <div>
            <label htmlFor="etatDossier" className="block text-sm font-medium text-gray-700 mb-1">
              État du dossier
            </label>
            <select
              id="etatDossier"
              value={etatDossier}
              onChange={(e) => setEtatDossier(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Tous</option>
              <option value="Actif">Actif</option>
              <option value="Fermé">Fermé</option>
            </select>
          </div>

          {/* Flags IBV */}
          <div>
            <label htmlFor="flagIBV" className="block text-sm font-medium text-gray-700 mb-1">
              Vérification IBV
            </label>
            <select
              id="flagIBV"
              value={flagIBV}
              onChange={(e) => setFlagIBV(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Tous</option>
              <option value="true">Sans IBV</option>
              <option value="false">Avec IBV</option>
            </select>
          </div>

          {/* Mauvaises créances */}
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={flagMauvaisCreance}
                onChange={(e) => setFlagMauvaisCreance(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Mauvaises créances seulement</span>
            </label>
          </div>

          {/* Bouton recherche */}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </button>
          </div>
        </div>
      </div>

      {/* Tableau de résultats */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Résultats ({total.toLocaleString()} clients)
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Chargement...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun client trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Risque
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      ID / Contrat
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Compte Bancaire
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Dossier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Alertes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {clients.map((client: any) => (
                    <tr
                      key={client.id}
                      onClick={() => handleSelectClient(client)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors duration-150 border-l-2 border-transparent hover:border-blue-400"
                    >
                      {/* Score de fraude */}
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                          client.score_fraude >= 80 ? 'bg-red-50 text-red-700 border border-red-200' :
                          client.score_fraude >= 60 ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          client.score_fraude >= 40 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                          'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          <span className="font-bold text-lg">{client.score_fraude}</span>
                          <span className="text-xs">
                            {client.score_fraude >= 80 ? 'Critique' :
                             client.score_fraude >= 60 ? 'Élevé' :
                             client.score_fraude >= 40 ? 'Moyen' :
                             'Faible'}
                          </span>
                        </div>
                      </td>

                      {/* ID / Contrat */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">ID:</span>
                            <span className="text-sm font-mono font-bold text-gray-900">{client.margill_id}</span>
                          </div>
                          {client.dossier_id && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-500">Contrat:</span>
                              <span className="text-sm font-mono font-bold text-blue-600">#{client.dossier_id}</span>
                            </div>
                          )}
                          <div className="text-sm font-semibold text-gray-900 mt-2">{client.nom_complet || 'N/A'}</div>
                        </div>
                      </td>

                      {/* Compte Bancaire */}
                      <td className="px-4 py-3">
                        <div className="space-y-1 font-mono text-xs">
                          {client.banque_institution && (
                            <div className="flex items-start gap-2">
                              <span className="text-gray-500 font-semibold min-w-[60px]">Institution:</span>
                              <span className="text-gray-900 font-medium">{client.banque_institution}</span>
                            </div>
                          )}
                          {client.banque_transit && (
                            <div className="flex items-start gap-2">
                              <span className="text-gray-500 font-semibold min-w-[60px]">Transit:</span>
                              <span className="text-gray-900 font-bold">{client.banque_transit}</span>
                            </div>
                          )}
                          {client.banque_compte && (
                            <div className="flex items-start gap-2">
                              <span className="text-gray-500 font-semibold min-w-[60px]">Compte:</span>
                              <span className="text-gray-900 font-bold">{client.banque_compte}</span>
                            </div>
                          )}
                          {!client.banque_institution && !client.banque_transit && !client.banque_compte && (
                            <span className="text-gray-400 italic">Aucune info</span>
                          )}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5">
                          {client.email && (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs text-gray-700 truncate max-w-[180px]">{client.email}</span>
                            </div>
                          )}
                          {(client.telephone || client.telephone_mobile) && (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="text-xs font-medium text-gray-900">{client.telephone_mobile || client.telephone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Dossier */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          client.etat_dossier === 'Actif'
                            ? 'bg-green-50 text-green-700 border-2 border-green-200'
                            : 'bg-gray-50 text-gray-600 border-2 border-gray-200'
                        }`}>
                          {client.etat_dossier || 'N/A'}
                        </span>
                      </td>

                      {/* Alertes */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {client.flag_pas_ibv && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              Sans IBV
                            </span>
                          )}
                          {client.flag_mauvaise_creance && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              Créance
                            </span>
                          )}
                          {client.flag_paiement_rate_precoce && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                              Paiement précoce
                            </span>
                          )}
                          {client.flag_documents_email && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Docs email
                            </span>
                          )}
                          {client.autres_contrats && client.autres_contrats > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectClient(client)
                              }}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border-2 border-purple-300 hover:bg-purple-100 transition-colors"
                            >
                              🔗 {client.autres_contrats} autre{client.autres_contrats > 1 ? 's' : ''} contrat{client.autres_contrats > 1 ? 's' : ''}
                            </button>
                          )}
                          {!client.flag_pas_ibv && !client.flag_mauvaise_creance && !client.flag_paiement_rate_precoce && !client.flag_documents_email && !client.autres_contrats && (
                            <span className="text-xs text-gray-400 italic">Aucune alerte</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Affichage de <span className="font-medium">{offset + 1}</span> à{' '}
                    <span className="font-medium">{Math.min(offset + limit, total)}</span> sur{' '}
                    <span className="font-medium">{total}</span> résultats
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                      disabled={offset === 0}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => setOffset(offset + limit)}
                      disabled={offset + limit >= total}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Suivant
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de détails */}
      {selectedClient && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedClient(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedClient.nom_complet || 'Client'}</h2>
                  <p className="text-blue-100 text-sm mt-1">ID: {selectedClient.margill_id} {selectedClient.dossier_id && `• N° Contrat: ${selectedClient.dossier_id}`}</p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold ${
                    selectedClient.score_fraude >= 80 ? 'bg-red-500' :
                    selectedClient.score_fraude >= 60 ? 'bg-orange-500' :
                    selectedClient.score_fraude >= 40 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}>
                    Score: {selectedClient.score_fraude}
                  </div>
                  <div className="text-xs mt-1 text-blue-100">{getRiskLabel(selectedClient.score_fraude)}</div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Concordances / Liens avec autres clients */}
              {concordancesLoading && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-sm text-blue-900">Analyse des concordances...</span>
                  </div>
                </div>
              )}

              {!concordancesLoading && concordances.length > 0 && (
                <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                  <h3 className="text-base font-bold text-purple-900 mb-3 flex items-center">
                    🔗 Concordances Détectées ({concordances.length})
                    <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                      Possibles liens entre clients
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {concordances.map((concordance: Concordance, idx: number) => {
                      const risqueColors = {
                        critique: 'bg-red-600 text-white',
                        eleve: 'bg-orange-600 text-white',
                        moyen: 'bg-yellow-600 text-white',
                        faible: 'bg-gray-400 text-white'
                      }

                      const typeLabels: Record<string, string> = {
                        email: '📧 Email partagé',
                        telephone: '☎️ Téléphone partagé',
                        telephone_mobile: '📱 Mobile partagé',
                        employeur: '💼 Même employeur',
                        ville: '🏙️ Même ville',
                        adresse: '🏠 Même adresse',
                        banque_compte: '🏦 Même compte bancaire',
                        contact_nom: '👥 Contact = Client',
                        banque_institution: '🏦 Même banque'
                      }

                      return (
                        <div key={idx} className="bg-white border border-purple-200 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900">
                                  {typeLabels[concordance.type] || concordance.type}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${risqueColors[concordance.risque]}`}>
                                  {concordance.risque.toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {concordance.nombre} client{concordance.nombre > 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                                {concordance.valeur}
                              </div>
                            </div>
                          </div>

                          {/* Liste des clients concordants */}
                          <div className="mt-2 pl-3 border-l-2 border-purple-200">
                            <div className="space-y-1">
                              {concordance.clients.slice(0, 3).map((client, clientIdx) => (
                                <div key={clientIdx} className="flex items-center justify-between text-xs">
                                  <span className="font-medium text-gray-700">
                                    {client.nom_complet || 'N/A'}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">ID: {client.margill_id}</span>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                      client.score_fraude >= 80 ? 'bg-red-100 text-red-800' :
                                      client.score_fraude >= 60 ? 'bg-orange-100 text-orange-800' :
                                      client.score_fraude >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      Score: {client.score_fraude}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {concordance.clients.length > 3 && (
                                <div className="text-xs text-gray-500 italic">
                                  + {concordance.clients.length - 3} autre{concordance.clients.length - 3 > 1 ? 's' : ''} client{concordance.clients.length - 3 > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Autres contrats du même client */}
              {autresContratsLoading && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-sm text-blue-900">Recherche d'autres contrats...</span>
                  </div>
                </div>
              )}

              {!autresContratsLoading && autresContrats.length > 0 && (
                <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-4">
                  <h3 className="text-base font-bold text-purple-900 mb-3 flex items-center">
                    🔗 Autres Contrats Trouvés ({autresContrats.length})
                    <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                      Même personne
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {autresContrats.map((contrat: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white border-2 border-purple-200 rounded-lg p-4 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => {
                          const client = clients.find((c: any) => c.margill_id === contrat.margill_id)
                          if (client) handleSelectClient(client)
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-bold text-gray-900">
                                {contrat.nom_complet || 'N/A'}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                contrat.etat_dossier === 'Actif'
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}>
                                {contrat.etat_dossier || 'N/A'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-semibold">ID:</span>
                                <span className="font-mono font-bold text-gray-900">{contrat.margill_id}</span>
                              </div>
                              {contrat.dossier_id && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 font-semibold">Contrat:</span>
                                  <span className="font-mono font-bold text-blue-600">#{contrat.dossier_id}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-semibold">Détecté par:</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  {contrat.match_type === 'email' ? '📧 Email' :
                                   contrat.match_type === 'telephone' ? '☎️ Téléphone' :
                                   contrat.match_type === 'mobile' ? '📱 Mobile' :
                                   contrat.match_type === 'nom' ? '👤 Nom' : contrat.match_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-semibold">Score:</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                  contrat.score_fraude >= 80 ? 'bg-red-100 text-red-700 border border-red-200' :
                                  contrat.score_fraude >= 60 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                  contrat.score_fraude >= 40 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                  'bg-green-100 text-green-700 border border-green-200'
                                }`}>
                                  {contrat.score_fraude}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            className="ml-3 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              const client = clients.find((c: any) => c.margill_id === contrat.margill_id)
                              if (client) handleSelectClient(client)
                            }}
                          >
                            Voir la fiche →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicateurs de fraude - En haut pour visibilité */}
              {(selectedClient.flag_pas_ibv || selectedClient.flag_mauvaise_creance || selectedClient.flag_paiement_rate_precoce || selectedClient.flag_documents_email) && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-red-900 mb-3">⚠️ Indicateurs de Risque</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedClient.flag_pas_ibv && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white">
                        🚫 Pas de vérification IBV
                      </span>
                    )}
                    {selectedClient.flag_mauvaise_creance && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white">
                        💸 Mauvaise créance
                      </span>
                    )}
                    {selectedClient.flag_paiement_rate_precoce && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-600 text-white">
                        ⏰ Paiement raté précoce
                      </span>
                    )}
                    {selectedClient.flag_documents_email && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-600 text-white">
                        📧 Documents par email
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Lien IBV si présent */}
              {selectedClient.lien_ibv && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-green-900 mb-2">✅ Vérification IBV</h3>
                  <a
                    href={selectedClient.lien_ibv}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
                  >
                    🔗 Voir le rapport IBV
                  </a>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonne Gauche */}
                <div className="space-y-6">
                  {/* 👤 Informations Personnelles */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">👤</span>
                      Informations Personnelles
                    </h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">📅 Naissance:</dt>
                        <dd className="text-gray-900">{selectedClient.date_naissance ? new Date(selectedClient.date_naissance).toLocaleDateString('fr-CA') : 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">📧 Email:</dt>
                        <dd className="text-gray-900 break-all">{selectedClient.email || 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">📱 Mobile:</dt>
                        <dd className="text-gray-900">{selectedClient.telephone_mobile || 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">☎️ Téléphone:</dt>
                        <dd className="text-gray-900">{selectedClient.telephone || 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* 🏠 Adresse */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">🏠</span>
                      Adresse
                    </h3>
                    <div className="text-sm text-gray-900 space-y-1">
                      <div>{selectedClient.adresse_ligne1 || 'N/A'}</div>
                      {selectedClient.adresse_ligne2 && <div>{selectedClient.adresse_ligne2}</div>}
                      <div>
                        {selectedClient.ville && selectedClient.province
                          ? `${selectedClient.ville}, ${selectedClient.province}`
                          : 'N/A'}
                      </div>
                      {selectedClient.code_postal && <div>{selectedClient.code_postal}</div>}
                      {selectedClient.pays && <div>{selectedClient.pays}</div>}
                    </div>
                  </div>

                  {/* 💼 Employeur */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">💼</span>
                      Informations Employeur
                    </h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">Entreprise:</dt>
                        <dd className="text-gray-900">{selectedClient.employeur || 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">☎️ Téléphone:</dt>
                        <dd className="text-gray-900">{selectedClient.telephone_employeur || 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">Contact:</dt>
                        <dd className="text-gray-900">{selectedClient.personne_contact_employeur || 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">📅 Embauche:</dt>
                        <dd className="text-gray-900">{selectedClient.date_embauche ? new Date(selectedClient.date_embauche).toLocaleDateString('fr-CA') : 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">Occupation:</dt>
                        <dd className="text-gray-900">{selectedClient.occupation || 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* 🏦 Informations Bancaires */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">🏦</span>
                      Informations Bancaires
                    </h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">Institution:</dt>
                        <dd className="text-gray-900">{selectedClient.banque_institution || 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">Transit:</dt>
                        <dd className="text-gray-900 font-mono">{selectedClient.banque_transit || 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">Compte:</dt>
                        <dd className="text-gray-900 font-mono">{selectedClient.banque_compte || 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Colonne Droite */}
                <div className="space-y-6">
                  {/* 📋 État du Dossier */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">📋</span>
                      État du Dossier
                    </h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">État:</dt>
                        <dd>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                            selectedClient.etat_dossier === 'Actif' ? 'bg-green-500 text-white' :
                            selectedClient.etat_dossier === 'Fermé' ? 'bg-gray-500 text-white' :
                            'bg-yellow-500 text-white'
                          }`}>
                            {selectedClient.etat_dossier || 'N/A'}
                          </span>
                        </dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">Responsable:</dt>
                        <dd className="text-gray-900">{selectedClient.responsable_dossier || 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">Fréquence:</dt>
                        <dd className="text-gray-900">{selectedClient.frequence_paiement || 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">📅 Création:</dt>
                        <dd className="text-gray-900">{selectedClient.date_creation_dossier ? new Date(selectedClient.date_creation_dossier).toLocaleDateString('fr-CA') : 'N/A'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-32">📅 Dernière MAJ:</dt>
                        <dd className="text-gray-900">{selectedClient.date_maj_dossier ? new Date(selectedClient.date_maj_dossier).toLocaleDateString('fr-CA') : 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* 💰 Informations Financières */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">💰</span>
                      Informations Financières
                    </h3>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between items-center bg-white rounded-lg p-3">
                        <dt className="font-medium text-gray-600">Capital origine</dt>
                        <dd className="text-lg font-bold text-blue-600">
                          {selectedClient.capital_origine ? `${selectedClient.capital_origine.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $` : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center bg-white rounded-lg p-3">
                        <dt className="font-medium text-gray-600">Solde actuel</dt>
                        <dd className="text-lg font-bold text-orange-600">
                          {selectedClient.solde_actuel ? `${selectedClient.solde_actuel.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $` : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center bg-white rounded-lg p-3">
                        <dt className="font-medium text-gray-600">Total payé</dt>
                        <dd className="text-lg font-bold text-green-600">
                          {selectedClient.total_paiements_positifs ? `${selectedClient.total_paiements_positifs.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $` : 'N/A'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* 📊 Historique de Paiements */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">📊</span>
                      Historique de Paiements
                    </h3>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <dt className="font-medium text-gray-600">✅ Paiements réussis</dt>
                        <dd className="text-lg font-bold text-green-600">{selectedClient.nombre_paiements_faits || '0'}</dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="font-medium text-gray-600">❌ Paiements manqués</dt>
                        <dd className="text-lg font-bold text-red-600">{selectedClient.nombre_paiements_non_payes || '0'}</dd>
                      </div>
                      {(selectedClient.nombre_paiements_faits || 0) + (selectedClient.nombre_paiements_non_payes || 0) > 0 && (
                        <div className="pt-2 border-t border-gray-300">
                          <dt className="font-medium text-gray-600 mb-2">Taux de réussite</dt>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full ${
                                ((selectedClient.nombre_paiements_faits || 0) / ((selectedClient.nombre_paiements_faits || 0) + (selectedClient.nombre_paiements_non_payes || 0))) >= 0.7
                                  ? 'bg-green-500'
                                  : ((selectedClient.nombre_paiements_faits || 0) / ((selectedClient.nombre_paiements_faits || 0) + (selectedClient.nombre_paiements_non_payes || 0))) >= 0.4
                                  ? 'bg-orange-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${((selectedClient.nombre_paiements_faits || 0) / ((selectedClient.nombre_paiements_faits || 0) + (selectedClient.nombre_paiements_non_payes || 0))) * 100}%`
                              }}
                            ></div>
                          </div>
                          <dd className="text-xs text-gray-500 mt-1 text-center">
                            {(((selectedClient.nombre_paiements_faits || 0) / ((selectedClient.nombre_paiements_faits || 0) + (selectedClient.nombre_paiements_non_payes || 0))) * 100).toFixed(1)}%
                          </dd>
                        </div>
                      )}
                      <div className="flex">
                        <dt className="font-medium text-gray-600 w-40">📅 Dernier paiement:</dt>
                        <dd className="text-gray-900">{selectedClient.date_dernier_paiement ? new Date(selectedClient.date_dernier_paiement).toLocaleDateString('fr-CA') : 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* 👥 Contacts d'Urgence */}
                  {(selectedClient.contact1_nom || selectedClient.contact2_nom) && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                        <span className="text-lg mr-2">👥</span>
                        Contacts d'Urgence
                      </h3>
                      <dl className="space-y-3 text-sm">
                        {selectedClient.contact1_nom && (
                          <div>
                            <dt className="font-medium text-gray-600">Contact 1:</dt>
                            <dd className="text-gray-900">{selectedClient.contact1_nom}</dd>
                            <dd className="text-gray-600 text-xs">☎️ {selectedClient.contact1_telephone || 'N/A'}</dd>
                          </div>
                        )}
                        {selectedClient.contact2_nom && (
                          <div>
                            <dt className="font-medium text-gray-600">Contact 2:</dt>
                            <dd className="text-gray-900">{selectedClient.contact2_nom}</dd>
                            <dd className="text-gray-600 text-xs">☎️ {selectedClient.contact2_telephone || 'N/A'}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              </div>

              {/* Bouton Fermer */}
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedClient(null)}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Composant Onglet Dashboard
function DashboardTab({ stats, statsLoading }: { stats: Stats | null, statsLoading: boolean }) {
  if (statsLoading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-500">Chargement des statistiques...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-gray-500">Aucune statistique disponible</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Vue d'ensemble</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">Clients Total</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">{stats.sansIBV.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">Sans IBV ({((stats.sansIBV / stats.total) * 100).toFixed(1)}%)</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600">{stats.risque.critique + stats.risque.eleve}</div>
            <div className="text-sm text-gray-500 mt-1">À Haut Risque</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{stats.risque.faible.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">Faible Risque ({((stats.risque.faible / stats.total) * 100).toFixed(1)}%)</div>
          </div>
        </div>
      </div>

      {/* Distribution par niveau de risque */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Distribution par Niveau de Risque</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm font-medium mb-1">
              <span>CRITIQUE (80-100)</span>
              <span className="text-red-600">{stats.risque.critique} clients</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full"
                style={{ width: `${(stats.risque.critique / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm font-medium mb-1">
              <span>ÉLEVÉ (60-79)</span>
              <span className="text-orange-600">{stats.risque.eleve} clients</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full"
                style={{ width: `${(stats.risque.eleve / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm font-medium mb-1">
              <span>MOYEN (40-59)</span>
              <span className="text-yellow-600">{stats.risque.moyen} clients</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${(stats.risque.moyen / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm font-medium mb-1">
              <span>FAIBLE (0-39)</span>
              <span className="text-green-600">{stats.risque.faible} clients</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${(stats.risque.faible / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 clients à risque */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Top 10 Clients à Risque</h2>
        {stats.topRisque && stats.topRisque.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Margill
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    État
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.topRisque.map((client, index) => (
                  <tr key={client.margill_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.margill_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.nom_complet || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        client.score_fraude >= 80 ? 'bg-red-100 text-red-800' :
                        client.score_fraude >= 60 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {client.score_fraude}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.etat_dossier || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucun client à risque élevé</p>
        )}
      </div>

      {/* Distribution par état de dossier */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Distribution par État de Dossier</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(stats.parEtat).map(([etat, nombre]) => (
            <div key={etat} className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{nombre.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">{etat}</div>
              <div className="text-xs text-gray-400 mt-1">
                {((nombre / stats.total) * 100).toFixed(1)}% du total
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Composant Onglet Patterns de Fraude
function PatternsTab() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Détection de Patterns de Fraude</h2>
      <div className="text-center py-12">
        <Target className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Analyse de Patterns</h3>
        <p className="mt-1 text-sm text-gray-500">
          Cette fonctionnalité détectera automatiquement:
        </p>
        <ul className="mt-4 text-sm text-gray-500 text-left max-w-md mx-auto space-y-2">
          <li>• Même numéro de téléphone pour plusieurs clients</li>
          <li>• Même email pour plusieurs demandes</li>
          <li>• Même NAS utilisé plusieurs fois</li>
          <li>• Même compte bancaire partagé</li>
          <li>• Adresses suspectes (multiples clients)</li>
        </ul>
        <p className="mt-4 text-xs text-gray-400">
          À implémenter dans une prochaine version
        </p>
      </div>
    </div>
  )
}

// Composant Onglet Liste Noire
function ListeNoireTab() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Liste Noire</h2>
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Clients Bloqués</h3>
        <p className="mt-1 text-sm text-gray-500">
          Gestion de la liste des clients interdits de prêt
        </p>
        <p className="mt-4 text-xs text-gray-400">
          À implémenter dans une prochaine version
        </p>
      </div>
    </div>
  )
}
