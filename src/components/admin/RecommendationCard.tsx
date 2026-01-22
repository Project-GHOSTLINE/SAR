'use client'

import { CheckCircle, XCircle, AlertTriangle, DollarSign, Info } from 'lucide-react'
import type { AnalysisRecommendation, RedFlag } from '@/types/analysis'

interface RecommendationCardProps {
  recommendation: AnalysisRecommendation | null
  isLoading?: boolean
}

/**
 * Composant pour afficher la recommandation de prêt
 */
export default function RecommendationCard({ recommendation, isLoading = false }: RecommendationCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!recommendation) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Recommandation non disponible
        </h3>
        <p className="text-sm text-gray-500">
          L'analyse automatique n'a pas encore généré de recommandation
        </p>
      </div>
    )
  }

  // Configuration visuelle selon le type de recommandation
  const config = {
    approve: {
      icon: CheckCircle,
      title: 'Approbation Recommandée',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      iconColor: 'text-green-600',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-800'
    },
    decline: {
      icon: XCircle,
      title: 'Déclinaison Recommandée',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      iconColor: 'text-red-600',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800'
    },
    review: {
      icon: AlertTriangle,
      title: 'Revue Manuelle Requise',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      iconColor: 'text-yellow-600',
      badgeBg: 'bg-yellow-100',
      badgeText: 'text-yellow-800'
    }
  }

  const currentConfig = config[recommendation.recommendation]
  const Icon = currentConfig.icon

  // Fonction pour déterminer la sévérité visuelle d'un red flag
  const getSeverityBadge = (severity: RedFlag['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  const getSeverityLabel = (severity: RedFlag['severity']) => {
    switch (severity) {
      case 'critical': return 'Critique'
      case 'high': return 'Élevé'
      case 'medium': return 'Moyen'
      case 'low': return 'Faible'
    }
  }

  return (
    <div className={`rounded-lg shadow-sm p-6 border-l-4 ${currentConfig.borderColor} ${currentConfig.bgColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Icon className={`w-8 h-8 ${currentConfig.iconColor}`} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {currentConfig.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentConfig.badgeBg} ${currentConfig.badgeText}`}>
                {recommendation.recommendation.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">
                Confiance: {Math.round(recommendation.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Montant maximum */}
        {recommendation.max_loan_amount > 0 && (
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Montant max.</div>
            <div className="flex items-baseline">
              <DollarSign className="w-5 h-5 text-gray-700 mr-0.5" />
              <span className="text-2xl font-bold text-gray-900">
                {recommendation.max_loan_amount.toLocaleString('fr-CA')}
              </span>
            </div>
            <div className="text-xs text-gray-500">CAD</div>
          </div>
        )}
      </div>

      {/* Raisonnement */}
      <div className="mb-4 p-4 bg-white rounded-md border border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-2">Justification:</div>
        <p className="text-sm text-gray-600 leading-relaxed">
          {recommendation.reasoning}
        </p>
      </div>

      {/* Red Flags */}
      {recommendation.red_flags && recommendation.red_flags.length > 0 && (
        <div>
          <div className="flex items-center mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
            <h4 className="text-sm font-semibold text-gray-900">
              Alertes Détectées ({recommendation.red_flags.length})
            </h4>
          </div>

          <div className="space-y-2">
            {recommendation.red_flags.map((flag, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-white rounded-md border border-gray-200"
              >
                {/* Type et sévérité */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getSeverityBadge(flag.severity)}`}>
                    {flag.type}
                  </span>
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {flag.description}
                    </span>
                    {flag.count > 1 && (
                      <span className="text-xs text-gray-500">
                        ({flag.count}×)
                      </span>
                    )}
                  </div>
                  {flag.impact && (
                    <p className="text-xs text-gray-600">
                      {flag.impact}
                    </p>
                  )}
                </div>

                {/* Badge de sévérité */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadge(flag.severity)}`}>
                    {getSeverityLabel(flag.severity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions suggérées */}
      <div className="mt-4 pt-4 border-t border-gray-300">
        <div className="text-xs text-gray-500 mb-2">Actions suggérées:</div>
        <div className="space-y-1">
          {recommendation.recommendation === 'approve' && (
            <>
              <div className="text-sm text-gray-700">
                ✓ Approuver le prêt jusqu'à {recommendation.max_loan_amount} CAD
              </div>
              <div className="text-sm text-gray-700">
                ✓ Vérifier les documents d'identité
              </div>
              {recommendation.red_flags.length > 0 && (
                <div className="text-sm text-gray-700">
                  ⚠ Revoir les alertes avant l'approbation finale
                </div>
              )}
            </>
          )}

          {recommendation.recommendation === 'review' && (
            <>
              <div className="text-sm text-gray-700">
                📋 Revue manuelle complète requise
              </div>
              <div className="text-sm text-gray-700">
                📞 Contact avec le client pour clarification
              </div>
              <div className="text-sm text-gray-700">
                💰 Évaluer un montant inférieur ({Math.round(recommendation.max_loan_amount * 0.7)} CAD)
              </div>
            </>
          )}

          {recommendation.recommendation === 'decline' && (
            <>
              <div className="text-sm text-gray-700">
                ✗ Décliner la demande de prêt
              </div>
              <div className="text-sm text-gray-700">
                📧 Envoyer un email de déclinaison avec explication
              </div>
              {recommendation.max_loan_amount > 0 && (
                <div className="text-sm text-gray-700">
                  💡 Offre alternative possible: {recommendation.max_loan_amount} CAD
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
