# 🎯 Guide: Configurer les Scopes dans Intuit Developer Dashboard

## ❌ Tu es sur la mauvaise page
La page que tu regardes est la **documentation** sur les scopes.
Tu dois aller sur le **Dashboard de ton app** pour les configurer.

## ✅ Voici comment trouver la bonne page:

### ÉTAPE 1: Va sur le Dashboard
URL directe: https://developer.intuit.com/app/developer/dashboard

### ÉTAPE 2: Sélectionne ton app "SAR"
Tu devrais voir une liste de tes apps.
Clique sur **"SAR"** (ton app).

### ÉTAPE 3: Cherche l'onglet "Keys & OAuth"
Dans le menu de gauche ou en haut, tu devrais voir:
- Dashboard
- **Keys & OAuth** ← Clique ici
- Settings
- etc.

### ÉTAPE 4: Trouve la section "Scopes"
Sur la page "Keys & OAuth", descends jusqu'à voir:

**"Scopes"** ou **"Select Scopes"** ou **"App Scopes"**

Tu devrais voir une interface comme ça:

```
Scopes
Select the scopes your app needs:

☐ Accounting (com.intuit.quickbooks.accounting)
☐ OpenID
☐ Profile
☐ Email
☐ Phone
☐ Address
☐ Payments (com.intuit.quickbooks.payment)

[Save] button
```

### ÉTAPE 5: Coche les 4 scopes requis
```
☑ Accounting (com.intuit.quickbooks.accounting)
☑ OpenID
☑ Profile
☑ Email
```

### ÉTAPE 6: Sauvegarde
Clique le bouton **"Save"** en bas de la section.

---

## 🔍 Si tu ne trouves pas "Keys & OAuth":

Essaie ces URLs directes:

1. **Dashboard principal:**
   https://developer.intuit.com/app/developer/dashboard

2. **Sélectionne ton app "SAR"** dans la liste

3. **URL de ton app devrait ressembler à:**
   https://developer.intuit.com/app/developer/myapp/[APP_ID]/keys

---

## 📸 Partage un screenshot de:

1. La page après avoir cliqué sur ton app "SAR"
2. Le menu de gauche ou les onglets en haut
3. La section où tu vois tes Client ID et Client Secret

Comme ça je peux te guider exactement où cliquer.

---

## ⚡ Une fois les scopes configurés:

1. Les scopes sont sauvegardés ✅
2. Va sur: https://admin.solutionargentrapide.ca/admin/quickbooks
3. Clique "Connecter QuickBooks"
4. Autorise toutes les permissions
5. Succès! 🎉
