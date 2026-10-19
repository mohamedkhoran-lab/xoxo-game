"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import styles from "./memory.module.css";

const EMOJIS = ["🦁", "🐯", "🦊", "🐸", "🐧", "🦋", "🌈", "🎯", "🍕", "🎸", "🚀", "🌸", "💎", "🏆", "🎭", "🌺"];

interface Card {
  id: number;
  emoji: string;
  pairId: number;
}

function shuffleCards(): Card[] {
  const pairs = EMOJIS.slice(0, 8);
  const doubled = [...pairs, ...pairs];
  // Fisher-Yates shuffle
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((emoji, i) => ({ id: i, emoji, pairId: pairs.indexOf(emoji) }));
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: ["#a29bfe", "#6c63ff", "#fd79a8", "#00cec9", "#f9ca24", "#55efc4"][Math.floor(Math.random() * 6)],
    delay: Math.random() * 2,
    size: 8 + Math.random() * 10,
    shape: Math.random() > 0.5 ? "50%" : "2px",
  }));
  return (
    <>
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: "fixed",
            left: `${p.left}%`,
            top: "-10px",
            background: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
            animation: "confettiFall 3s ease-in forwards",
            animationDelay: `${p.delay}s`,
            pointerEvents: "none",
            zIndex: 999,
          }}
        />
      ))}
    </>
  );
}

function MemoryContent() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>(shuffleCards);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0); // Max 3 fautes
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState<"ready" | "preview" | "playing" | "gameover" | "won">("ready");
  const [countdown, setCountdown] = useState(7);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Start 7-second preview mode
  const startMemorize = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const newCards = shuffleCards();
    setCards(newCards);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setMistakes(0);
    setLocked(true);
    setPhase("preview");
    setCountdown(7);

    let left = 7;
    timerRef.current = setInterval(() => {
      left -= 1;
      setCountdown(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase("playing");
        setLocked(false);
      }
    }, 1000);
  }, []);

  const handleClick = useCallback(
    (id: number) => {
      if (phase !== "playing" || locked || flipped.includes(id) || matched.has(cards[id].pairId)) {
        return;
      }

      const newFlipped = [...flipped, id];
      setFlipped(newFlipped);

      if (newFlipped.length === 2) {
        setMoves(m => m + 1);
        setLocked(true);
        const [a, b] = newFlipped;

        if (cards[a].pairId === cards[b].pairId) {
          // MATCH !
          const newMatched = new Set(matched);
          newMatched.add(cards[a].pairId);
          setMatched(newMatched);
          setFlipped([]);
          setLocked(false);

          if (newMatched.size === 8) {
            setPhase("won");
          }
        } else {
          // FAUSSE / MISMATCH
          const nextMistakes = mistakes + 1;
          setMistakes(nextMistakes);

          setTimeout(() => {
            setFlipped([]);
            if (nextMistakes >= 3) {
              setPhase("gameover");
            } else {
              setLocked(false);
            }
          }, 900);
        }
      }
    },
    [phase, locked, flipped, matched, cards, mistakes]
  );

  const isCardVisible = (id: number) => {
    if (phase === "preview" || phase === "gameover") return true;
    return flipped.includes(id) || matched.has(cards[id].pairId);
  };

  const isMatched = (id: number) => matched.has(cards[id].pairId);

  return (
    <main className={styles["memory-page"]}>
      {phase === "won" && <Confetti />}

      {/* Header */}
      <div className={styles["memory-header"]}>
        <button
          className={`${styles["back-link"]} btn-ghost`}
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            router.push("/?select=1");
          }}
          id="btn-memory-back"
        >
          ← Rja3
        </button>
        <div className={styles["memory-logo"]}>
          <span className="gradient-text">Memory 🃏</span>
        </div>
        <div className={styles["badge-memory"]}>Mémoire</div>
      </div>

      {/* Stats bar */}
      <div className={styles["stats-bar"]}>
        <div className={styles["stat-item"]}>
          <span className={styles["stat-label"]}>Trouvés</span>
          <span className={styles["stat-value"]}>{matched.size}/8</span>
        </div>
        <span className={styles["stat-divider"]}>·</span>
        <div className={styles["stat-item"]}>
          <span className={styles["stat-label"]}>Fautes</span>
          <div className={styles["fautes-dots"]}>
            {[1, 2, 3].map(num => (
              <div
                key={num}
                className={`${styles["faute-dot"]} ${num > mistakes ? styles.empty : ""}`}
                title={`Faute ${num}`}
              />
            ))}
          </div>
        </div>
        <span className={styles["stat-divider"]}>·</span>
        <div className={styles["stat-item"]}>
          <span className={styles["stat-label"]}>Coups</span>
          <span className={styles["stat-value"]}>{moves}</span>
        </div>
      </div>

      {/* Status banner */}
      <div
        className={`${styles["status-banner"]} ${
          phase === "preview"
            ? styles.preview
            : phase === "won"
            ? styles.won
            : phase === "gameover"
            ? styles.lost
            : ""
        }`}
      >
        {phase === "ready" && "glaab les cartes bech tal9a khtha"}
        {phase === "preview" && `⏳ Mémorise mlih : ${countdown}s restants !`}
        {phase === "playing" && "glaab les cartes bech tal9a khtha"}
        {phase === "won" && `🎉 Bravo ! Rba7t w chafit 3lihoum !`}
        {phase === "gameover" && "eliminé sahbi eliminé"}
      </div>

      {/* Start Button when ready or gameover */}
      {(phase === "ready" || phase === "gameover" || phase === "won") && (
        <button
          id="btn-start-memorize"
          className={styles["btn-start-memorize"]}
          onClick={startMemorize}
        >
          ▶ Bda Tel3eb (7s pour mémoriser)
        </button>
      )}

      {/* Cards Grid */}
      <div className={styles["cards-grid"]}>
        {cards.map(card => (
          <div
            key={card.id}
            id={`card-${card.id}`}
            className={[
              styles.card,
              isCardVisible(card.id) ? styles.flipped : "",
              isMatched(card.id) ? styles.matched : "",
            ].join(" ")}
            onClick={() => handleClick(card.id)}
            role="button"
            aria-label={isCardVisible(card.id) ? card.emoji : "Carte cachée"}
          >
            <div className={styles["card-inner"]}>
              <div className={styles["card-front"]}>?</div>
              <div className={styles["card-back"]}>{card.emoji}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={styles["memory-actions"]}>
        <div className={styles["action-row"]}>
          <button
            id="btn-memory-restart"
            className={`${styles["action-btn"]} ${styles["btn-restart"]}`}
            onClick={startMemorize}
          >
            🔄 Nouvelle Partie
          </button>
        </div>
        <button
          id="btn-memory-menu"
          className="btn-secondary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            router.push("/?select=1");
          }}
        >
          🏠 Changer de jeu
        </button>
      </div>
    </main>
  );
}

export default function MemoryPage() {
  return (
    <Suspense
      fallback={
        <div
          className="page-wrapper"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}
        >
          <div style={{ fontSize: "3rem" }}>⏳</div>
        </div>
      }
    >
      <MemoryContent />
    </Suspense>
  );
}
