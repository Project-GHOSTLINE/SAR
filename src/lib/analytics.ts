/**
 * Google Analytics 4 - Event Tracking Helpers
 *
 * Ces fonctions permettent de tracker des événements personnalisés
 * dans Google Analytics 4 depuis n'importe quel composant.
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

/**
 * Track un événement personnalisé
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...eventParams,
      timestamp: new Date().toISOString()
    })
    console.log('📊 Analytics Event:', eventName, eventParams)
  }
}

/**
 * Track soumission de formulaire
 */
export const trackFormSubmit = (formName: string, formData?: Record<string, any>) => {
  trackEvent('form_submit', {
    form_name: formName,
    form_destination: typeof window !== 'undefined' ? window.location.pathname : '',
    ...formData
  })
}

/**
 * Track soumission formulaire de prêt
 */
export const trackLoanFormSubmit = (amount: number, term: string) => {
  trackEvent('loan_form_submit', {
    value: amount,
    currency: 'CAD',
    loan_term: term,
    form_type: 'loan_application'
  })
}

/**
 * Track clic sur bouton
 */
export const trackButtonClick = (buttonName: string, location?: string) => {
  trackEvent('button_click', {
    button_name: buttonName,
    button_location: location || (typeof window !== 'undefined' ? window.location.pathname : ''),
    page_location: typeof window !== 'undefined' ? window.location.href : ''
  })
}

/**
 * Track conversion (prêt accepté)
 */
export const trackConversion = (amount: number, transactionId?: string) => {
  trackEvent('conversion', {
    value: amount,
    currency: 'CAD',
    transaction_id: transactionId,
    event_category: 'loan',
    event_label: 'loan_approved'
  })
}

/**
 * Track début de demande de prêt
 */
export const trackLoanStart = () => {
  trackEvent('loan_start', {
    event_category: 'loan',
    event_label: 'loan_application_started'
  })
}

/**
 * Track étape du formulaire
 */
export const trackFormStep = (stepNumber: number, stepName: string) => {
  trackEvent('form_step', {
    step_number: stepNumber,
    step_name: stepName,
    form_type: 'loan_application'
  })
}

/**
 * Track erreur de formulaire
 */
export const trackFormError = (errorType: string, errorMessage: string) => {
  trackEvent('form_error', {
    error_type: errorType,
    error_message: errorMessage,
    page_location: typeof window !== 'undefined' ? window.location.pathname : ''
  })
}

/**
 * Track clic sur CTA (Call To Action)
 */
export const trackCTAClick = (ctaName: string, ctaLocation: string) => {
  trackEvent('cta_click', {
    cta_name: ctaName,
    cta_location: ctaLocation,
    page_path: typeof window !== 'undefined' ? window.location.pathname : ''
  })
}

/**
 * Track ouverture de chat/support
 */
export const trackSupportOpen = (supportType: 'chat' | 'email' | 'phone') => {
  trackEvent('support_open', {
    support_type: supportType,
    page_location: typeof window !== 'undefined' ? window.location.href : ''
  })
}

/**
 * Track scroll depth
 */
export const trackScrollDepth = (percentage: number) => {
  trackEvent('scroll', {
    scroll_depth: percentage,
    page_location: typeof window !== 'undefined' ? window.location.pathname : ''
  })
}

/**
 * Track temps passé sur page
 */
export const trackTimeOnPage = (seconds: number) => {
  trackEvent('time_on_page', {
    time_seconds: seconds,
    page_location: typeof window !== 'undefined' ? window.location.pathname : ''
  })
}

/**
 * Track erreur technique
 */
export const trackError = (errorName: string, errorDetails?: string) => {
  trackEvent('error', {
    error_name: errorName,
    error_details: errorDetails,
    page_location: typeof window !== 'undefined' ? window.location.href : ''
  })
}

/**
 * Track clic sur lien externe
 */
export const trackExternalLink = (linkUrl: string, linkText: string) => {
  trackEvent('external_link_click', {
    link_url: linkUrl,
    link_text: linkText,
    page_location: typeof window !== 'undefined' ? window.location.pathname : ''
  })
}

/**
 * Track téléchargement de fichier
 */
export const trackFileDownload = (fileName: string, fileType: string) => {
  trackEvent('file_download', {
    file_name: fileName,
    file_type: fileType,
    page_location: typeof window !== 'undefined' ? window.location.pathname : ''
  })
}

/**
 * Track recherche sur le site
 */
export const trackSearch = (searchTerm: string, resultsCount: number) => {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount
  })
}
