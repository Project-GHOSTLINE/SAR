/**
 * QuickBooks Connection Manager
 * Gère la connexion continue et le refresh automatique des tokens
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  realm_id: string;
}

interface ConnectionStatus {
  connected: boolean;
  realmId: string | null;
  companyName: string | null;
  expiresAt: string | null;
  needsRefresh: boolean;
  autoRefreshEnabled: boolean;
  lastRefresh: string | null;
  error: string | null;
}

export class QuickBooksConnectionManager {
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private readonly REFRESH_BUFFER_HOURS = 1; // Rafraîchir 1h avant expiration
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // Vérifier toutes les 5 minutes

  /**
   * Démarre le monitoring automatique de la connexion
   */
  async startAutoRefresh(): Promise<void> {
    console.log('🔄 Starting QuickBooks auto-refresh...');

    // Vérifier immédiatement
    await this.checkAndRefreshIfNeeded();

    // Ensuite vérifier périodiquement
    this.refreshInterval = setInterval(async () => {
      await this.checkAndRefreshIfNeeded();
    }, this.CHECK_INTERVAL_MS);

    console.log('✅ QuickBooks auto-refresh started');
  }

  /**
   * Arrête le monitoring automatique
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('🛑 QuickBooks auto-refresh stopped');
    }
  }

  /**
   * Vérifie et rafraîchit les tokens si nécessaire
   */
  async checkAndRefreshIfNeeded(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('⏳ Refresh already in progress, skipping...');
      return false;
    }

    try {
      const status = await this.getConnectionStatus();

      if (!status.connected) {
        console.log('❌ QuickBooks not connected');
        return false;
      }

      if (status.needsRefresh) {
        console.log('🔄 Token needs refresh, refreshing...');
        return await this.refreshTokens();
      }

      console.log('✅ Token is still valid, no refresh needed');
      return true;
    } catch (error) {
      console.error('❌ Error checking connection:', error);
      return false;
    }
  }

  /**
   * Récupère le statut actuel de la connexion
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      const { data: tokens, error } = await supabase
        .from('quickbooks_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !tokens) {
        return {
          connected: false,
          realmId: null,
          companyName: null,
          expiresAt: null,
          needsRefresh: false,
          autoRefreshEnabled: this.refreshInterval !== null,
          lastRefresh: null,
          error: error?.message || null
        };
      }

      const expiresAt = new Date(tokens.expires_at);
      const now = new Date();
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      return {
        connected: true,
        realmId: tokens.realm_id,
        companyName: tokens.company_name || null,
        expiresAt: tokens.expires_at,
        needsRefresh: hoursUntilExpiry < this.REFRESH_BUFFER_HOURS,
        autoRefreshEnabled: this.refreshInterval !== null,
        lastRefresh: tokens.updated_at,
        error: null
      };
    } catch (error: any) {
      return {
        connected: false,
        realmId: null,
        companyName: null,
        expiresAt: null,
        needsRefresh: false,
        autoRefreshEnabled: this.refreshInterval !== null,
        lastRefresh: null,
        error: error.message
      };
    }
  }

  /**
   * Rafraîchit les tokens QuickBooks
   */
  async refreshTokens(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('⏳ Refresh already in progress');
      return false;
    }

    this.isRefreshing = true;

    try {
      console.log('🔄 Refreshing QuickBooks tokens...');

      // Récupérer le refresh token actuel
      const { data: currentTokens, error: fetchError } = await supabase
        .from('quickbooks_tokens')
        .select('refresh_token, realm_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !currentTokens) {
        throw new Error('No refresh token found');
      }

      // Appeler l'API Intuit pour rafraîchir
      const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.INTUIT_CLIENT_ID}:${process.env.INTUIT_CLIENT_SECRET}`
          ).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: currentTokens.refresh_token
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Token refresh failed: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const newTokens = await response.json();

      // Calculer la nouvelle date d'expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + newTokens.expires_in);

      // Sauvegarder les nouveaux tokens
      const { error: updateError } = await supabase
        .from('quickbooks_tokens')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('realm_id', currentTokens.realm_id);

      if (updateError) {
        throw new Error(`Failed to save new tokens: ${updateError.message}`);
      }

      console.log('✅ Tokens refreshed successfully');
      console.log(`   New expiry: ${expiresAt.toLocaleString()}`);

      return true;
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error.message);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Force un refresh immédiat
   */
  async forceRefresh(): Promise<boolean> {
    console.log('⚡ Force refreshing tokens...');
    return await this.refreshTokens();
  }

  /**
   * Teste la connexion en faisant un appel API
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { data: tokens, error } = await supabase
        .from('quickbooks_tokens')
        .select('access_token, realm_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !tokens) {
        return {
          success: false,
          message: 'No connection found'
        };
      }

      // Appel API simple pour tester
      const testUrl = process.env.INTUIT_ENVIRONMENT === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com';

      const response = await fetch(
        `${testUrl}/v3/company/${tokens.realm_id}/companyinfo/${tokens.realm_id}`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `API call failed: ${response.status}`,
          data: errorData
        };
      }

      const data = await response.json();

      return {
        success: true,
        message: 'Connection is active',
        data: {
          companyName: data.CompanyInfo?.CompanyName,
          legalName: data.CompanyInfo?.LegalName,
          country: data.CompanyInfo?.Country
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Récupère les informations de la compagnie connectée
   */
  async getCompanyInfo(): Promise<any> {
    try {
      const { data: tokens } = await supabase
        .from('quickbooks_tokens')
        .select('access_token, realm_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!tokens) {
        return null;
      }

      const testUrl = process.env.INTUIT_ENVIRONMENT === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com';

      const response = await fetch(
        `${testUrl}/v3/company/${tokens.realm_id}/companyinfo/${tokens.realm_id}`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.CompanyInfo;
    } catch (error) {
      console.error('Error fetching company info:', error);
      return null;
    }
  }

  /**
   * Déconnecte QuickBooks
   */
  async disconnect(): Promise<boolean> {
    try {
      console.log('🔌 Disconnecting QuickBooks...');

      // Arrêter l'auto-refresh
      this.stopAutoRefresh();

      // Supprimer les tokens de la DB
      const { error } = await supabase
        .from('quickbooks_tokens')
        .delete()
        .neq('realm_id', ''); // Delete all

      if (error) {
        throw new Error(`Failed to delete tokens: ${error.message}`);
      }

      console.log('✅ QuickBooks disconnected');
      return true;
    } catch (error: any) {
      console.error('❌ Disconnect failed:', error.message);
      return false;
    }
  }
}

// Instance singleton
let connectionManager: QuickBooksConnectionManager | null = null;

export function getConnectionManager(): QuickBooksConnectionManager {
  if (!connectionManager) {
    connectionManager = new QuickBooksConnectionManager();
  }
  return connectionManager;
}
