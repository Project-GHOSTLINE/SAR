'use client'

import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import type { AnalysisScore } from '@/types/analysis'

interface ScoreDisplayProps {
  scores: AnalysisScore | null
  isLoading?: boolean
}

/**
 * Composant pour afficher le SAR Score avec un gauge visuel
 */
export default function ScoreDisplay({ scores, isLoading = false }: ScoreDisplayProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!scores) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Score non disponible
        </h3>
        <p className="text-sm text-gray-500">
          L'analyse automatique n'a pas encore été effectuée
        </p>
      </div>
    )
  }

  // Déterminer la couleur et le niveau basés sur le score
  const getScoreLevel = (score: number) => {
    if (score >= 700) return { level: 'Excellent', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-500' }
    if (score >= 650) return { level: 'Bon', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-500' }
    if (score >= 550) return { level: 'Moyen', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-500' }
    if (score >= 450) return { level: 'Faible', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-500' }
    return { level: 'Très Faible', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-500' }
  }

  const scoreInfo = getScoreLevel(scores.sar_score)

  // Calculer le pourcentage pour le gauge (300-850 => 0-100%)
  const percentage = ((scores.sar_score - 300) / (850 - 300)) * 100

  // Déterminer l'icône de tendance
  const TrendIcon = scores.sar_score >= 650 ? TrendingUp : TrendingDown

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">SAR Score</h3>
          <p className="text-sm text-gray-500">Score de risque automatisé</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${scoreInfo.bgColor} ${scoreInfo.textColor}`}>
          {scoreInfo.level}
        </span>
      </div>

      {/* Disclaimer BETA */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-900">VERSION BÊTA</p>
            <p className="text-xs text-amber-700 mt-1">
              Ce système d'analyse automatique est en phase de test. Les résultats sont générés par des algorithmes de programmation et peuvent contenir des erreurs. Veuillez toujours vérifier manuellement avant toute décision.
            </p>
          </div>
        </div>
      </div>

      {/* Score principal avec gauge */}
      <div className="mb-6">
        {/* Score numérique */}
        <div className="flex items-baseline justify-center mb-4">
          <span className="text-6xl font-bold text-gray-900">
            {scores.sar_score}
          </span>
          <span className="text-2xl text-gray-400 ml-2">/850</span>
        </div>

        {/* Gauge visuel */}
        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full bg-gradient-to-r from-${scoreInfo.color}-400 to-${scoreInfo.color}-600 transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>

        {/* Échelle de référence */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>300</span>
          <span>500</span>
          <span>650</span>
          <span>850</span>
        </div>
      </div>

      {/* Métriques secondaires */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-500 mb-1">Confiance</div>
          <div className="flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{ width: `${scores.confidence * 100}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(scores.confidence * 100)}%
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Santé du compte</div>
          <div className="flex items-center">
            <TrendIcon className={`w-4 h-4 mr-1 ${scores.account_health >= 700 ? 'text-green-600' : 'text-orange-600'}`} />
            <span className="text-sm font-medium text-gray-900">
              {scores.account_health}/1000
            </span>
          </div>
        </div>
      </div>

      {/* Métriques financières */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-500 mb-1">Revenu</div>
          <div className="text-base font-semibold text-gray-900">
            {Math.round(scores.monthly_income)} $
          </div>
          <div className="text-xs text-gray-500">/ mois</div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Dépenses</div>
          <div className="text-base font-semibold text-gray-900">
            {Math.round(scores.monthly_expenses)} $
          </div>
          <div className="text-xs text-gray-500">/ mois</div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Ratio DTI</div>
          <div className="text-base font-semibold text-gray-900">
            {Math.round(scores.dti_ratio * 100)}%
          </div>
          <div className={`text-xs ${scores.dti_ratio < 0.40 ? 'text-green-600' : scores.dti_ratio < 0.60 ? 'text-yellow-600' : 'text-red-600'}`}>
            {scores.dti_ratio < 0.40 ? 'Excellent' : scores.dti_ratio < 0.60 ? 'Acceptable' : 'Élevé'}
          </div>
        </div>
      </div>

      {/* Alertes */}
      {(scores.nsf_count > 0 || scores.overdraft_count > 0 || scores.bankruptcy_detected || scores.microloans_detected) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 mb-1">Alertes détectées</div>
              <ul className="text-sm text-gray-600 space-y-1">
                {scores.nsf_count > 0 && (
                  <li>• {scores.nsf_count} frais NSF (30 jours)</li>
                )}
                {scores.overdraft_count > 0 && (
                  <li>• {scores.overdraft_count} découverts (30 jours)</li>
                )}
                {scores.bankruptcy_detected && (
                  <li className="text-red-600 font-medium">• Indicateur de faillite détecté</li>
                )}
                {scores.microloans_detected && (
                  <li className="text-orange-600">• Prêts rapides détectés</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
