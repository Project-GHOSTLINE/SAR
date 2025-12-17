'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    message: '',
    contactMethod: 'email',
    contact: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Integrate with Supabase
    setSubmitted(true)
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h1 className="section-title text-center">Nous joindre</h1>
        <p className="section-subtitle text-center">Nous sommes la pour vous ecouter sans jugement</p>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Informations de contact</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sar-green rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Courriel</h3>
                  <a href="mailto:info@solutionargentrapide.ca" className="text-sar-green hover:underline">
                    info@solutionargentrapide.ca
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sar-green rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Telephone</h3>
                  <a href="tel:5145891946" className="text-sar-green hover:underline">
                    514 589 1946
                  </a>
                  <p className="text-gray-600 text-sm">450-999-1107 poste 104</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sar-green rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Adresse</h3>
                  <p className="text-gray-600">1148 aime petit<br />Chambly, Qc, J3L 6K1</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sar-green rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Heures d&apos;ouverture</h3>
                  <p className="text-gray-600">Lundi - Jeudi: 9h - 16h</p>
                  <p className="text-gray-600">Vendredi: 9h - 12h</p>
                  <p className="text-gray-600">Samedi - Dimanche: Ferme</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-sar-grey rounded-lg">
              <p className="text-gray-600">
                Avant de nous contacter, consultez notre{' '}
                <Link href="/faq" className="text-sar-green font-semibold hover:underline">
                  section FAQ
                </Link>{' '}
                pour trouver rapidement des reponses a vos questions.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <div className="card">
              <h2 className="text-2xl font-semibold mb-6">Contactez-nous</h2>

              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-sar-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Message envoye!</h3>
                  <p className="text-gray-600">Nous vous repondrons dans les plus brefs delais.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Votre message *</label>
                    <textarea
                      required
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      placeholder="Prenez votre temps pour nous ecrire..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Methode de contact preferee</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      value={formData.contactMethod}
                      onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                    >
                      <option value="email">Courriel</option>
                      <option value="phone">Telephone</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {formData.contactMethod === 'email' ? 'Adresse courriel' : 'Numero de telephone'} *
                    </label>
                    <input
                      type={formData.contactMethod === 'email' ? 'email' : 'tel'}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sar-green focus:border-transparent"
                      placeholder={formData.contactMethod === 'email' ? 'votre@email.com' : '514-XXX-XXXX'}
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                    <Send size={18} />
                    Envoyer le message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
