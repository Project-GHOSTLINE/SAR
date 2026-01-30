'use client'

import { useEffect, useState } from 'react'
import {
  Database,
  Table,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'

interface Column {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

interface TableInfo {
  table_name: string
  row_count: number
  column_count: number
  columns: Column[]
  has_data: boolean
  error: string | null
}

interface DatabaseData {
  success: boolean
  tables: TableInfo[]
  total_tables: number
  timestamp: string
}

export default function DatabaseExplorerPage() {
  const [data, setData] = useState<DatabaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'with-data' | 'empty'>('all')
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/database/explore')
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error || 'Erreur de chargement')
      }

      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName)
    } else {
      newExpanded.add(tableName)
    }
    setExpandedTables(newExpanded)
  }

  const filteredTables = data?.tables.filter(table => {
    // Filtre par recherche
    const matchesSearch = table.table_name.toLowerCase().includes(searchQuery.toLowerCase())

    // Filtre par mode
    let matchesFilter = true
    if (filterMode === 'with-data') {
      matchesFilter = table.has_data
    } else if (filterMode === 'empty') {
      matchesFilter = !table.has_data
    }

    return matchesSearch && matchesFilter
  }) || []

  const stats = {
    total: data?.tables.length || 0,
    withData: data?.tables.filter(t => t.has_data).length || 0,
    empty: data?.tables.filter(t => !t.has_data).length || 0,
    totalRows: data?.tables.reduce((sum, t) => sum + t.row_count, 0) || 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Chargement des tables...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md border border-red-200 p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Erreur de chargement</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600" />
                Database Explorer
              </h1>
              <p className="text-gray-600 mt-1">
                Exploration complète de toutes les tables et données
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (expandedTables.size === filteredTables.length && filteredTables.length > 0) {
                    // Collapse all
                    setExpandedTables(new Set())
                  } else {
                    // Expand all filtered tables
                    setExpandedTables(new Set(filteredTables.map(t => t.table_name)))
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={filteredTables.length === 0}
              >
                {expandedTables.size === filteredTables.length && filteredTables.length > 0 ? (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    Fermer Tout
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Ouvrir Tout
                  </>
                )}
              </button>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </button>
            </div>
          </div>

          {/* Stats globales */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Table className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Total Tables</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Avec Données</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.withData}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-orange-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-600">Vides</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">{stats.empty}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-purple-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600">Total Lignes</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {stats.totalRows.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              {/* Recherche */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filtres */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    filterMode === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilterMode('with-data')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    filterMode === 'with-data'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Avec données
                </button>
                <button
                  onClick={() => setFilterMode('empty')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    filterMode === 'empty'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Vides
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des tables */}
        <div className="space-y-3">
          {filteredTables.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Aucune table trouvée avec ces critères</p>
            </div>
          ) : (
            filteredTables.map((table) => {
              const isExpanded = expandedTables.has(table.table_name)

              return (
                <div
                  key={table.table_name}
                  className={`bg-white rounded-lg shadow-md border-2 transition-all ${
                    table.has_data
                      ? 'border-green-200'
                      : 'border-orange-200'
                  }`}
                >
                  {/* Header de la table */}
                  <div
                    onClick={() => toggleTable(table.table_name)}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                        <Table className={`w-5 h-5 ${
                          table.has_data ? 'text-green-600' : 'text-orange-600'
                        }`} />
                        <div>
                          <h3 className="font-mono font-semibold text-gray-900">
                            {table.table_name}
                          </h3>
                          {table.error && (
                            <p className="text-xs text-red-600 mt-0.5">{table.error}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {table.row_count.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">lignes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-700">
                            {table.column_count || table.columns.length}
                          </p>
                          <p className="text-xs text-gray-500">colonnes</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Structure de la table (colonnes) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Structure de la table ({table.column_count || table.columns.length} colonnes)
                      </h4>

                      {table.columns.length === 0 ? (
                        <p className="text-gray-600 text-sm">
                          Impossible de récupérer les colonnes (permissions)
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 border-b border-gray-300">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                  Colonne
                                </th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                  Type
                                </th>
                                <th className="px-4 py-2 text-center font-semibold text-gray-700">
                                  Nullable
                                </th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                  Défaut
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {table.columns.map((column, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b border-gray-200 hover:bg-white transition-colors"
                                >
                                  <td className="px-4 py-2 font-mono font-semibold text-blue-700">
                                    {column.column_name}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                                      {column.data_type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {column.is_nullable === 'YES' ? (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                        ✓ NULL
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                        ✗ NOT NULL
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-xs text-gray-600">
                                    {column.column_default || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Affichage de {filteredTables.length} table(s) sur {stats.total} total
          </p>
          <p className="text-xs mt-1">
            Dernière mise à jour: {data?.timestamp ? new Date(data.timestamp).toLocaleString('fr-CA') : '-'}
          </p>
        </div>
      </div>
    </div>
  )
}
