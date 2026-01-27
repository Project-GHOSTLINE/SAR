/**
 * Click Heatmap Tracker
 *
 * Tracks user clicks (x, y coordinates) for heatmap visualization
 * Similar to Hotjar, Crazy Egg, etc.
 */

interface ClickData {
  x: number
  y: number
  viewport_width: number
  viewport_height: number
  page_url: string
  element_selector: string
  element_text: string
}

let isInitialized = false

/**
 * Initialize click tracking on current page
 */
export function initClickTracking() {
  if (isInitialized) return
  if (typeof window === 'undefined') return

  console.log('[ClickTracker] Initializing click heatmap tracking')

  // Track all clicks on the page
  document.addEventListener('click', handleClick, { capture: true })

  isInitialized = true
}

/**
 * Handle click event and send to telemetry
 */
function handleClick(event: MouseEvent) {
  try {
    const target = event.target as HTMLElement
    if (!target) return

    // Get click coordinates
    const x = event.clientX
    const y = event.clientY + window.scrollY // Include scroll offset

    // Get viewport dimensions
    const viewport_width = window.innerWidth
    const viewport_height = window.innerHeight

    // Get page URL (pathname only, no query params)
    const page_url = window.location.pathname

    // Generate element selector (simplified)
    const element_selector = getElementSelector(target)

    // Get element text (first 50 chars)
    const element_text = target.textContent?.trim().substring(0, 50) || ''

    // Prepare click data
    const clickData: ClickData = {
      x,
      y,
      viewport_width,
      viewport_height,
      page_url,
      element_selector,
      element_text
    }

    // Send to telemetry API
    sendClickEvent(clickData)
  } catch (error) {
    console.error('[ClickTracker] Error tracking click:', error)
  }
}

/**
 * Send click event to telemetry API
 */
async function sendClickEvent(clickData: ClickData) {
  try {
    await fetch('/api/telemetry/track-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: 'click',
        event_name: clickData.page_url,
        page_url: clickData.page_url,
        payload: {
          x: clickData.x,
          y: clickData.y,
          viewport_width: clickData.viewport_width,
          viewport_height: clickData.viewport_height,
          element_selector: clickData.element_selector,
          element_text: clickData.element_text
        }
      })
    })
  } catch (error) {
    // Silently fail - don't block user experience
    console.warn('[ClickTracker] Failed to send click event:', error)
  }
}

/**
 * Generate a simple CSS selector for an element
 */
function getElementSelector(element: HTMLElement): string {
  try {
    // Try to build a simple selector: tag#id or tag.class
    const tag = element.tagName.toLowerCase()

    if (element.id) {
      return `${tag}#${element.id}`
    }

    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.trim())
      if (classes.length > 0) {
        return `${tag}.${classes[0]}`
      }
    }

    // If button or link, try to get text
    if (tag === 'button' || tag === 'a') {
      const text = element.textContent?.trim().substring(0, 20) || ''
      if (text) {
        return `${tag}[text="${text}"]`
      }
    }

    return tag
  } catch (error) {
    return 'unknown'
  }
}

/**
 * Stop click tracking
 */
export function stopClickTracking() {
  if (!isInitialized) return

  document.removeEventListener('click', handleClick, { capture: true })
  isInitialized = false

  console.log('[ClickTracker] Click tracking stopped')
}
