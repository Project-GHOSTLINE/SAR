/**
 * SAR Cortex × Miro Integration
 * Système de synchronisation intelligent entre SAR Cortex et Miro
 */

export interface MiroConfig {
  accessToken: string
  refreshToken?: string
  clientId?: string
  clientSecret?: string
}

export interface ApiPerformanceData {
  name: string
  url: string
  time: number
  status: number
  success: boolean
  critical: boolean
  timing?: {
    dns: number
    tcp: number
    tls: number
    request: number
    response: number
    total: number
  }
}

export interface BoardLayout {
  categories: {
    [key: string]: {
      x: number
      y: number
      apis: string[]
    }
  }
}

export class MiroCortexSync {
  private accessToken: string
  private baseUrl = 'https://api.miro.com/v2'

  constructor(config: MiroConfig) {
    this.accessToken = config.accessToken
  }

  /**
   * Crée un board "System Architecture Map" avec tous les endpoints
   */
  async createArchitectureBoard(performanceData: ApiPerformanceData[]): Promise<any> {
    try {
      // 1. Créer le board
      const board = await this.createBoard({
        name: `🧠 SAR Architecture - ${new Date().toLocaleDateString('fr-CA')}`,
        description: `Auto-généré par SAR Cortex le ${new Date().toLocaleString('fr-CA')}`,
      })

      console.log(`✅ Board créé: ${board.id}`)

      // 2. Organiser les APIs par catégorie
      const layout = this.organizeApisByCategory(performanceData)

      // 3. Créer les cards pour chaque API
      const cards: any[] = []
      for (const [category, data] of Object.entries(layout.categories)) {
        // Card titre de catégorie
        const categoryCard = await this.createCategoryCard(board.id, category, data.x, data.y)
        cards.push(categoryCard)

        // Cards des APIs dans cette catégorie
        let yOffset = data.y + 200
        for (const apiName of data.apis) {
          const api = performanceData.find(a => a.name === apiName)
          if (api) {
            const apiCard = await this.createApiCard(board.id, api, data.x, yOffset)
            cards.push(apiCard)
            yOffset += 180
          }
        }
      }

      // 4. Créer les connectors entre APIs liées
      await this.createApiConnectors(board.id, performanceData, cards)

      console.log(`✅ ${cards.length} cards créées avec succès`)

      return {
        board,
        cards,
        url: board.viewLink
      }
    } catch (error) {
      console.error('❌ Erreur création board:', error)
      throw error
    }
  }

  /**
   * Met à jour un board existant avec nouvelles données de performance
   */
  async updateBoardRealtime(boardId: string, performanceData: ApiPerformanceData[]): Promise<void> {
    try {
      // Récupérer toutes les cards du board
      const items = await this.getBoardItems(boardId)

      // Mettre à jour chaque card avec nouvelles métriques
      for (const api of performanceData) {
        const existingCard = items.find((item: any) =>
          item.data?.title === api.name
        )

        if (existingCard) {
          await this.updateApiCard(boardId, existingCard.id, api)
        }
      }

      console.log(`✅ Board ${boardId} mis à jour`)
    } catch (error) {
      console.error('❌ Erreur mise à jour board:', error)
      throw error
    }
  }

  /**
   * Crée un board Miro
   */
  private async createBoard(options: { name: string; description: string }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/boards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: options.name,
        description: options.description,
        policy: {
          permissionsPolicy: {
            collaborationToolsStartAccess: 'all_editors',
            copyAccess: 'anyone',
            sharingAccess: 'team_members_with_editing_rights'
          },
          sharingPolicy: {
            access: 'edit',
            inviteToAccountAndBoardLinkAccess: 'editor',
            organizationAccess: 'edit',
            teamAccess: 'edit'
          }
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Miro API Error:', errorText)
      throw new Error(`Erreur création board: ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Crée une card de catégorie (titre de section)
   */
  private async createCategoryCard(
    boardId: string,
    category: string,
    x: number,
    y: number
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/boards/${boardId}/shapes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          shape: 'rectangle',
          content: `<p><strong>${this.getCategoryIcon(category)} ${category}</strong></p>`
        },
        style: {
          fillColor: '#1a1a1a',
          fontFamily: 'arial',
          fontSize: '20',
          textAlign: 'center',
          textAlignVertical: 'middle',
          color: '#ffffff'
        },
        position: { x, y },
        geometry: {
          width: 300,
          height: 80
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Erreur création category card: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Crée une card pour une API
   */
  private async createApiCard(
    boardId: string,
    api: ApiPerformanceData,
    x: number,
    y: number
  ): Promise<any> {
    const color = this.getColorByPerformance(api.time)
    const emoji = this.getEmojiByPerformance(api.time)

    const content = `
      <p><strong>${api.name}</strong></p>
      <p>${emoji} ${api.time}ms</p>
      <p>📍 ${api.url}</p>
      <p>Status: ${api.status}</p>
      ${api.timing ? `
      <p><small>
      DNS: ${api.timing.dns}ms |
      TCP: ${api.timing.tcp}ms<br/>
      Req: ${api.timing.request}ms |
      Res: ${api.timing.response}ms
      </small></p>
      ` : ''}
    `

    const response = await fetch(`${this.baseUrl}/boards/${boardId}/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          title: api.name,
          description: content
        },
        style: {
          cardTheme: color
        },
        position: { x, y },
        geometry: {
          width: 300
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Erreur création API card: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Met à jour une card existante
   */
  private async updateApiCard(
    boardId: string,
    cardId: string,
    api: ApiPerformanceData
  ): Promise<void> {
    const color = this.getColorByPerformance(api.time)
    const emoji = this.getEmojiByPerformance(api.time)

    await fetch(`${this.baseUrl}/boards/${boardId}/cards/${cardId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        style: {
          cardTheme: color
        },
        data: {
          description: `${emoji} ${api.time}ms - Mis à jour: ${new Date().toLocaleTimeString('fr-CA')}`
        }
      })
    })
  }

  /**
   * Crée des connectors entre APIs liées
   */
  private async createApiConnectors(
    boardId: string,
    apis: ApiPerformanceData[],
    cards: any[]
  ): Promise<void> {
    const connections = this.identifyApiConnections(apis)

    for (const connection of connections) {
      const startCard = cards.find(c => c.data?.title === connection.start)
      const endCard = cards.find(c => c.data?.title === connection.end)

      if (startCard && endCard) {
        await this.createConnector(boardId, {
          startItem: startCard.id,
          endItem: endCard.id,
          label: connection.label,
          critical: connection.critical
        })
      }
    }
  }

  /**
   * Crée un connector (ligne) entre deux items
   */
  private async createConnector(
    boardId: string,
    options: {
      startItem: string
      endItem: string
      label: string
      critical: boolean
    }
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/boards/${boardId}/connectors`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startItem: {
          id: options.startItem
        },
        endItem: {
          id: options.endItem
        },
        shape: 'curved',
        style: {
          strokeColor: options.critical ? '#ef4444' : '#3b82f6',
          strokeWidth: options.critical ? '4' : '2',
          strokeStyle: options.critical ? 'normal' : 'normal'
        },
        captions: [
          {
            content: options.label,
            position: 0.5
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Erreur création connector:', error)
      return null
    }

    return response.json()
  }

  /**
   * Récupère tous les items d'un board
   */
  private async getBoardItems(boardId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/boards/${boardId}/items?limit=100`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      }
    })

    if (!response.ok) {
      throw new Error(`Erreur récupération items: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || []
  }

  /**
   * Organise les APIs par catégorie et calcule positions
   */
  private organizeApisByCategory(apis: ApiPerformanceData[]): BoardLayout {
    const categories: { [key: string]: string[] } = {
      'Messages': [],
      'VoPay': [],
      'Analytics': [],
      'Support': [],
      'Downloads': [],
      'Webhooks': [],
      'Autres': []
    }

    // Classifier les APIs
    for (const api of apis) {
      if (api.url.includes('/messages')) {
        categories['Messages'].push(api.name)
      } else if (api.url.includes('/vopay')) {
        categories['VoPay'].push(api.name)
      } else if (api.url.includes('/analytics')) {
        categories['Analytics'].push(api.name)
      } else if (api.url.includes('/support')) {
        categories['Support'].push(api.name)
      } else if (api.url.includes('/download')) {
        categories['Downloads'].push(api.name)
      } else if (api.url.includes('/webhook')) {
        categories['Webhooks'].push(api.name)
      } else {
        categories['Autres'].push(api.name)
      }
    }

    // Calculer positions en grille
    const layout: BoardLayout = { categories: {} }
    let xOffset = 0
    const xSpacing = 400

    for (const [category, apiList] of Object.entries(categories)) {
      if (apiList.length > 0) {
        layout.categories[category] = {
          x: xOffset,
          y: 0,
          apis: apiList
        }
        xOffset += xSpacing
      }
    }

    return layout
  }

  /**
   * Identifie les connexions logiques entre APIs
   */
  private identifyApiConnections(apis: ApiPerformanceData[]): Array<{
    start: string
    end: string
    label: string
    critical: boolean
  }> {
    // Intelligence basée sur la logique métier SAR
    const connections = []

    // Contact Form → Client Analysis
    const contactApi = apis.find(a => a.url.includes('/contact'))
    const analysisApi = apis.find(a => a.url.includes('/contact-analyse'))
    if (contactApi && analysisApi) {
      connections.push({
        start: contactApi.name,
        end: analysisApi.name,
        label: 'Soumet données',
        critical: true
      })
    }

    // Client Analysis → VoPay IBV
    const vopayApi = apis.find(a => a.url.includes('/vopay') && a.url.includes('transactions'))
    if (analysisApi && vopayApi) {
      connections.push({
        start: analysisApi.name,
        end: vopayApi.name,
        label: 'Vérification bancaire',
        critical: true
      })
    }

    // Messages → Analytics
    const messagesApi = apis.find(a => a.url.includes('/messages'))
    const analyticsApi = apis.find(a => a.url.includes('/analytics'))
    if (messagesApi && analyticsApi) {
      connections.push({
        start: messagesApi.name,
        end: analyticsApi.name,
        label: 'Track événements',
        critical: false
      })
    }

    return connections
  }

  /**
   * Retourne couleur selon performance
   */
  private getColorByPerformance(time: number): string {
    if (time < 50) return 'light_green'    // Excellent
    if (time < 150) return 'light_yellow'  // Bon
    if (time < 300) return 'orange'        // Lent
    return 'red'                            // Critique
  }

  /**
   * Retourne emoji selon performance
   */
  private getEmojiByPerformance(time: number): string {
    if (time < 50) return '🟢'
    if (time < 150) return '🟡'
    if (time < 300) return '🟠'
    return '🔴'
  }

  /**
   * Retourne icône selon catégorie
   */
  private getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Messages': '💬',
      'VoPay': '💰',
      'Analytics': '📊',
      'Support': '🔧',
      'Downloads': '📥',
      'Webhooks': '🔗',
      'Autres': '📦'
    }
    return icons[category] || '📦'
  }
}

/**
 * Utilitaire pour obtenir un access token Miro
 */
export async function getMiroAccessToken(code: string, clientId: string, clientSecret: string): Promise<{
  accessToken: string
  refreshToken: string
}> {
  const response = await fetch('https://api.miro.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: process.env.NEXT_PUBLIC_APP_URL + '/api/miro/callback'
    })
  })

  if (!response.ok) {
    throw new Error('Erreur obtention token Miro')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token
  }
}

/**
 * Utilitaire pour rafraîchir un access token Miro
 */
export async function refreshMiroAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch('https://api.miro.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    })
  })

  if (!response.ok) {
    throw new Error('Erreur refresh token Miro')
  }

  const data = await response.json()
  return data.access_token
}
