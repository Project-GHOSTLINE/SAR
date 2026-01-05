import { AlertCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md text-center">
        <AlertCircle className="w-16 h-16 text-sar-gold mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Accès restreint</h1>
        <p className="text-gray-600 mb-4">
          Cette page est accessible uniquement via un lien magique envoyé par SMS.
        </p>
        <p className="text-sm text-gray-500">
          Si vous avez besoin d&apos;accéder à votre suivi, veuillez vérifier vos messages SMS.
        </p>
      </div>
    </div>
  )
}
