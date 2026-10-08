# 🎮 XO Challenge — Le Jeu Imbattable (Moteur "Never Lose")

Bienvenue dans **XO Challenge**, un jeu de Morpion (Tic-Tac-Toe) développé avec **Next.js 16**, doté d'une IA mathématiquement imbattable qui joue selon la stratégie optimale issue du guide [How to Never Lose at Tic-Tac-Toe (TicTacToeFun)](https://tictactoefun.com/blog/how-to-never-lose.html).

---

## 📌 Sommaire
- [Aperçu du Projet](#-aperçu-du-projet)
- [Le Moteur IA : La Stratégie "Never Lose"](#-le-moteur-ia--la-stratégie-never-lose)
  - [1. Le constat mathématique](#1-le-constat-mathématique)
  - [2. Les 2 règles d'or (résolvent 95% des parties)](#2-les-2-règles-dor-résolvent-95-des-parties)
  - [3. La force des cases](#3-la-force-des-cases)
  - [4. L'arbre décisionnel des 8 priorités](#4-larbre-décisionnel-des-8-priorités)
  - [5. Tactique d'ouverture et de défense](#5-tactique-douverture-et-de-défense)
- [Modes de Jeu](#-modes-de-jeu)
- [Architecture du Code](#-architecture-du-code)
- [Installation & Démarrage](#-installation--démarrage)
- [Crédits](#-crédits)

---

## 🚀 Aperçu du Projet

Ce projet propose une expérience de jeu dynamique et immersive avec des répliques amusantes en Darija algérienne ("Amine" défiant le joueur) :
1. **vs Machine (Solo)** : Affrontez la machine alimentée par la stratégie *Never Lose*. Elle ne perd jamais (100% de victoires ou de matchs nuls garantis).
2. **vs Sahbi (2 Joueurs en local)** : Jouez entre amis sur le même écran avec suivi des scores en direct.

L'interface reste épurée, amusante et concentrée sur le jeu et le défi.

---

## 🧠 Le Moteur IA : La Stratégie "Never Lose"

*Implémentée dans [`src/app/lib/minimax.ts`](./src/app/lib/minimax.ts) d'après l'analyse mathématique de [TicTacToeFun](https://tictactoefun.com/blog/how-to-never-lose.html).*

### 1. Le constat mathématique
Le Tic-Tac-Toe est un **jeu résolu** (*solved game*). Avec un jeu optimal, **l'issue est obligatoirement un match nul**. Aucun joueur ne peut forcer la victoire face à un adversaire sans erreur. Le moteur du jeu applique cette stratégie pour garantir qu'il ne perd jamais.

### 2. Les 2 règles d'or (résolvent 95% des parties)
Le moteur vérifie ces deux règles en priorité absolue avant tout autre calcul :
- **Règle 1 : Gagner dès que possible (*Win if you can*)**  
  Dès que la machine a deux pions alignés et la 3ᵉ case vide, elle joue là et gagne immédiatement.
- **Règle 2 : Bloquer la menace immédiate (*Block if you must*)**  
  Dès que le joueur humain a deux pions alignés, la machine bloque impérativement la 3ᵉ case.

### 3. La force des cases
Le moteur exploite la valeur mathématique de chaque case :
| Type de case | Lignes gagnantes couvertes | Détail | Valeur stratégique |
| :--- | :---: | :--- | :--- |
| **Centre (1 case)** | **4 lignes** | 2 diagonales + ligne milieu + colonne milieu | ⭐⭐⭐ **La plus forte** |
| **Coins (4 cases)** | **3 lignes** | 1 ligne + 1 colonne + 1 diagonale | ⭐⭐ **Très fort** |
| **Bordures (4 cases)** | **2 lignes** | 1 ligne + 1 colonne seulement | ⭐ **Le plus faible** |

### 4. L'arbre décisionnel des 8 priorités
Quand les Règles 1 et 2 ne s'appliquent pas, l'IA suit cet ordre strict :
1. **Créer une fourchette (*Fork*)** : Créer 2 menaces d'alignement simultanées.
2. **Bloquer la fourchette adverse** : Empêcher l'adversaire de créer un double piège.
3. **Prendre le centre** : Occuper la case maîtresse (4 lignes gagnantes).
4. **Prendre le coin opposé** : En réponse à un coin pris par l'adversaire.
5. **Prendre un coin vide** : (3 lignes gagnantes chacun).
6. **Prendre une bordure vide** : (2 lignes gagnantes chacune).
7. **Recherche Minimax** : Résolution exhaustive en cas de cas complexe.

### 5. Tactique d'ouverture et de défense
- **Quand la machine commence (X) :**
  - **Coup 1** : Ouverture au **Centre** (recommandation n°1 du guide TicTacToeFun).
  - **Coup 3 (si l'humain prend un coin)** : La machine prend le **coin diagonalement opposé**, préparant une fourchette imparable.
  - **Coup 3 (si l'humain prend une bordure)** : Erreur de l'humain, la machine exploite immédiatement pour forcer la victoire.
- **Quand la machine joue en second (O) :**
  - Si l'humain joue le Centre ➔ La machine prend un **Coin** (vital pour ne pas perdre).
  - Si l'humain joue un Coin ➔ La machine prend impérativement le **Centre**.
  - Si l'humain joue une Bordure ➔ La machine prend le **Centre**.

---

## 🎮 Modes de Jeu

* **Solo (vs Machine)** : Défiez l'IA imbattable. Vous pouvez choisir qui commence ("nta lawel" ou "ana lawel").
* **2 Joueurs (vs Sahbi)** : Joueur X contre Joueur O avec suivi des scores en local (`localStorage`).

---

## 🛠️ Architecture du Code

```
xoxo-game/
├── src/
│   └── app/
│       ├── lib/
│       │   └── minimax.ts          # Cerveau IA : Stratégie Never Lose + Arbre décisionnel + Minimax
│       ├── jeu/
│       │   ├── page.tsx            # Interface de jeu avec taunts en Darija
│       │   └── game.module.css     # Design responsive de la grille de jeu
│       ├── globals.css             # Variables, thèmes et animations globales
│       ├── page.tsx                # Page d'accueil narrative et choix du mode
│       ├── page.module.css         # Styles de l'accueil
│       └── layout.tsx              # Layout global avec métadonnées
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Installation & Démarrage

```bash
# Cloner le dépôt
git clone https://github.com/mohamedkhoran-lab/xoxo-game.git
cd xoxo-game

# Installer les dépendances
npm install

# Démarrer en local
npm run dev
```

Rendez-vous sur [http://localhost:3000](http://localhost:3000).

---

## 📖 Références & Crédits

* Stratégie mathématique basée sur le guide : [How to Never Lose at Tic-Tac-Toe — TicTacToeFun](https://tictactoefun.com/blog/how-to-never-lose.html)
* Conçu et développé par **Amine** (2026).
