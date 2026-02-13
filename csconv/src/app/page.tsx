"use client";

import { useState } from "react";
import styles from "./page.module.css";

const SAMPLE_JAVA = `public class Main {
  public static void main(String[] args) {
    int sum = 0;
    for (int i = 0; i < 5; i++) {
      sum = sum + i;
    }
    System.out.println(sum);
  }
}`;

const pseudoFromSample = [
  "PROGRAM main",
  "  DECLARE sum ← 0",
  "  FOR i ← 0 TO 4 STEP 1",
  "    sum ← sum + i",
  "  END FOR",
  "  OUTPUT sum",
  "END PROGRAM",
].join("\n");

export default function Home() {
  const [javaInput, setJavaInput] = useState<string>(SAMPLE_JAVA);
  const [pseudocode, setPseudocode] = useState<string>(pseudoFromSample);
  const [status, setStatus] = useState<"idle" | "working">("idle");

  const handleConvert = async () => {
    setStatus("working");
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: javaInput }),
      });
      const data = await response.json();
      if (data?.errors?.length) {
        const formatted = data.errors
          .map((e: { stage: string; message: string; line?: number; column?: number }) => {
            const line = e.line ?? 1;
            const column = e.column ?? 1;
            return `[${e.stage}] ${e.message} (${line}:${column})`;
          })
          .join("\n");
        setPseudocode(formatted);
      } else {
        setPseudocode(data?.pseudocode || "");
      }
    } catch (error) {
      setPseudocode("Error: failed to convert input.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className={styles.page}>
        <div className={styles.topBar}>
          <div className={styles.logoMark}>PseudoCraft</div>
          <div className={styles.topActions}>
            <div className={styles.actionItem}>
              <button type="button" className={styles.topButton}>
                About us
              </button>
              <div className={styles.dropdown}>
                <p className={styles.dropdownTitle}>About us</p>
                <p className={styles.dropdownText}>
                  We build teaching tools bridging Java fundamentals to IB-style
                  pseudocode. Clarity first: normalization, tokenization,
                  iterative AST building, and readable output.
                </p>
              </div>
            </div>
            <div className={styles.actionItem}>
              <button type="button" className={styles.topButton}>
                Product information
              </button>
              <div className={styles.dropdown}>
                <p className={styles.dropdownTitle}>Product information</p>
                <p className={styles.dropdownText}>
                  Paste Java, hit convert, and get structured pseudocode. Current
                  build is mocked; the full pipeline will enforce scope, validate
                  syntax, and emit IB-formatted output via pre-order traversal.
                </p>
              </div>
            </div>
          </div>
        </div>
        <main className={styles.shell}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>IB pseudocode lab</p>
              <h1>PseudoCraft</h1>
            </div>
            <div className={styles.status}>
              <span className={status === "working" ? styles.pulse : ""} />
              <p>{status === "working" ? "Converting…" : "Ready"}</p>
            </div>
        </header>

        <section className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.label}>Java input</p>
              <p className={styles.hint}>Paste code or start with the sample.</p>
            </div>
            <textarea
              aria-label="Java input"
              value={javaInput}
              onChange={(event) => setJavaInput(event.target.value)}
              className={styles.textarea}
            />
          </div>

          <div className={styles.convert}>
            <div className={styles.convertFlow}>{"→"}</div>
            <button
              type="button"
              onClick={handleConvert}
              className={styles.convertButton}
              disabled={status === "working"}
            >
              Convert
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.label}>Pseudocode output</p>
              <p className={styles.hint}>Pre-order traversal view (mocked).</p>
            </div>
            <textarea
              aria-label="Pseudocode output"
              value={pseudocode}
              readOnly
              className={`${styles.textarea} ${styles.output}`}
            />
          </div>
        </section>

      </main>
    </div>
  );
}
