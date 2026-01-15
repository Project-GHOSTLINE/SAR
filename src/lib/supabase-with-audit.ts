/**
 * Supabase Client avec Audit Trail
 *
 * Ce wrapper configure automatiquement le tracking audit pour tracer
 * qui fait quelles modifications dans la base de données.
 */

import { createClient } from '@supabase/supabase-js'

interface AuditContext {
  userId?: string
  userEmail: string
  userName?: string
}

/**
 * Créer un client Supabase avec audit tracking activé
 *
 * @example
 * const supabase = createSupabaseWithAudit({
 *   userEmail: session.user.email,
 *   userId: session.user.id
 * })
 *
 * // Toutes les modifications seront tracées dans audit_log
 * await supabase.from('clients').update({ first_name: 'John' }).eq('id', clientId)
 */
export function createSupabaseWithAudit(context: AuditContext) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Configurer le contexte utilisateur pour audit
  // Les triggers audit vont lire cette valeur via current_setting('app.current_user')
  const auditInfo = context.userName
    ? `${context.userEmail} (${context.userName})`
    : context.userEmail

  // Note: Cette configuration doit être faite AVANT chaque opération
  // car elle est session-scoped
  return {
    client: supabase,
    async withAudit<T>(operation: (client: typeof supabase) => Promise<T>): Promise<T> {
      // Configurer le contexte audit
      await supabase.rpc('set_config', {
        setting_name: 'app.current_user',
        new_value: auditInfo,
        is_local: true
      })

      // Exécuter l'opération
      return await operation(supabase)
    }
  }
}

/**
 * Hook React pour utiliser Supabase avec audit
 *
 * @example
 * function ClientEditor() {
 *   const { withAudit } = useSupabaseWithAudit()
 *
 *   const updateClient = async () => {
 *     await withAudit(async (supabase) => {
 *       await supabase.from('clients').update({ ... }).eq('id', clientId)
 *     })
 *   }
 * }
 */
export function useSupabaseWithAudit() {
  // TODO: Récupérer session utilisateur (NextAuth, Supabase Auth, etc.)
  // const session = useSession()

  const userEmail = 'admin@solutionargentrapide.ca' // TODO: Remplacer par vraie session

  return createSupabaseWithAudit({ userEmail })
}

/**
 * Récupérer l'historique audit d'un client
 *
 * @example
 * const history = await getClientAuditHistory(clientId)
 * console.log(history) // Array of audit events
 */
export async function getClientAuditHistory(clientId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .rpc('get_client_audit_history', { p_client_id: clientId })

  if (error) throw error
  return data
}

/**
 * Types pour audit log
 */
export interface AuditLogEntry {
  audit_id: string
  table_name: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  changed_at: string
  changed_by: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
}
