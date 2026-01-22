/**
 * Logger utility pour API et Worker
 * Fournit des logs structurés avec timestamps et contexte
 */

// ============================================================================
// Types
// ============================================================================

type LogLevel = 'info' | 'warning' | 'error';
type LogStage = string; // Ex: 'AUTH', 'DB', 'METRICS', 'SCORE', etc.

interface LogData {
  timestamp: string;
  [key: string]: any;
}

// ============================================================================
// APILogger - Pour les routes API Next.js
// ============================================================================

export class APILogger {
  private static requestId: string = '';

  /**
   * Démarre le logging pour une requête API
   * Génère un request ID unique pour tracer toute la requête
   */
  static startRequest(req: Request): string {
    const requestId = crypto.randomUUID().slice(0, 8);
    this.requestId = requestId;

    const url = new URL(req.url);
    console.log(`[API] [${requestId}] ► ${req.method} ${url.pathname}`, {
      timestamp: new Date().toISOString(),
      headers: {
        origin: req.headers.get('origin'),
        authorization: req.headers.get('authorization')?.slice(0, 20) + '...',
        'content-type': req.headers.get('content-type')
      }
    });

    return requestId;
  }

  /**
   * Log une étape de traitement
   */
  static log(stage: LogStage, message: string, data?: Record<string, any>): void {
    console.log(`[API] [${this.requestId}] [${stage}] ${message}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Log une erreur
   */
  static error(stage: LogStage, message: string, error: Error): void {
    console.error(`[API] [${this.requestId}] [${stage}] ❌ ${message}`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * Log un warning
   */
  static warn(stage: LogStage, message: string, data?: Record<string, any>): void {
    console.warn(`[API] [${this.requestId}] [${stage}] ⚠️ ${message}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Termine le logging d'une requête avec status et durée
   */
  static endRequest(status: number, duration: number): void {
    const emoji = status >= 200 && status < 300 ? '✅' : '❌';
    console.log(`[API] [${this.requestId}] ◄ ${emoji} ${status} (${Math.round(duration)}ms)`);
  }

  /**
   * Log une performance metric
   */
  static perf(operation: string, duration: number, data?: Record<string, any>): void {
    console.log(`[API] [${this.requestId}] [PERF] ${operation}: ${Math.round(duration)}ms`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

// ============================================================================
// WorkerLogger - Pour le background worker
// ============================================================================

export class WorkerLogger {
  private jobId: string;
  private analysisId: string;

  constructor(jobId: string, analysisId: string) {
    this.jobId = jobId;
    this.analysisId = analysisId;
  }

  /**
   * Log une étape de traitement du worker
   */
  log(stage: LogStage, message: string, data?: Record<string, any>): void {
    console.log(`[Worker] [Job:${this.jobId}] [${stage}] ${message}`, {
      timestamp: new Date().toISOString(),
      analysis_id: this.analysisId,
      ...data
    });
  }

  /**
   * Log une erreur du worker
   */
  error(stage: LogStage, message: string, error: Error): void {
    console.error(`[Worker] [Job:${this.jobId}] [${stage}] ❌ ${message}`, {
      timestamp: new Date().toISOString(),
      analysis_id: this.analysisId,
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * Log un warning du worker
   */
  warn(stage: LogStage, message: string, data?: Record<string, any>): void {
    console.warn(`[Worker] [Job:${this.jobId}] [${stage}] ⚠️ ${message}`, {
      timestamp: new Date().toISOString(),
      analysis_id: this.analysisId,
      ...data
    });
  }

  /**
   * Log une performance metric
   */
  perf(operation: string, duration: number, data?: Record<string, any>): void {
    console.log(`[Worker] [Job:${this.jobId}] [PERF] ${operation}: ${Math.round(duration)}ms`, {
      timestamp: new Date().toISOString(),
      analysis_id: this.analysisId,
      ...data
    });
  }

  /**
   * Log le succès d'un job avec timing total
   */
  success(totalDuration: number, data?: Record<string, any>): void {
    console.log(`[Worker] [Job:${this.jobId}] ✅ COMPLETED (${Math.round(totalDuration)}ms)`, {
      timestamp: new Date().toISOString(),
      analysis_id: this.analysisId,
      ...data
    });
  }
}

// ============================================================================
// ExtensionLogger - Pour l'extension Chrome (à utiliser dans content-script.js)
// ============================================================================

/**
 * Configuration pour le logger de l'extension Chrome
 * À utiliser dans le content-script.js
 */
export const ExtensionLoggerConfig = {
  enabled: true,
  prefix: '[IBV-Crawler-V2]',

  log: (stage: string, message: string, data: Record<string, any> = {}) => {
    if (!ExtensionLoggerConfig.enabled) return;
    console.log(`${ExtensionLoggerConfig.prefix} [${stage}] ${message}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  },

  error: (stage: string, message: string, error: Error) => {
    console.error(`${ExtensionLoggerConfig.prefix} [${stage}] ❌ ${message}`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
  },

  timing: (stage: string, duration: number) => {
    console.log(`${ExtensionLoggerConfig.prefix} [${stage}] ⏱️ ${Math.round(duration)}ms`);
  }
};

// ============================================================================
// Performance Tracking Helpers
// ============================================================================

/**
 * Helper pour mesurer la performance d'une opération async
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  logger?: WorkerLogger
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - startTime;

    if (logger) {
      logger.perf(operation, duration);
    }

    return { result, duration };
  } catch (error) {
    const duration = performance.now() - startTime;

    if (logger) {
      logger.perf(operation, duration, { error: true });
    }

    throw error;
  }
}

/**
 * Helper pour mesurer la performance d'une opération sync
 */
export function measurePerformanceSync<T>(
  operation: string,
  fn: () => T,
  logger?: WorkerLogger
): { result: T; duration: number } {
  const startTime = performance.now();

  try {
    const result = fn();
    const duration = performance.now() - startTime;

    if (logger) {
      logger.perf(operation, duration);
    }

    return { result, duration };
  } catch (error) {
    const duration = performance.now() - startTime;

    if (logger) {
      logger.perf(operation, duration, { error: true });
    }

    throw error;
  }
}

// ============================================================================
// Structured Logging to Database (Optional - pour monitoring avancé)
// ============================================================================

interface SystemLog {
  level: LogLevel;
  component: 'extension' | 'api' | 'worker';
  stage: string;
  message: string;
  data?: Record<string, any>;
  error?: string;
  request_id?: string;
  analysis_id?: string;
}

/**
 * Sauvegarde un log dans la table system_logs (si la table existe)
 * Utilisé pour monitoring et debugging avancé
 */
export async function saveSystemLog(
  log: SystemLog,
  supabase: any
): Promise<void> {
  try {
    await supabase.from('system_logs').insert({
      level: log.level,
      component: log.component,
      stage: log.stage,
      message: log.message,
      data: log.data || {},
      error: log.error,
      request_id: log.request_id,
      analysis_id: log.analysis_id,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // Fail silently - logging shouldn't break the app
    console.error('Failed to save system log:', error);
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  APILogger,
  WorkerLogger,
  ExtensionLoggerConfig,
  measurePerformance,
  measurePerformanceSync,
  saveSystemLog
};
