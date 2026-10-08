# 🎮 XO Challenge — Le Jeu Imbattable & Guide Stratégique "Never Lose"

Bienvenue dans **XO Challenge**, un jeu de Morpion (Tic-Tac-Toe) nouvelle génération développé avec **Next.js 16**, doté d'une IA mathématiquement imbattable et d'un guide stratégique complet permettant aux joueurs d'apprendre comment **ne jamais perdre** à XO.

---

## 📌 Sommaire
- [Aperçu du Projet](#-aperçu-du-projet)
- [La Stratégie Mathématique : Comment Ne Jamais Perdre](#-la-stratégie-mathématique--comment-ne-jamais-perdre)
  - [1. Le constat mathématique](#1-le-constat-mathématique)
  - [2. Les 2 règles d'or (résolvent 95% des parties)](#2-les-2-règles-dor-résolvent-95-des-parties)
  - [3. La force des cases](#3-la-force-des-cases)
  - [4. La hiérarchie des 8 priorités](#4-la-hiérarchie-des-8-priorités)
  - [5. Tactique pour Joueur 1 (X)](#5-tactique-pour-joueur-1-x)
  - [6. Tactique pour Joueur 2 (O)](#6-tactique-pour-joueur-2-o)
  - [7. Les Fourchettes (Forks) & Pièges à éviter](#7-les-fourchettes-forks--pièges-à-éviter)
- [Fonctionnalités de l'Application](#-fonctionnalités-de-lapplication)
- [Architecture Technique](#-architecture-technique)
- [Installation & Démarrage](#-installation--démarrage)
- [Crédits](#-crédits)

---

## 🚀 Aperçu du Projet

Ce projet propose deux modes de jeu immersifs accompagnés d'une touche d'humour en Darija algérienne (les taunts d'Amine) :
1. **vs Machine (Solo)** : Affrontez un moteur d'IA 100% invincible qui combine ouvertures stratégiques, arbre de décision de haut niveau et recherche par arbre Minimax.
2. **vs Sahbi (2 Joueurs en local)** : Jouez entre amis sur le même écran avec suivi du score en temps réel.

En plus du jeu, l'application intègre :
- **Un Coach Stratégique en jeu (`💡 Astuce Tactique`)** : Analyse le plateau à tout moment et indique le coup optimal ainsi que la règle stratégique exacte appliquée.
- **Un Guide Stratégique Visuel (`📖 Guide Stratégie`)** : Présente pas à pas avec mini-plateaux visuels les principes fondamentaux du jeu.

---

## 🧠 La Stratégie Mathématique : Comment Ne Jamais Perdre

*Basée sur l'analyse complète de [How to Never Lose at Tic-Tac-Toe — Complete Strategy Guide (TicTacToeFun)](https://tictactoefun.com/blog/how-to-never-lose.html).*

### 1. Le constat mathématique
Le Tic-Tac-Toe est ce que les mathématiciens appellent un **jeu résolu** (*solved game*). Avec un jeu parfait des deux côtés, **l'issue est obligatoirement un match nul**. Aucun joueur ne peut forcer la victoire face à un adversaire qui ne fait aucune erreur.
En maîtrisant la stratégie ci-dessous, **vous ne perdrez plus jamais la moindre partie**.

### 2. Les 2 règles d'or (résolvent 95% des parties)
Ces deux règles sont **absolues** et priment sur toute autre considération :
- **Règle 1 : Gagnez toujours si vous pouvez (*Win if you can*)**  
  Si vous avez deux pions alignés avec la 3ème case vide : jouez-y immédiatement pour remporter la victoire.
- **Règle 2 : Bloquez toujours si vous devez (*Block if you must*)**  
  Si votre adversaire a deux pions alignés, votre prochain coup doit obligatoirement être de bloquer la 3ème case.

### 3. La force des cases
Toutes les cases du plateau ne se valent pas :
| Type de case | Nb de lignes gagnantes | Détail | Valeur stratégique |
| :--- | :---: | :--- | :--- |
| **Centre (1 case)** | **4 lignes** | 2 diagonales + 1 ligne + 1 colonne | ⭐⭐⭐ **Case la plus forte** |
| **Coins (4 cases)** | **3 lignes** | 1 ligne + 1 colonne + 1 diagonale | ⭐⭐ **Très fort** |
| **Bordures (4 cases)** | **2 lignes** | 1 ligne + 1 colonne seulement | ⭐ **Le plus faible** |

### 4. La hiérarchie des 8 priorités
Lorsque ni la Règle 1 (Gagner) ni la Règle 2 (Bloquer) ne s'appliquent, appliquez cette liste dans l'ordre strict :
1. **Créer une fourchette (*Fork*)** : Créer 2 menaces d'alignement distinctes à la fois. L'adversaire ne pourra en parer qu'une.
2. **Bloquer la fourchette adverse** : Empêcher l'adversaire de créer un double piège (en prenant sa case de fourchette ou en le forçant à parer une menace ailleurs).
3. **Prendre le centre** : Occuper la case maîtresse (4 lignes).
4. **Jouer le coin opposé** : Si l'adversaire a pris un coin, prendre le coin diagonalement opposé.
5. **Prendre un coin vide** : Occuper l'un des coins restants (3 lignes chacun).
6. **Prendre une bordure vide** : Occuper une bordure (2 lignes) en dernier recours.

### 5. Tactique pour Joueur 1 (X)
Avoir les X donne un léger avantage tactique :
- **Coup 1** : Prendre le **Centre** (ou un Coin). Le centre est la recommandation prioritaire du guide car il participe à la moitié des combinaisons gagnantes.
- **Coup 3 (si O joue un Coin)** : Prendre le **coin diagonalement opposé**. Vous préparez ainsi un piège en fourchette.
- **Coup 3 (si O joue une Bordure)** : O a commis une faute stratégique. Jouez un coin adjacent pour créer une double menace imparable et forcer la victoire.

### 6. Tactique pour Joueur 2 (O)
Jouer en second exige une vigilance absolue dès le premier coup :
- **Si X joue le Centre** ➔ O **DOIT** répondre dans un **Coin** (jouer une bordure face au centre entraîne une défaite garantie face à un jeu parfait).
- **Si X joue un Coin** ➔ O **DOIT** impérativement prendre le **Centre** (tout autre coup donne une victoire forcée à X).
- **Si X joue une Bordure** ➔ O prend le **Centre** et déroule les priorités.

### 7. Les Fourchettes (Forks) & Pièges à éviter
Une **fourchette** est une position où vous créez deux menaces de victoire simultanées. 

**Les 5 pièges fréquents à éviter :**
1. Oublier son propre alignement gagnant par manque d'attention.
2. Bloquer la mauvaise ligne en lisant mal le plateau.
3. Jouer les bordures trop tôt dans la partie.
4. Ignorer les préparatifs de fourchettes adverses (anticipez toujours 1 coup d'avance).
5. Jouer en mode pilote automatique sans vérifier l'ordre des priorités.

---

## 💻 Fonctionnalités de l'Application

- 🤖 **IA Invincible** : Architecture hybride combinant ouvertures de maître, arbre de décision de 8 priorités et algorithme Minimax à somme nulle.
- 💡 **Coach Stratégique Interactif** : Bouton d'aide en temps réel mettant en surbrillance la case conseillée avec un message expliquant la règle mathématique activée.
- 📚 **Modal Guide Stratégique** : Système d'onglets avec visualisations graphiques de plateaux et explications pédagogiques claires.
- 🎨 **Design UI/UX Moderne** : Dégradés vibrants, glassmorphism, animations fluides, typographie *Outfit* et responsive mobile-first.
- 🏆 **Gestion des Scores** : Sauvegarde automatique des victoires, défaites et matchs nuls dans le `localStorage`.
- 🇩🇿 **Taunts en Darija Algérienne** : Expérience ludique avec des répliques locales amusantes qui évoluent au fil de la partie.

---

## 🛠️ Architecture Technique

```
xoxo-game/
├── src/
│   └── app/
│       ├── components/
│       │   ├── StrategyGuideModal.tsx      # Modal complet du guide stratégique
│       │   └── strategy-guide.module.css   # Styles du modal & mini-plateaux
│       ├── lib/
│       │   └── minimax.ts                  # Algorithme Minimax + Arbre décisionnel + Hint coach
│       ├── jeu/
│       │   ├── page.tsx                    # Page de jeu (Solo vs Machine & 2 Joueurs)
│       │   └── game.module.css             # Styles de la grille de jeu & animations
│       ├── globals.css                     # Variables CSS globales, thèmes & animations
│       ├── page.tsx                        # Page d'accueil interactive & sélection de mode
│       ├── page.module.css                 # Styles de l'accueil
│       └── layout.tsx                      # Layout global avec métadonnées SEO
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Installation & Démarrage

### Prérequis
- Node.js (v18 ou supérieur)
- npm ou yarn / pnpm

### Lancer en local
```bash
# Cloner le dépôt
git clone https://github.com/mohamedkhoran-lab/xoxo-game.git
cd xoxo-game

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Construire pour la production
```bash
npm run build
npm start
```

---

## 📖 Références & Crédits

- Guide stratégique de référence : [How to Never Lose at Tic-Tac-Toe — TicTacToeFun](https://tictactoefun.com/blog/how-to-never-lose.html)
- Réalisé par **Amine** (2026).
