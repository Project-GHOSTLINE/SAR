'use client'

import { TrendingUp, TrendingDown, DollarSign, CreditCard, AlertTriangle, Activity, BarChart3, PieChart } from 'lucide-react'
import type { AnalysisScore } from '@/types/analysis'

interface MetricsPanelProps {
  scores: AnalysisScore | null
  isLoading?: boolean
}

/**
 * Composant pour afficher les métriques financières détaillées
 */
export default function MetricsPanel({ scores, isLoading = false }: MetricsPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!scores) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Métriques non disponibles
        </h3>
        <p className="text-sm text-gray-500">
          Les métriques financières n'ont pas encore été calculées
        </p>
      </div>
    )
  }

  // Calculer le cashflow net
  const netCashflow = scores.monthly_income - scores.monthly_expenses
  const isPositiveCashflow = netCashflow > 0

  // Calculer le taux d'épargne
  const savingsRate = scores.monthly_income > 0
    ? ((netCashflow / scores.monthly_income) * 100)
    : 0

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Métriques Financières</h3>
            <p className="text-sm text-gray-500 mt-1">Analyse détaillée de la santé financière</p>
          </div>
          <Activity className="w-6 h-6 text-indigo-600" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Section 1: Revenus et Dépenses */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
            <DollarSign className="w-4 h-4 mr-2 text-indigo-600" />
            Flux de trésorerie
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Revenus */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-green-800">Revenus mensuels</span>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {Math.round(scores.monthly_income).toLocaleString('fr-CA')} $
              </div>
              <div className="text-xs text-green-700 mt-1">
                {scores.monthly_income >= 4000 ? 'Excellent' : scores.monthly_income >= 2500 ? 'Bon' : 'Limité'}
              </div>
            </div>

            {/* Dépenses */}
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-red-800">Dépenses mensuelles</span>
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-900">
                {Math.round(scores.monthly_expenses).toLocaleString('fr-CA')} $
              </div>
              <div className="text-xs text-red-700 mt-1">
                {Math.round((scores.monthly_expenses / scores.monthly_income) * 100)}% du revenu
              </div>
            </div>

            {/* Cashflow net */}
            <div className={`rounded-lg p-4 border ${isPositiveCashflow ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${isPositiveCashflow ? 'text-blue-800' : 'text-orange-800'}`}>
                  Cashflow net
                </span>
                {isPositiveCashflow ? (
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-orange-600" />
                )}
              </div>
              <div className={`text-2xl font-bold ${isPositiveCashflow ? 'text-blue-900' : 'text-orange-900'}`}>
                {netCashflow >= 0 ? '+' : ''}{Math.round(netCashflow).toLocaleString('fr-CA')} $
              </div>
              <div className={`text-xs mt-1 ${isPositiveCashflow ? 'text-blue-700' : 'text-orange-700'}`}>
                {isPositiveCashflow ? `Épargne: ${Math.round(savingsRate)}%` : 'Déficit'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: DTI et Santé du compte */}
        <div className="pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
            <PieChart className="w-4 h-4 mr-2 text-indigo-600" />
            Ratios et Indicateurs
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DTI Ratio */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Ratio DTI (Dette/Revenu)</span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  scores.dti_ratio < 0.30 ? 'bg-green-100 text-green-800' :
                  scores.dti_ratio < 0.50 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {scores.dti_ratio < 0.30 ? 'Excellent' : scores.dti_ratio < 0.50 ? 'Acceptable' : 'Élevé'}
                </span>
              </div>

              {/* Barre de progression DTI */}
              <div className="relative">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>0%</span>
                  <span>30%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      scores.dti_ratio < 0.30 ? 'bg-green-500' :
                      scores.dti_ratio < 0.50 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(scores.dti_ratio * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-center mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(scores.dti_ratio * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Account Health */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Santé du compte</span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  scores.account_health >= 850 ? 'bg-green-100 text-green-800' :
                  scores.account_health >= 700 ? 'bg-blue-100 text-blue-800' :
                  scores.account_health >= 500 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {scores.account_health >= 850 ? 'Excellent' :
                   scores.account_health >= 700 ? 'Bon' :
                   scores.account_health >= 500 ? 'Moyen' : 'Faible'}
                </span>
              </div>

              {/* Gauge circulaire */}
              <div className="relative">
                <div className="flex justify-center mb-2">
                  <div className="relative w-32 h-32">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${(scores.account_health / 1000) * 351.86} 351.86`}
                        className={
                          scores.account_health >= 700 ? 'text-green-500' :
                          scores.account_health >= 500 ? 'text-yellow-500' :
                          'text-red-500'
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {scores.account_health}
                        </div>
                        <div className="text-xs text-gray-500">/1000</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Alertes et Problèmes */}
        {(scores.nsf_count > 0 || scores.overdraft_count > 0 || scores.bankruptcy_detected || scores.microloans_detected) && (
          <div className="pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
              Alertes et Problèmes Détectés
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scores.nsf_count > 0 && (
                <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-900">
                      {scores.nsf_count} Frais NSF
                    </div>
                    <div className="text-xs text-red-700">
                      Dans les 30 derniers jours
                    </div>
                  </div>
                </div>
              )}

              {scores.overdraft_count > 0 && (
                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-orange-900">
                      {scores.overdraft_count} Découverts
                    </div>
                    <div className="text-xs text-orange-700">
                      Dans les 30 derniers jours
                    </div>
                  </div>
                </div>
              )}

              {scores.bankruptcy_detected && (
                <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-900">
                      Faillite Détectée
                    </div>
                    <div className="text-xs text-red-700">
                      Indicateur dans transactions
                    </div>
                  </div>
                </div>
              )}

              {scores.microloans_detected && (
                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-orange-900">
                      Prêts Rapides
                    </div>
                    <div className="text-xs text-orange-700">
                      Payday loans détectés
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer avec timestamp */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Dernière mise à jour: {new Date(scores.created_at).toLocaleDateString('fr-CA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
            <span>ID: {scores.id.slice(0, 8)}...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
