/**
 * Page: partners.* root (/)
 *
 * Redirect vers /invite (landing page)
 */

import { redirect } from 'next/navigation'

export default function PartnersRootPage() {
  redirect('/invite')
}
