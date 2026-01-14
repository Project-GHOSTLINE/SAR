/**
 * Système automatique de chargement de mémoire pour Claude
 * Charge automatiquement le contexte au démarrage
 */

export interface ClaudeMemory {
  category: string;
  key: string;
  content: any;
  context: string;
  importance: number;
  tags: string[];
}

export interface ClaudeContext {
  project: string;
  top_memories: ClaudeMemory[];
  recent_sessions: any[];
  docs_count: number;
  insights_count: number;
  pending_questions: number;
}

/**
 * Charge le contexte complet du projet
 */
export async function loadClaudeContext(project: string = 'sar'): Promise<ClaudeContext | null> {
  try {
    const response = await fetch(`/api/memory/context?project=${project}`);
    const data = await response.json();

    if (data.success) {
      return data.context;
    }
    return null;
  } catch (error) {
    console.error('Erreur chargement contexte Claude:', error);
    return null;
  }
}

/**
 * Charge des mémoires spécifiques par catégorie
 */
export async function recallMemory(
  project: string = 'sar',
  category?: string,
  search?: string
): Promise<ClaudeMemory[]> {
  try {
    let url = `/api/memory/recall?project=${project}`;
    if (category) url += `&category=${category}`;
    if (search) url += `&search=${search}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      return data.memories || [];
    }
    return [];
  } catch (error) {
    console.error('Erreur recall mémoire:', error);
    return [];
  }
}

/**
 * Stocke une nouvelle mémoire
 */
export async function storeMemory(memory: {
  project_name: string;
  category: string;
  key: string;
  content: any;
  context: string;
  importance?: number;
  tags?: string[];
}): Promise<boolean> {
  try {
    const response = await fetch('/api/memory/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory)
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Erreur stockage mémoire:', error);
    return false;
  }
}

/**
 * Enregistre une session de travail
 */
export async function recordSession(session: {
  project_name: string;
  summary: string;
  tasks_completed: string[];
  learnings?: string[];
  next_steps?: string[];
  files_modified?: string[];
}): Promise<boolean> {
  try {
    const response = await fetch('/api/memory/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Erreur enregistrement session:', error);
    return false;
  }
}

/**
 * Formate le contexte pour affichage humain
 */
export function formatContextForDisplay(context: ClaudeContext): string {
  let output = '# 🧠 Contexte du Projet SAR\n\n';

  // Stack Technique
  const stack = context.top_memories?.find(m => m.category === 'stack');
  if (stack) {
    output += '## 💻 Stack Technique\n';
    output += `- Frontend: ${stack.content.frontend?.join(', ')}\n`;
    output += `- Backend: ${stack.content.backend?.join(', ')}\n`;
    output += `- Database: ${stack.content.database?.join(', ')}\n`;
    output += `- Services: ${stack.content.services?.join(', ')}\n\n`;
  }

  // Déploiement
  const deployment = context.top_memories?.find(m => m.category === 'deployment');
  if (deployment) {
    output += '## 🚀 Workflow de Déploiement\n';
    deployment.content.steps?.forEach((step: string, i: number) => {
      output += `${i + 1}. ${step}\n`;
    });
    output += `\n⚠️ Important: ${deployment.content.important}\n\n`;
  }

  // URLs
  const urls = context.top_memories?.find(m => m.category === 'urls');
  if (urls) {
    output += '## 🌐 URLs de Production\n';
    Object.entries(urls.content).forEach(([key, value]) => {
      output += `- ${key}: ${value}\n`;
    });
    output += '\n';
  }

  // Credentials
  const security = context.top_memories?.find(m => m.category === 'security');
  if (security) {
    output += '## 🔐 Credentials\n';
    output += `- Master ENV: ${security.content.master_env}\n`;
    output += `- Documentation: ${security.content.credentials_doc}\n`;
    output += `- APIs Doc: ${security.content.apis_doc}\n\n`;
  }

  // Stats
  output += '## 📊 Statistiques\n';
  output += `- Mémoires stockées: ${context.top_memories?.length || 0}\n`;
  output += `- Documents lus: ${context.docs_count || 0}\n`;
  output += `- Sessions: ${context.recent_sessions?.length || 0}\n`;

  return output;
}

/**
 * Auto-loader au démarrage de l'application
 */
export async function autoLoadMemoryOnStartup() {
  if (typeof window === 'undefined') return; // Server-side skip

  try {
    const context = await loadClaudeContext('sar');
    if (context) {
    }
  } catch (error) {
    console.error('Erreur auto-load mémoire:', error);
  }
}
