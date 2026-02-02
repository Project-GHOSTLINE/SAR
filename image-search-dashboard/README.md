# 🎯 IMAGE SEARCH DASHBOARD - Documentation Complète

**Version:** 2.0 - Selenium Enhanced  
**Date:** 31 Janvier 2026

---

## 🚀 DÉMARRAGE RAPIDE

### Lancer le Serveur
```bash
cd "/Users/xunit/Desktop/📁 Projets/sar/image-search-dashboard"
./start.sh
```

**Dashboard:** http://localhost:8000

---

## ✨ FONCTIONNALITÉS

### 🕷️ Scraper Web (SELENIUM)
- **Scrape sites JavaScript** (sites modernes)
- **Screenshots automatiques** de chaque page
- **100 pages max** / **1000 images max**
- **Barre de progression en temps réel**

### 🖼️ Galerie avec Recherche Avancée
- **Recherche textuelle** (noms, tags, URLs, localisations)
- **Boutons rapides:** Québec, Montréal, Canada, etc.
- **Filtres:** GPS, Notes, Catégories, Favoris
- **Badges visuels:** 📍 GPS, ⭐ Notes, ❤️ Favoris, 🏷️ Tags

### 🔍 Analyse OSINT (par image)
**Capturé automatiquement:**
- 👤 Username
- 📄 URL de la page source
- 🖼️ URL image originale
- 🔗 Lien profil (Instagram, Twitter, OnlyFans, etc.)
- 📌 Titre de la page
- 📝 Description
- 📍 GPS (si disponible)

---

## 📖 GUIDE D'UTILISATION

### 1. Scraper un Site

**Dans 🕷️ Scraper:**
1. URL: `https://example.com`
2. Pages Max: `100`
3. Images Max: `1000`
4. Cliquez: **🚀 Commencer**
5. **Regardez la progression:**
   - Barre animée
   - Pages: X/100
   - Images: X/1000

### 2. Voir les Résultats

**Dans 🖼️ Galerie:**
- Toutes les images apparaissent
- Survol → Bouton **🔍 OSINT**
- Clic → Page complète avec toutes les infos

### 3. Rechercher

**Barre de recherche:**
```
montreal    → Trouve "montreal" partout
quebec      → Tags, noms, URLs
@username   → Usernames
tatouage    → Tags personnalisés
.ca         → Sites canadiens
```

**Boutons rapides:**
- 🍁 Québec
- 🏙️ Montréal  
- 🇨🇦 Canada
- 👩 Canadienne / Québécoise

**Filtres (⚙️):**
- Avec/Sans GPS
- Notes 1-5 ⭐
- Catégories
- Favoris

### 4. Ajouter des Tags

1. Galerie → Image → **🔍 OSINT**
2. Ajouter tags: `"tatouage", "piercing", "quebec"`
3. Ajouter commentaire
4. Noter (⭐)
5. **💾 Sauvegarder**
6. Retour galerie → Rechercher par tags

---

## 🔧 MÉTADONNÉES CAPTURÉES

### Automatique (Scraping)
✅ Username (URL/HTML)  
✅ URL image + page source  
✅ Titre & description  
✅ Profil auto-construit  
✅ Dimensions & format  
✅ Date téléchargement

### EXIF (si disponible)
✅ GPS (latitude, longitude)  
✅ Appareil photo  
✅ Date de prise

### Manuel (Utilisateur)
✅ Tags personnalisés  
✅ Commentaires  
✅ Notes (1-5 ⭐)  
✅ Catégories

---

## 🚨 DÉPANNAGE

### Serveur ne démarre pas
```bash
cd "/Users/xunit/Desktop/📁 Projets/sar/image-search-dashboard"
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Aucune image téléchargée
- Site peut bloquer le scraping
- Tester avec site simple d'abord
- Vérifier connexion internet

### Recherche sans résultats
- Base de données vide? Scraper d'abord
- Métadonnées manquantes? Ajouter tags manuellement
- Vérifier: `curl http://localhost:8000/api/stats`

### Réinitialiser
```bash
rm -rf scraped_images/*
rm faces.db metadata.db
# Relancer le serveur
```

---

## 📊 PERFORMANCE

### Temps Estimés
- **10 images:** 8 secondes
- **100 images:** ~2 minutes  
- **1000 images:** ~10-15 minutes
- **100 pages:** ~3-4 minutes

### Limites Recommandées

**Optimal:**
- Pages: 20-50
- Images: 200-500

**Massif:**
- Pages: 100 (max 500)
- Images: 1000 (max 5000)

### Espace Disque (1000 images)
- Images: ~100 MB
- Screenshots: ~500 MB
- Total: ~600 MB

---

## 🎯 EXEMPLES

### Chercher Profils Québécois
```
1. Scraper site québécois
2. Système capture usernames + URLs automatiquement
3. Galerie → Bouton "🍁 Québec"
4. Résultats filtrés!
```

### Organiser par Tatouages
```
1. Image → OSINT → Tags: "tatouage bras"
2. Répéter pour plusieurs images
3. Galerie → Rechercher "tatouage"
4. Toutes les images taggées!
```

### Export Données
```
1. Page OSINT
2. "📥 Télécharger Rapport"
3. JSON avec toutes les métadonnées
```

---

## 📁 FICHIERS IMPORTANTS

```
app.py              - Serveur principal (Python)
index.html          - Dashboard
osint.html          - Page analyse OSINT
scraped_images/     - Images téléchargées
metadata.db         - Base de données
start.sh            - Script démarrage
venv/               - Python packages
```

---

## ✅ CHECKLIST DEMAIN

- [ ] Lancer: `./start.sh`
- [ ] Ouvrir: http://localhost:8000
- [ ] Tester scraping (10 images)
- [ ] Vérifier barre progression
- [ ] Tester boutons Québec/Canada
- [ ] Vérifier OSINT affiche métadonnées

---

**SYSTÈME PRÊT! 🚀**

**Capacités:**
- ✅ 100 pages / 1000 images
- ✅ Selenium (JavaScript)
- ✅ Screenshots automatiques
- ✅ Métadonnées complètes
- ✅ Recherche avancée Québec/Canada
- ✅ Barre de progression temps réel

**Dernière mise à jour:** 31 Janvier 2026
