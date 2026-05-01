# NeuralTrack

**Cognitive Load via Motor Precision** — A browser-based ecological motor phenotyping platform built for cognitive neuroscience research.

---

## Overview

NeuralTrack implements a **Fitts's Law serial targeting paradigm** to measure kinematic micro-variability as a quantitative proxy for cognitive load. By analyzing mouse movement trajectories across 10 precision trials, the platform derives per-trial motor metrics and aggregates them into a **motor phenotype profile**.

This tool was developed as part of a master's research project in **Computational Cognitive Neuroscience**.

---

## Scientific Background

The paradigm is grounded in established motor control literature:

| Reference | Contribution |
|-----------|-------------|
| Fitts, P.M. (1954) | Information capacity of the human motor system — the foundational ID formula |
| Welford, A.T. (1968) | Refinement of the speed-accuracy trade-off model |
| MacKenzie, I.S. (1992) | Throughput as a unified performance metric |

**Fitts's Law:** `ID = log₂(2D / W)`
where `D` = Euclidean distance to target, `W` = target width (diameter).

---

## Metrics Captured

| Metric | Description |
|--------|-------------|
| **Reaction Time (RT)** | Time between target appearance and first mouse movement |
| **Movement Time (MT)** | Time between first movement and target click |
| **Straightness Index (SI)** | `actual_path_length / euclidean_distance` — closer to 1.00 = less jitter |
| **Fitts Throughput (TP)** | `ID / MT` expressed in bits per second (bps) |
| **Cognitive Load Score** | Composite index derived from normalized RT, SI, and TP |

---

## Application Structure

```
neuraltrack/
├── src/
│   └── App.jsx           # Full application — Welcome · Experiment · Dashboard
├── index.html            # Entry point
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
└── vite.config.ts        # Vite build configuration
```

### Screen Flow

```
Welcome Screen
    ↓  Subject ID (optional) + "Initialize Protocol"
Experiment Screen
    ↓  10 serial targeting trials — real-time trajectory tracking
Results Dashboard
    ↓  Motor profile · Velocity chart · Scatter plot · JSON export
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Language | JavaScript (JSX) |
| Styling | IBM Plex font family + inline CSS design tokens |
| Charts | Native HTML Canvas API |
| Data export | Client-side JSON blob download |

---

## Running Locally

```bash
# Clone the repository
git clone https://github.com/your-username/neuraltrack.git
cd neuraltrack

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Methodological Limitations

This tool is designed for ecological research contexts. The following constraints must be acknowledged before drawing scientific conclusions:

- **Sampling frequency** — Browser event loop limits sampling to ~60Hz. Clinical-grade systems operate at 1000Hz, making sub-millisecond precision unavailable in this environment.
- **Hardware bias** — Motor metrics vary significantly between input devices (high-DPI gaming mouse vs. laptop trackpad). No hardware normalization is applied.
- **DOM latency** — JavaScript is not a hard real-time system (RTOS). Non-deterministic event loop delays affect timestamp precision.
- **Ecological validity** — Screen-based 2D targeting does not fully replicate physical manipulation or pen-tablet paradigms used in clinical motor assessments.
- **Sample size** — n=10 trials per session is insufficient for clinical-grade inference. A minimum of n=50 trials is recommended for research use.

---

## Data Export

Each session can be exported as a structured `.json` file containing:

```json
{
  "meta": {
    "tool": "NeuralTrack v1.0",
    "protocol": "Fitts's Law Serial Targeting",
    "subject": "S-001",
    "date": "2026-04-30T...",
    "references": ["Fitts (1954)", "Welford (1968)", "MacKenzie (1992)"]
  },
  "summary": {
    "meanRT": 342,
    "meanMT": 487,
    "meanSI": 1.084,
    "meanTP": 4.72,
    "cognitiveLoadScore": 29,
    "loadLabel": "Low"
  },
  "trials": [ ... ]
}
```

---

## Disclaimer

> **For research purposes only — Non-clinical tool.**
> NeuralTrack is not a medical device and should not be used for clinical diagnosis or treatment decisions. All data processing occurs client-side; no data is transmitted to any server.

---

## License

MIT License — free to use, modify, and distribute with attribution.
