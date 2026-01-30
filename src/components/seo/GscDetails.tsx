"use client";

interface GscQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscDetailsProps {
  topQueries: GscQuery[];
  topPages: GscPage[];
}

export default function GscDetails({ topQueries, topPages }: GscDetailsProps) {
  if (
    (!topQueries || topQueries.length === 0) &&
    (!topPages || topPages.length === 0)
  ) {
    return (
      <div className="bg-gray-50 dark:bg-zinc-900 border border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Aucune donnée GSC détaillée disponible
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Queries */}
      {topQueries && topQueries.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Top Queries SEO
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                    Query
                  </th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                    Pos
                  </th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                    Clicks
                  </th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                    CTR
                  </th>
                </tr>
              </thead>
              <tbody>
                {topQueries.slice(0, 10).map((query, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-2 px-3 text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-600">
                          {i + 1}.
                        </span>
                        <span className="truncate max-w-[200px]">
                          {query.query}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          query.position <= 3
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : query.position <= 10
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-400"
                        }`}
                      >
                        #{query.position.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-gray-900 dark:text-white font-medium">
                      {query.clicks}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                      {(query.ctr * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Pages */}
      {topPages && topPages.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Top Pages SEO
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                    Page
                  </th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                    Clicks
                  </th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                    Impr
                  </th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                    CTR
                  </th>
                </tr>
              </thead>
              <tbody>
                {topPages.slice(0, 10).map((page, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-2 px-3 text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-600">
                          {i + 1}.
                        </span>
                        <span className="truncate max-w-[250px] text-xs font-mono">
                          {page.page.replace("https://solutionargentrapide.ca", "")}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-gray-900 dark:text-white font-medium">
                      {page.clicks}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                      {page.impressions}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                      {(page.ctr * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
