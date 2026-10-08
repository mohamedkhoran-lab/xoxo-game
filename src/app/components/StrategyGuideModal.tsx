"use client";

import { useState, useEffect } from "react";
import styles from "./strategy-guide.module.css";
import { STRATEGY_GUIDE_DATA } from "../lib/minimax";

interface StrategyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "rules" | "priority" | "first" | "second" | "forks" | "mistakes";

export default function StrategyGuideModal({
  isOpen,
  onClose,
}: StrategyGuideModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("rules");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles["modal-overlay"]}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
    >
      <div className={styles["modal-card"]}>
        {/* Modal Header */}
        <div className={styles["modal-header"]}>
          <div className={styles["header-title-box"]}>
            <span className={styles["header-icon"]}>🧠</span>
            <div>
              <h2 id="guide-title" className={styles["modal-title"]}>
                Guide : Comment Ne Jamais Perdre à XO
              </h2>
              <p className={styles["modal-subtitle"]}>
                Stratégie complète inspirée du guide officiel TicTacToeFun
              </p>
            </div>
          </div>
          <button
            className={styles["close-btn"]}
            onClick={onClose}
            aria-label="Fermer le guide"
            id="btn-close-strategy-guide"
          >
            ✕
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className={styles["modal-tabs"]}>
          <button
            className={`${styles["tab-btn"]} ${activeTab === "rules" ? styles.active : ""}`}
            onClick={() => setActiveTab("rules")}
          >
            🎯 2 Règles d'or
          </button>
          <button
            className={`${styles["tab-btn"]} ${activeTab === "priority" ? styles.active : ""}`}
            onClick={() => setActiveTab("priority")}
          >
            🔢 8 Priorités
          </button>
          <button
            className={`${styles["tab-btn"]} ${activeTab === "first" ? styles.active : ""}`}
            onClick={() => setActiveTab("first")}
          >
            ⚔️ Joueur 1 (X)
          </button>
          <button
            className={`${styles["tab-btn"]} ${activeTab === "second" ? styles.active : ""}`}
            onClick={() => setActiveTab("second")}
          >
            🛡️ Joueur 2 (O)
          </button>
          <button
            className={`${styles["tab-btn"]} ${activeTab === "forks" ? styles.active : ""}`}
            onClick={() => setActiveTab("forks")}
          >
            🔱 Fourchettes (Fork)
          </button>
          <button
            className={`${styles["tab-btn"]} ${activeTab === "mistakes" ? styles.active : ""}`}
            onClick={() => setActiveTab("mistakes")}
          >
            ⚠️ Pièges fréquents
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles["modal-body"]}>
          {/* TAB 1: 2 REGLES D'OR */}
          {activeTab === "rules" && (
            <>
              <div className={styles["callout-box"]}>
                <span className={styles["callout-icon"]}>✨</span>
                <div className={styles["callout-text"]}>
                  <h4>Le jeu XO est mathématiquement résolu !</h4>
                  <p>
                    Avec un jeu parfait de part et d'autre, le résultat est{" "}
                    <strong>toujours un match nul</strong>. Tu ne peux pas perdre
                    si tu appliques rigoureusement cette hiérarchie de coups.
                  </p>
                </div>
              </div>

              <div className={styles["rule-card"]}>
                <span className={`${styles["rule-badge"]} ${styles.gold}`}>
                  Règle 1
                </span>
                <div className={styles["rule-content"]}>
                  <h4>Gagne toujours si tu peux (Win if you can)</h4>
                  <p>
                    Si tu as deux pions alignés et la 3ème case vide : joue là et
                    termine la partie immédiatement ! Ne te laisse pas distraire
                    par les mouvements adverses.
                  </p>
                </div>
              </div>

              <div className={styles["rule-card"]}>
                <span className={`${styles["rule-badge"]} ${styles.pink}`}>
                  Règle 2
                </span>
                <div className={styles["rule-content"]}>
                  <h4>Bloque toujours si tu dois (Block if you must)</h4>
                  <p>
                    Si ton adversaire a deux pions dans une ligne, ta priorité
                    absolue numéro 1 est de bloquer la troisième case. Aucune
                    autre action n'est permise.
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.6rem" }}>
                  ⚖️ Valeur stratégique des cases (Lignes gagnantes)
                </h4>
                <div className={styles["strength-grid"]}>
                  {STRATEGY_GUIDE_DATA.squarePower.map((sq, i) => (
                    <div key={i} className={styles["strength-card"]}>
                      <span className={styles["strength-name"]}>{sq.name}</span>
                      <span className={styles["strength-lines"]}>{sq.lines}</span>
                      <span className={styles["strength-tag"]}>{sq.tag}</span>
                      <span className={styles["strength-detail"]}>{sq.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: 8 PRIORITES */}
          {activeTab === "priority" && (
            <>
              <div className={styles["callout-box"]}>
                <span className={styles["callout-icon"]}>📜</span>
                <div className={styles["callout-text"]}>
                  <h4>La hiérarchie absolue des coups (1 à 8)</h4>
                  <p>
                    Lorsque ni la Règle 1 (Gagner) ni la Règle 2 (Bloquer) ne
                    s'appliquent, vérifie cette liste de haut en bas sans sauter
                    d'étape.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {STRATEGY_GUIDE_DATA.priorityList.map((item) => (
                  <div key={item.step} className={styles["rule-card"]}>
                    <span className={styles["rule-badge"]}>#{item.step}</span>
                    <div className={styles["rule-content"]}>
                      <h4>{item.name}</h4>
                      <p>{item.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 3: JOUEUR 1 (X) */}
          {activeTab === "first" && (
            <>
              <div className={styles["callout-box"]}>
                <span className={styles["callout-icon"]}>👑</span>
                <div className={styles["callout-text"]}>
                  <h4>Tu commences la partie (Tu joues X)</h4>
                  <p>
                    Avoir le premier coup offre l'initiative. Le guide
                    TicTacToeFun recommande vivement l'ouverture au{" "}
                    <strong>Centre</strong>.
                  </p>
                </div>
              </div>

              {/* Demo 1: Center move */}
              <div className={styles["demo-board-container"]}>
                <div className={styles["demo-board"]} aria-hidden="true">
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={`${styles["demo-cell"]} ${styles.x}`}>X</span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                </div>
                <p className={styles["demo-caption"]}>
                  <strong>Coup 1 recommandé :</strong> X ouvre au centre, contrôlant
                  les 2 diagonales, la ligne centrale et la colonne centrale (4
                  lignes).
                </p>
              </div>

              {/* Demo 2: Opposite corner */}
              <div className={styles["demo-board-container"]}>
                <div className={styles["demo-board"]} aria-hidden="true">
                  <span className={`${styles["demo-cell"]} ${styles.o}`}>O</span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={`${styles["demo-cell"]} ${styles.x}`}>X</span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={`${styles["demo-cell"]} ${styles.x}`}>X</span>
                </div>
                <p className={styles["demo-caption"]}>
                  <strong>Coup 3 (si O prend un coin) :</strong> X joue le coin
                  diagonalement opposé. Cela prépare une fourchette imparable.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {STRATEGY_GUIDE_DATA.openings.firstPlayerX.map((op, i) => (
                  <div key={i} className={styles["rule-card"]}>
                    <span className={`${styles["rule-badge"]} ${styles.gold}`}>
                      {op.move}
                    </span>
                    <div className={styles["rule-content"]}>
                      <h4>{op.action}</h4>
                      <p>{op.why}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 4: JOUEUR 2 (O) */}
          {activeTab === "second" && (
            <>
              <div className={styles["callout-box"]}>
                <span className={styles["callout-icon"]}>🛡️</span>
                <div className={styles["callout-text"]}>
                  <h4>Tu joues en second (Tu joues O) — La défense parfaite</h4>
                  <p>
                    Jouer en 2ème exige une précision absolue dès le premier
                    coup pour forcer le match nul ou profiter d'une bévue de X.
                  </p>
                </div>
              </div>

              {/* Demo O defense vs corner */}
              <div className={styles["demo-board-container"]}>
                <div className={styles["demo-board"]} aria-hidden="true">
                  <span className={`${styles["demo-cell"]} ${styles.x}`}>X</span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={`${styles["demo-cell"]} ${styles.o}`}>O</span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                </div>
                <p className={styles["demo-caption"]}>
                  <strong>Règle d'or pour O :</strong> Si X commence dans un coin,
                  O DOIT immédiatement prendre le <strong>centre</strong>. Tout
                  autre coup est une défaite forcée !
                </p>
              </div>

              {/* Demo O defense vs center */}
              <div className={styles["demo-board-container"]}>
                <div className={styles["demo-board"]} aria-hidden="true">
                  <span className={`${styles["demo-cell"]} ${styles.o}`}>O</span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={`${styles["demo-cell"]} ${styles.x}`}>X</span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={styles["demo-cell"]}></span>
                </div>
                <p className={styles["demo-caption"]}>
                  <strong>Si X ouvre au centre :</strong> O DOIT répondre dans un{" "}
                  <strong>coin</strong>, JAMAIS sur une bordure !
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {STRATEGY_GUIDE_DATA.openings.secondPlayerO.map((op, i) => (
                  <div key={i} className={styles["rule-card"]}>
                    <span className={`${styles["rule-badge"]} ${styles.pink}`}>
                      O
                    </span>
                    <div className={styles["rule-content"]}>
                      <h4>{op.trigger} → {op.mustDo}</h4>
                      <p style={{ color: "var(--orange)", fontWeight: 600 }}>
                        {op.warning}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 5: FORKS */}
          {activeTab === "forks" && (
            <>
              <div className={styles["callout-box"]}>
                <span className={styles["callout-icon"]}>🔱</span>
                <div className={styles["callout-text"]}>
                  <h4>Qu'est-ce qu'une Fourchette (Fork) ?</h4>
                  <p>
                    Une <strong>fourchette</strong> est un coup qui crée deux
                    menaces de 2-en-ligne indépendantes simultanément. Comme
                    l'adversaire ne peut bloquer qu'une seule menace au tour
                    suivant, la victoire est garantie !
                  </p>
                </div>
              </div>

              {/* Demo Fork */}
              <div className={styles["demo-board-container"]}>
                <div className={styles["demo-board"]} aria-hidden="true">
                  <span className={`${styles["demo-cell"]} ${styles.x}`}>X</span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={`${styles["demo-cell"]} ${styles.highlight}`}>
                    X
                  </span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={`${styles["demo-cell"]} ${styles.x}`}>X</span>
                  <span className={`${styles["demo-cell"]} ${styles.o}`}>O</span>
                  <span className={styles["demo-cell"]}></span>
                  <span className={`${styles["demo-cell"]} ${styles.o}`}>O</span>
                  <span className={`${styles["demo-cell"]} ${styles.x}`}>X</span>
                </div>
                <p className={styles["demo-caption"]}>
                  <strong>Exemple de Fourchette :</strong> X joue dans le coin en
                  haut à droite (jaune). X menace à la fois la ligne du haut (X _
                  X) et la diagonale (X X X). O ne peut en bloquer qu'une seule !
                </p>
              </div>

              <div className={styles["rule-card"]}>
                <span className={styles["rule-badge"]}>Conseil</span>
                <div className={styles["rule-content"]}>
                  <h4>Comment contrer une fourchette ?</h4>
                  <p>
                    Anticipe 1 coup à l'avance ! Si ton adversaire prépare un
                    fork, crée immédiatement une menace directe ailleurs qui le
                    forcera à parer au lieu de poser sa fourchette.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* TAB 6: PIEGES A EVITER */}
          {activeTab === "mistakes" && (
            <>
              <div className={styles["callout-box"]}>
                <span className={styles["callout-icon"]}>🚨</span>
                <div className={styles["callout-text"]}>
                  <h4>Les 5 erreurs classiques des joueurs occasionnels</h4>
                  <p>
                    En évitant simplement ces 5 pièges documentés par le guide,
                    perdre deviendra impossible.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {STRATEGY_GUIDE_DATA.commonMistakes.map((mistake, i) => (
                  <div key={i} className={styles["mistake-item"]}>
                    <span className={styles["mistake-icon"]}>⚠️</span>
                    <span>{mistake}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className={styles["modal-footer"]}>
          <div className={styles["source-credit"]}>
            Stratégie documentée d'après{" "}
            <a
              href="https://tictactoefun.com/blog/how-to-never-lose.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              TicTacToeFun Strategy Guide
            </a>
          </div>
          <button
            className={`btn-primary ${styles["footer-action-btn"]}`}
            onClick={onClose}
            id="btn-understand-strategy"
          >
            J'ai compris, je joue ! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
