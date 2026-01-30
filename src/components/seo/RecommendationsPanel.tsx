"use client";

import { SeoKpis } from "./types";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface Recommendation {
  level: "CRIT" | "WARN" | "OK";
  title: string;
  description: string;
  metric?: string;
  value?: string | number;
  action?: string;
}

interface RecommendationsPanelProps {
  kpis: SeoKpis;
}

export default function RecommendationsPanel({
  kpis,
}: RecommendationsPanelProps) {
  const recommendations: Recommendation[] = [];

  // ========================================
  // SPEED INSIGHTS RECOMMENDATIONS
  // ========================================

  if (kpis.speed.lcp_p75) {
    // LCP Critical (> 4000ms)
    if (kpis.speed.lcp_p75 >= 4000) {
      recommendations.push({
        level: "CRIT",
        title: "LCP Critique",
        description: `Largest Contentful Paint à ${kpis.speed.lcp_p75}ms (seuil: 2500ms)`,
        metric: "LCP",
        value: `${kpis.speed.lcp_p75}ms`,
        action:
          "Optimiser images, preload fonts, réduire blocking scripts",
      });
    }
    // LCP Warning (> 2500ms)
    else if (kpis.speed.lcp_p75 >= 2500) {
      recommendations.push({
        level: "WARN",
        title: "LCP à surveiller",
        description: `Largest Contentful Paint à ${kpis.speed.lcp_p75}ms (proche du seuil)`,
        metric: "LCP",
        value: `${kpis.speed.lcp_p75}ms`,
        action: "Vérifier les images et ressources critiques",
      });
    }
    // LCP OK
    else {
      recommendations.push({
        level: "OK",
        title: "LCP performant",
        description: `Largest Contentful Paint à ${kpis.speed.lcp_p75}ms`,
        metric: "LCP",
        value: `${kpis.speed.lcp_p75}ms`,
      });
    }
  }

  if (kpis.speed.inp_p75) {
    // INP Critical (> 500ms)
    if (kpis.speed.inp_p75 >= 500) {
      recommendations.push({
        level: "CRIT",
        title: "INP Critique",
        description: `Interaction to Next Paint à ${kpis.speed.inp_p75}ms (seuil: 200ms)`,
        metric: "INP",
        value: `${kpis.speed.inp_p75}ms`,
        action: "Réduire le JavaScript, optimiser event handlers",
      });
    }
    // INP Warning (> 200ms)
    else if (kpis.speed.inp_p75 >= 200) {
      recommendations.push({
        level: "WARN",
        title: "INP à améliorer",
        description: `Interaction to Next Paint à ${kpis.speed.inp_p75}ms`,
        metric: "INP",
        value: `${kpis.speed.inp_p75}ms`,
        action: "Profiler les interactions longues",
      });
    }
    // INP OK
    else {
      recommendations.push({
        level: "OK",
        title: "INP réactif",
        description: `Interaction to Next Paint à ${kpis.speed.inp_p75}ms`,
        metric: "INP",
        value: `${kpis.speed.inp_p75}ms`,
      });
    }
  }

  if (kpis.speed.cls_p75) {
    // CLS Critical (> 0.25)
    if (kpis.speed.cls_p75 >= 0.25) {
      recommendations.push({
        level: "CRIT",
        title: "CLS Critique",
        description: `Cumulative Layout Shift à ${kpis.speed.cls_p75.toFixed(3)} (seuil: 0.1)`,
        metric: "CLS",
        value: kpis.speed.cls_p75.toFixed(3),
        action: "Fixer dimensions images/iframes, éviter content injection",
      });
    }
    // CLS Warning (> 0.1)
    else if (kpis.speed.cls_p75 >= 0.1) {
      recommendations.push({
        level: "WARN",
        title: "CLS instable",
        description: `Cumulative Layout Shift à ${kpis.speed.cls_p75.toFixed(3)}`,
        metric: "CLS",
        value: kpis.speed.cls_p75.toFixed(3),
        action: "Vérifier les shifts de layout au chargement",
      });
    }
    // CLS OK
    else {
      recommendations.push({
        level: "OK",
        title: "CLS stable",
        description: `Cumulative Layout Shift à ${kpis.speed.cls_p75.toFixed(3)}`,
        metric: "CLS",
        value: kpis.speed.cls_p75.toFixed(3),
      });
    }
  }

  // Mobile vs Desktop gap
  if (kpis.speed.mobile_lcp && kpis.speed.desktop_lcp) {
    const gap = kpis.speed.mobile_lcp - kpis.speed.desktop_lcp;
    if (gap > 1000) {
      recommendations.push({
        level: "WARN",
        title: "Écart Mobile/Desktop élevé",
        description: `LCP mobile (${kpis.speed.mobile_lcp}ms) > desktop (${kpis.speed.desktop_lcp}ms) de ${gap}ms`,
        metric: "Mobile Gap",
        value: `+${gap}ms`,
        action: "Optimiser spécifiquement pour mobile (images adaptatives)",
      });
    }
  }

  // ========================================
  // SEO RECOMMENDATIONS
  // ========================================

  // GSC Position
  if (kpis.gsc.position > 0) {
    if (kpis.gsc.position > 20) {
      recommendations.push({
        level: "WARN",
        title: "Position SEO faible",
        description: `Position moyenne ${kpis.gsc.position.toFixed(1)} (page 2+)`,
        metric: "GSC Position",
        value: kpis.gsc.position.toFixed(1),
        action: "Améliorer contenu, backlinks, technical SEO",
      });
    } else if (kpis.gsc.position <= 10) {
      recommendations.push({
        level: "OK",
        title: "Position SEO solide",
        description: `Position moyenne ${kpis.gsc.position.toFixed(1)} (page 1)`,
        metric: "GSC Position",
        value: kpis.gsc.position.toFixed(1),
      });
    }
  }

  // GSC CTR
  if (kpis.gsc.ctr > 0) {
    if (kpis.gsc.ctr < 0.02) {
      recommendations.push({
        level: "WARN",
        title: "CTR faible",
        description: `Click-through rate à ${(kpis.gsc.ctr * 100).toFixed(2)}% (< 2%)`,
        metric: "GSC CTR",
        value: `${(kpis.gsc.ctr * 100).toFixed(2)}%`,
        action: "Améliorer title tags et meta descriptions",
      });
    } else if (kpis.gsc.ctr >= 0.05) {
      recommendations.push({
        level: "OK",
        title: "CTR performant",
        description: `Click-through rate à ${(kpis.gsc.ctr * 100).toFixed(2)}%`,
        metric: "GSC CTR",
        value: `${(kpis.gsc.ctr * 100).toFixed(2)}%`,
      });
    }
  }

  // ========================================
  // GA4 RECOMMENDATIONS
  // ========================================

  // Bounce Rate
  if (kpis.ga4.bounce_rate > 0) {
    if (kpis.ga4.bounce_rate > 0.7) {
      recommendations.push({
        level: "WARN",
        title: "Taux de rebond élevé",
        description: `${Math.round(kpis.ga4.bounce_rate * 100)}% des sessions rebondissent`,
        metric: "Bounce Rate",
        value: `${Math.round(kpis.ga4.bounce_rate * 100)}%`,
        action: "Améliorer UX, contenu, vitesse de chargement",
      });
    } else if (kpis.ga4.bounce_rate <= 0.4) {
      recommendations.push({
        level: "OK",
        title: "Taux de rebond faible",
        description: `${Math.round(kpis.ga4.bounce_rate * 100)}% de rebond`,
        metric: "Bounce Rate",
        value: `${Math.round(kpis.ga4.bounce_rate * 100)}%`,
      });
    }
  }

  // Conversion Rate
  if (kpis.ga4.sessions > 0 && kpis.ga4.conversions > 0) {
    const convRate = (kpis.ga4.conversions / kpis.ga4.sessions) * 100;
    if (convRate < 30) {
      recommendations.push({
        level: "WARN",
        title: "Taux de conversion à améliorer",
        description: `${convRate.toFixed(1)}% de conversion (conversions/sessions)`,
        metric: "Conv Rate",
        value: `${convRate.toFixed(1)}%`,
        action: "Optimiser funnel, CTA, formulaires",
      });
    } else if (convRate >= 50) {
      recommendations.push({
        level: "OK",
        title: "Excellent taux de conversion",
        description: `${convRate.toFixed(1)}% de conversion`,
        metric: "Conv Rate",
        value: `${convRate.toFixed(1)}%`,
      });
    }
  }

  // Sort: CRIT > WARN > OK
  const sortedRecs = recommendations.sort((a, b) => {
    const order = { CRIT: 0, WARN: 1, OK: 2 };
    return order[a.level] - order[b.level];
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Recommandations
      </h3>

      <div className="space-y-3">
        {sortedRecs.map((rec, i) => (
          <div
            key={i}
            className={`border-l-4 rounded-r-lg p-4 ${
              rec.level === "CRIT"
                ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                : rec.level === "WARN"
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
                : "border-green-500 bg-green-50 dark:bg-green-900/10"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {rec.level === "CRIT" ? (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : rec.level === "WARN" ? (
                  <InformationCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4
                    className={`font-semibold ${
                      rec.level === "CRIT"
                        ? "text-red-900 dark:text-red-200"
                        : rec.level === "WARN"
                        ? "text-yellow-900 dark:text-yellow-200"
                        : "text-green-900 dark:text-green-200"
                    }`}
                  >
                    {rec.title}
                  </h4>
                  {rec.metric && (
                    <span className="text-xs px-2 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded">
                      {rec.metric}
                    </span>
                  )}
                </div>
                <p
                  className={`text-sm mb-2 ${
                    rec.level === "CRIT"
                      ? "text-red-700 dark:text-red-300"
                      : rec.level === "WARN"
                      ? "text-yellow-700 dark:text-yellow-300"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  {rec.description}
                </p>
                {rec.action && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                    → {rec.action}
                  </p>
                )}
              </div>

              {/* Value Badge */}
              {rec.value && (
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${
                      rec.level === "CRIT"
                        ? "bg-red-600 text-white"
                        : rec.level === "WARN"
                        ? "bg-yellow-600 text-white"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {rec.value}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600 dark:text-gray-400">
            {sortedRecs.filter((r) => r.level === "CRIT").length} critique
            {sortedRecs.filter((r) => r.level === "CRIT").length > 1 ? "s" : ""}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {sortedRecs.filter((r) => r.level === "WARN").length} avertissement
            {sortedRecs.filter((r) => r.level === "WARN").length > 1 ? "s" : ""}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {sortedRecs.filter((r) => r.level === "OK").length} OK
          </span>
        </div>
      </div>
    </div>
  );
}
