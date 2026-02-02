/**
 * Page: /partners/invite?token=XXX
 *
 * Activation partenaire via token d'invitation
 * Server Component qui wrap le client dans Suspense
 */

import { Suspense } from 'react'
import InviteClient from './InviteClient'

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-32 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <InviteClient />
    </Suspense>
  )
}
