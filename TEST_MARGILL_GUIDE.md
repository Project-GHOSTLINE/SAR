# 🧪 Guide de Test - Intégration Margill

**Date**: 2026-01-27
**Purpose**: Tester et valider le payload JSON Margill avant intégration production

---

## 🎯 Objectif

Ce formulaire de test permet de:
1. ✅ Visualiser le payload JSON exact qui sera envoyé à Margill
2. ✅ Valider tous les formats (téléphone, dates, montants, langue)
3. ✅ Identifier les champs manquants ou mal formatés
4. ✅ Tester sans risque (aucune donnée envoyée à Margill)
5. ✅ Documenter les questions à poser à Marc (Margill)

---

## 🚀 Accéder au Formulaire de Test

### En Local (Développement)

```bash
# 1. Démarrer le serveur local
cd /Users/xunit/Desktop/📁\ Projets/sar
npm run dev

# 2. Ouvrir dans le navigateur
open http://localhost:3000/test-margill
```

### En Production (Staging)

```
https://admin.solutionargentrapide.ca/test-margill
```

**⚠️ IMPORTANT**: Cette page est accessible sans authentification pour faciliter les tests. À protéger ou supprimer avant production!

---

## 📋 Utilisation du Formulaire

### 1. Remplir le Formulaire

Le formulaire est pré-rempli avec des données de test valides:

- **Montant**: 500$ (boutons 300-6000$)
- **Nom**: Fred Rosa
- **Email**: info@solutionargentrapide.ca
- **Téléphone**: 514-123-4567
- **Date de naissance**: 1990-05-15
- **Adresse**: 115 Drumlin Circle, Vaughan, Ontario
- **Emploi**: Solution Argent Rapide (embauche: 2022-06-09)

**Vous pouvez modifier n'importe quel champ pour tester différents scénarios.**

### 2. Soumettre le Test

Cliquer sur **"🚀 Tester le Payload Margill"**

### 3. Analyser les Résultats

Après soumission, vous verrez:

#### A. **Payload JSON Margill**

```json
{
  "origin": "argentrapide",
  "q_langue": "Francais",
  "langue": "Francais",
  "q_loan_amount_requested": "500",
  "loan_amount_requested": "500",
  "q_first_name": "Fred",
  "first_name": "Fred",
  ...
}
```

**✅ C'est exactement ce qui sera envoyé à Margill!**

#### B. **Validation des Champs**

Liste de tous les champs validés:

- ✅ Prénom valide
- ✅ Nom valide
- ✅ Email valide et confirmé
- ✅ Téléphone: 514-123-4567
- ✅ Montant: 500$ (sans décimale)
- ✅ Langue: Francais (sans accent ✓)
- ⚠️ Date de naissance non fournie (optionnel)
- ⚠️ Champs optionnels absents: monthly_income, education_level, credit_score, sin

#### C. **Statistiques**

- Total de champs: 56
- Champs remplis: 42
- Champs vides: 14
- Taille payload: ~2.5 KB

---

## 🔍 Points de Validation Critiques

### 1. **Langue - SANS ACCENT!**

❌ **INCORRECT**: `"langue": "Français"`
✅ **CORRECT**: `"langue": "Francais"`

**Selon le document Margill**: "Francais ou Anglais" (sans accent)

### 2. **Montant - SANS DÉCIMALE!**

❌ **INCORRECT**: `"loan_amount_requested": "500.00"`
✅ **CORRECT**: `"loan_amount_requested": "500"`

**Selon le document Margill**: "ne doit contenir aucune décimale"

### 3. **Téléphone - FORMAT AVEC TIRETS**

❌ **INCORRECT**: `"phone": "5141234567"`
✅ **CORRECT**: `"phone": "514-123-4567"`

**Exemple du document**: `123-456-7890`

### 4. **Date - FORMAT YYYY-MM-DD**

❌ **INCORRECT**: `"birthday": "15/05/1990"`
✅ **CORRECT**: `"birthday": "1990-05-15"`

**Exemple du document**: `2000-12-31`

### 5. **Nom Complet - CALCULÉ**

```typescript
const fullName = `${first_name} ${last_name}`.trim()
// "Fred Rosa"
```

**Selon le document**: `first_name + " " + last_name`

### 6. **Adresse - 5 CHAMPS SÉPARÉS**

```json
{
  "q_current_address1": "115 Drumlin Circle",
  "q_current_address2": "",
  "q_current_address3": "Vaughan",
  "q_current_address4": "Ontario",
  "q_current_address5": "L4K 3E6"
}
```

**PAS un seul champ `adresse_complete`!**

---

## ⚠️ Champs Manquants (Questions pour Marc)

Ces 4 champs sont dans le **document Margill** mais **ABSENTS du formulaire iframe actuel**:

| Champ | Variable Margill | Présent dans iframe? | Action |
|-------|------------------|----------------------|--------|
| Revenu mensuel | `q_monthly_income` / `monthly_income` | ❌ NON | ❓ À clarifier |
| Niveau d'éducation | `q_education_level` / `education_level` | ❌ NON | ❓ À clarifier |
| Cote de crédit | `q_credit_score` / `credit_score` | ❌ NON | ❓ À clarifier |
| NAS | `q_sin` / `sin` | ❌ NON | ❓ À clarifier |

**Question pour Marc**: Ces champs sont-ils **vraiment requis** par Margill? Ou simplement **optionnels**?

---

## 📝 Scénarios de Test Recommandés

### Test 1: Formulaire Minimal (Champs Obligatoires Seulement)

**Remplir**:
- Prénom
- Nom
- Email (+ confirmation)
- Téléphone
- Montant
- Citoyen/Résident: Oui

**Laisser vide**:
- Tous les autres champs

**Résultat attendu**: ✅ Validation passe, mais plusieurs ⚠️ optionnels

### Test 2: Formulaire Complet

**Remplir tous les champs** disponibles dans le formulaire.

**Résultat attendu**: ✅ Validation passe avec minimum de warnings

### Test 3: Validation Email

**Tester**:
- Email: `test@example.com`
- Confirmation: `test@example.com` (match)

**Puis**:
- Email: `test@example.com`
- Confirmation: `autre@example.com` (mismatch)

**Résultat attendu**:
- Premier cas: ✅ Email valide et confirmé
- Second cas: ❌ Les emails ne correspondent pas

### Test 4: Validation Téléphone

**Tester formats**:
- `514-123-4567` → ✅ Valide
- `514 123 4567` → ❌ Format incorrect (espaces)
- `5141234567` → ❌ Format incorrect (pas de tirets)
- `51-123-4567` → ⚠️ Format incorrect (1er bloc = 2 chars au lieu de 3)

### Test 5: Validation Montant

**Tester montants**:
- `500` → ✅ Valide
- `500.00` → ⚠️ Contient des décimales (sera converti en `500`)
- `250` → ❌ Inférieur au minimum (300$)
- `7000` → ❌ Supérieur au maximum (6000$)

### Test 6: Validation Date de Naissance

**Tester dates**:
- `1990-05-15` (34 ans) → ✅ Valide
- `2010-01-01` (14 ans) → ❌ Âge minimum 18 ans
- `1900-01-01` (124 ans) → ⚠️ Date suspecte

### Test 7: Validation Adresse

**Scénario A** (Adresse complète):
- Ligne 1: ✅ Rempli
- Ville: ✅ Rempli
- Province: ✅ Rempli
- Code postal: ✅ Rempli
- **Résultat**: ✅ Adresse complète

**Scénario B** (Adresse partielle):
- Ligne 1: ✅ Rempli
- Ville: ❌ Vide
- **Résultat**: ⚠️ Adresse incomplète

**Scénario C** (Pas d'adresse):
- Tous les champs vides
- **Résultat**: ⚠️ Adresse non fournie (optionnel)

---

## 🐛 Tests de Cas Limites (Edge Cases)

### 1. Caractères Spéciaux dans Nom

```
Prénom: "Jean-François"
Nom: "O'Brien"
```

**Vérifier**: Payload JSON échappe correctement les caractères spéciaux

### 2. Email avec + (Gmail trick)

```
Email: "test+margill@gmail.com"
```

**Vérifier**: Validation accepte le `+` dans l'email

### 3. Code Postal avec Espace

```
Code postal: "L4K 3E6"  (avec espace)
Code postal: "L4K3E6"   (sans espace)
```

**Vérifier**: Les deux formats sont acceptés

### 4. Province avec Accent

```
Province: "Québec"  (avec accent)
```

**Vérifier**: Accent est préservé (contrairement à "langue")

### 5. Nom avec Apostrophe

```
Nom: "D'Amour"
```

**Vérifier**: Apostrophe est échappée correctement dans JSON

---

## 📊 Checklist de Validation Complète

Avant de passer en production, vérifier:

### Format des Données

- [ ] Langue = "Francais" (sans accent) ✅
- [ ] Montant = entier sans décimale ✅
- [ ] Téléphone = XXX-XXX-XXXX ✅
- [ ] Dates = YYYY-MM-DD ✅
- [ ] Nom complet = first_name + " " + last_name ✅
- [ ] Adresse = 5 champs séparés ✅
- [ ] Origin = "argentrapide" ✅

### Champs Obligatoires

- [ ] q_langue / langue ✅
- [ ] q_loan_amount_requested / loan_amount_requested ✅
- [ ] q_first_name / first_name ✅
- [ ] q_last_name / last_name ✅
- [ ] q_full_name / full_name (calculé) ✅
- [ ] q_email / email ✅
- [ ] q_phone / phone ✅
- [ ] q_canadian_or_permanent_resident / canadian_or_permanent_resident ✅

### Champs Optionnels (Recommandés)

- [ ] q_birthday / birthday
- [ ] q_current_address1-5 / current_address_field1-5
- [ ] q_second_phone / second_phone
- [ ] q_income_source / income_source
- [ ] q_time_at_current_job / time_at_current_job
- [ ] q_number_of_loans / number_of_loans
- [ ] q_stop_payments_nsf / stop_payments_nsf
- [ ] q_consumer_proposal_or_bankrupt / consumer_proposal_or_bankrupt
- [ ] q_reason_for_loan / reason_for_loan
- [ ] q_employer_name / employer_name
- [ ] q_date_of_hire / date_of_hire
- [ ] q_how_did_you_hear_about_us / how_did_you_hear_about_us

### Champs À Clarifier avec Marc

- [ ] q_monthly_income / monthly_income (absent iframe)
- [ ] q_education_level / education_level (absent iframe)
- [ ] q_credit_score / credit_score (absent iframe)
- [ ] q_sin / sin (absent iframe)

---

## 📞 Questions pour Marc (Margill)

### 1. Format de la Réponse

**Question**: Quel est le format exact de la réponse du endpoint `process_json_form.aspx`?

```json
// Option A: String simple
"success"  ou  "error"

// Option B: JSON avec détails
{
  "status": "success",
  "demande_id": "fr55592",
  "message": "Demande créée avec succès"
}

// Option C: Avec URL de redirection
{
  "status": "success",
  "demande_id": "fr55592",
  "redirect_url": "https://argentrapide.margill.com/uploadDocsV2.aspx?..."
}
```

### 2. ID de Demande

**Question**: Comment récupérer l'ID de demande (ex: `fr55592`)?

- Est-il inclus dans la réponse JSON?
- Doit-on faire un second call pour le récupérer?
- Comment est-il généré (préfixe "fr" = français)?

### 3. Champs Manquants

**Question**: Les 4 champs suivants sont dans le document mais absents de l'iframe actuel. Sont-ils **requis** ou **optionnels**?

- `monthly_income` (revenu mensuel)
- `education_level` (niveau d'éducation)
- `credit_score` (cote de crédit)
- `sin` (NAS)

### 4. Gestion des Erreurs

**Question**: Quand Margill retourne "error":

- Y a-t-il un message d'erreur détaillé?
- Quels sont les codes d'erreur possibles?
- Peut-on retry automatiquement?

### 5. Upload de Documents

**Question**: Comment gérer l'upload de documents?

- Les documents DOIVENT-ils passer par `uploadDocsV2.aspx`?
- Peut-on les stocker dans Google Drive et envoyer les URLs?
- Y a-t-il une API pour uploader programmatiquement?

### 6. Authentication

**Question**: L'endpoint `process_json_form.aspx` requiert-il:

- API key?
- Header `Authorization`?
- IP whitelist?
- Autre méthode d'authentification?

### 7. Environnement de Test

**Question**: Y a-t-il un endpoint de staging/test?

- URL de test (ex: `test.argentrapide.margill.com`)?
- Comment distinguer les soumissions de test vs production?
- Les tests laissent-ils des traces dans Margill?

### 8. Timeout

**Question**: Quel est le temps de réponse typique du endpoint?

- Timeout recommandé pour notre appel HTTP?
- Le endpoint est-il synchrone ou asynchrone?

---

## 🔧 Prochaines Étapes

### Phase 1: Tests et Validation (En Cours)

1. ✅ Formulaire de test créé
2. ⏳ Tester tous les scénarios ci-dessus
3. ⏳ Noter les questions pour Marc
4. ⏳ Valider le payload JSON final

### Phase 2: Clarifications avec Marc

1. ⏳ Envoyer les questions à Marc
2. ⏳ Recevoir les réponses
3. ⏳ Ajuster le formulaire/payload selon les réponses

### Phase 3: Intégration Réelle

1. ⏳ Créer endpoint `/api/margill/submit`
2. ⏳ Intégrer avec `process_json_form.aspx`
3. ⏳ Tester avec endpoint de staging (si disponible)
4. ⏳ Gestion des erreurs + retry logic
5. ⏳ Upload de documents (Google Drive ou Margill)

### Phase 4: Production

1. ⏳ Remplacer l'iframe par le formulaire natif
2. ⏳ Garder même URL (`/demande-de-pret-en-ligne-formulaire`)
3. ⏳ Monitoring + logging
4. ⏳ Backup + recovery plan

---

## 📁 Fichiers Créés

| Fichier | Purpose |
|---------|---------|
| `/src/app/test-margill/page.tsx` | Formulaire de test avec tous les champs |
| `/src/app/api/test-margill/submit/route.ts` | Endpoint qui transforme en payload Margill |
| `TEST_MARGILL_GUIDE.md` | Ce guide (documentation) |

---

## 🔒 Sécurité

### Données Sensibles

- ⚠️ **NAS (sin)**: Donnée très sensible, à chiffrer si collectée
- ⚠️ **Date de naissance**: Peut être utilisée pour usurpation d'identité
- ⚠️ **Adresse complète**: Information personnelle

### Recommendations

1. **HTTPS obligatoire** (déjà en place avec Vercel)
2. **Rate limiting** sur l'endpoint de soumission
3. **CAPTCHA** pour éviter le spam/bots
4. **Validation côté serveur** (jamais faire confiance au client)
5. **Logging** de toutes les soumissions (audit trail)
6. **Chiffrement des données** avant envoi à Margill (si pas déjà en HTTPS)

---

## 📞 Support

**En cas de problème**:

1. Vérifier les logs dans la console browser (F12)
2. Vérifier le payload JSON généré
3. Comparer avec le document Margill
4. Contacter Marc pour clarifications

---

**Dernière mise à jour**: 2026-01-27
**Version**: 1.0
**Status**: 🧪 En phase de test
