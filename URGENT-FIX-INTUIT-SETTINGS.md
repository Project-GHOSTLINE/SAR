# 🚨 URGENT: 2 problèmes trouvés dans Intuit Settings

## Problème 1: Tu es sur "Settings" au lieu de "Keys & OAuth"

### ✅ Clique sur "Keys & OAuth" dans le menu de gauche

Dans le menu où tu vois:
- Dashboard
- **Keys & OAuth** ← **CLIQUE ICI**
- Settings (tu es ici actuellement)
- etc.

C'est là que tu vas trouver les **Scopes**.

---

## Problème 2: ❌ URLs INCORRECTES dans Settings

Je vois que tu as des URLs WordPress dans ton app:
```
Launch URL: https://solutionargentrapide.ca/wp-admin/admin.php?page=qb-oauth
Disconnect URL: https://solutionargentrapide.ca/wp-admin/admin.php?page=qb-oauth
```

**Ces URLs sont FAUSSES.** Ton app est Next.js, pas WordPress!

### ✅ Corrige les URLs (après avoir configuré les scopes):

**Sur la page Settings où tu es actuellement:**

1. **Host domain:** `admin.solutionargentrapide.ca` (change de solutionargentrapide.ca)

2. **Launch URL:** `https://admin.solutionargentrapide.ca/admin/quickbooks`

3. **Disconnect URL:** `https://admin.solutionargentrapide.ca/admin/quickbooks`

4. Clique **"Save"**

---

## 🎯 ORDRE DES ACTIONS:

### Action 1: Configure les Scopes (PRIORITÉ)
1. Dans le menu de gauche, clique **"Keys & OAuth"**
2. Descends à la section **"Scopes"**
3. Coche ces 4 scopes:
   - ☑ Accounting
   - ☑ OpenID
   - ☑ Profile
   - ☑ Email
4. Clique **"Save"**

### Action 2: Corrige les URLs (après les scopes)
1. Retourne sur **"Settings"**
2. Change les 3 URLs comme indiqué ci-dessus
3. Clique **"Save"**

### Action 3: Configure les Redirect URIs
1. Sur la page Settings, trouve la section **"Redirect URIs"**
2. Ajoute cette URI si elle n'y est pas:
   ```
   https://admin.solutionargentrapide.ca/api/quickbooks/auth/callback
   ```
3. Clique **"Save"**

### Action 4: Connecte QuickBooks
1. Va sur: https://admin.solutionargentrapide.ca/admin/quickbooks
2. Clique "Connecter QuickBooks"
3. Succès! ✅

---

## 🔍 Screenshot demandé:

**Clique sur "Keys & OAuth" et montre-moi la page** pour qu'on configure les scopes ensemble.
