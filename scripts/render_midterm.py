"""Render the midterm extension using public aggregates and existing figure styles."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

from render_figures import apply_publication_style, finalize_figure, footnote

ROOT = Path(__file__).resolve().parents[1]


def colors(web):
    return ("#ed977b", "#d9bc7d", "#bcb1a7") if web else ("#BD3D24", "#967222", "#685C52")


def finish(fig, out, name, title, lines, mobile, web):
    fig.subplots_adjust(left=.33 if mobile else .26, right=.86, top=.81, bottom=.24)
    footnote(fig, lines, web=web)
    finalize_figure(fig, out / (name + ("-mobile" if mobile else "")), title, web=web)


def distribution(d, out, mobile=False, web=False):
    accent, _, muted = colors(web)
    fig, ax = plt.subplots(figsize=(6.6, 6.8) if mobile else (10, 6.2))
    rows = d["distribution"]
    ax.barh(range(len(rows)), [r["n"] for r in rows], color=accent, height=.48)
    for y, row in enumerate(rows):
        ax.text(row["n"]+.2, y, f"{row['n']} students", va="center", fontsize=12)
    ax.set_yticks(range(len(rows)), [r["label"] for r in rows])
    ax.invert_yaxis()
    ax.set_xlim(0, max(r["n"] for r in rows)+3.4)
    ax.set_xticks([0, 5, 10])
    ax.set_xlabel("Students in the available grade excerpt")
    ax.spines["left"].set_visible(False)
    ax.tick_params(axis="y", length=0)
    ax.grid(axis="x", alpha=.16)
    ax.set_axisbelow(True)
    fig.text(.04, .94, "Midterm scores / partial cohort", fontsize=16, weight="bold")
    fig.text(.04, .87, f"n = {d['matched']} of {d['eligible_roster']} eligible roster members  ·  Mean {d['mean']:.2f}", fontsize=12, color=muted)
    finish(fig, out, "05-midterm-distribution", "Midterm score distribution in the available excerpt",
           ["Canvas raw points; nominal maximum 100. Scores above 100 retained.",
            "Bins are categories of unequal width. Every positive bin has at least 5 students.",
            "15 roster members are not in the supplied excerpt; their grades are unknown."], mobile, web)


def associations(d, out, mobile=False, web=False):
    accent, gold, muted = colors(web)
    fig = plt.figure(figsize=(6.8, 11.8) if mobile else (10.8, 9.1))
    left = .35 if mobile else .28
    width = .42 if mobile else .49
    rows = sorted(d["associations"],
                  key=lambda row: {"late_pct": 0, "attempts": 1, "first_score": 2}[row["metric"]])
    labels = ["Final-24h\nsubmission share", "Submission\ncount",
              "Mean first\nsubmission score"]
    headings = [
        "A  Full cohort · dot = ρ, bar = 95% bootstrap interval",
        "B  Leave-one-out range · hollow dot = full estimate",
        "C  Subsets · diamond = all slots; square = omit discrepancies",
    ]
    axes = []
    for bottom, heading_y, heading in zip((.68, .43, .18), (.865, .615, .365), headings):
        fig.text(.04, heading_y, heading, fontsize=10 if mobile else 11,
                 weight="bold")
        ax = fig.add_axes((left, bottom, width, .145))
        ax.set_xlim(-1, 1)
        ax.set_ylim(-.45, 2.45)
        ax.set_yticks((2, 1, 0), labels)
        ax.set_xticks((-1, 0, 1) if mobile else (-1, -.5, 0, .5, 1))
        ax.axvline(0, color=muted, ls="--", lw=1)
        ax.axhspan(1.65, 2.35, color=accent, alpha=.055, zorder=0)
        ax.grid(axis="x", alpha=.13)
        ax.set_axisbelow(True)
        ax.spines["left"].set_visible(False)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.tick_params(axis="y", length=0, pad=9, labelsize=10 if mobile else 11)
        if len(axes) < 2:
            ax.tick_params(axis="x", labelbottom=False, bottom=False)
            ax.spines["bottom"].set_visible(False)
        axes.append(ax)

    for i, row in enumerate(rows):
        y = 2 - i
        low, high = row["bootstrap_interval"]
        axes[0].plot((low, high), (y, y), color=accent, lw=3,
                     solid_capstyle="round")
        axes[0].plot(row["rho"], y, "o", color=accent, ms=8)
        axes[0].text(1.04, y, f"{row['rho']:+.2f}",
                     transform=axes[0].get_yaxis_transform(), va="center",
                     fontsize=11, weight="bold")

        low, high = row["leave_one_out_range"]
        axes[1].plot((low, high), (y, y), color=gold, lw=2)
        axes[1].plot((low, high), (y, y), "|", color=gold, ms=9)
        axes[1].plot(row["rho"], y, "o", mfc="none", mec=gold, mew=1.5, ms=7)
        axes[1].text(1.04, y, f"{low:+.2f} to {high:+.2f}",
                     transform=axes[1].get_yaxis_transform(), va="center",
                     fontsize=9 if mobile else 10)

        complete = row["complete_problem_coverage"]["rho"]
        consistent = row["without_homework_discrepancies"]["rho"]
        axes[2].plot(complete, y + .12, "D", color=accent, ms=7)
        axes[2].plot(consistent, y - .12, "s", color=gold, ms=7)
        axes[2].text(1.04, y, f"{complete:+.2f} / {consistent:+.2f}",
                     transform=axes[2].get_yaxis_transform(), va="center",
                     fontsize=9 if mobile else 10)

    axes[2].set_xlabel("Spearman ρ with midterm score", labelpad=8)
    fig.text(.04, .967, "Deadline timing and exam / robustness", fontsize=16,
             weight="bold")
    fig.text(.04, .925, f"{d['matched']} of {d['eligible_roster']} eligible students have supplied grades",
             fontsize=11, color=muted)
    footnote(fig, [
        "A: 5,000 paired-student bootstrap draws; intervals reflect resampling variability.",
        "B: 26 re-fits of n=25; the line is a range, not a confidence interval.",
        "C: all 23 slots n=23; omit two discrepancies n=24. Exploratory, unadjusted associations.",
    ], y=.025, web=web)
    finalize_figure(fig, out / ("06-midterm-associations" +
                               ("-mobile" if mobile else "")),
                    "Homework behavior and midterm association robustness", web=web)


def groups(d, out, mobile=False, web=False):
    accent, gold, muted = colors(web)
    fig, ax = plt.subplots(figsize=(6.6, 7) if mobile else (10, 6.4))
    for y, row in enumerate(d["attempt_groups"]):
        ax.add_patch(Rectangle((row["q1"], y-.2), row["q3"]-row["q1"], .4,
                              facecolor=accent, alpha=.3, edgecolor=accent, lw=1.5))
        ax.plot([row["median"]]*2, [y-.22, y+.22], color=accent, lw=3)
        ax.plot(row["mean"], y, "D", color=gold, ms=6)
        ax.text(1.02, y, f"n={row['n']}", transform=ax.get_yaxis_transform(), va="center", fontsize=12)
    ax.set_yticks(range(3), [r["label"] for r in d["attempt_groups"]])
    ax.set_ylim(2.65, -.65)
    ax.set_xlim(0, 110)
    ax.set_xticks([0, 25, 50, 75, 100])
    ax.set_xlabel("Midterm score / raw points")
    ax.set_ylabel("Total homework submissions", labelpad=14)
    ax.grid(axis="x", alpha=.16)
    ax.spines["left"].set_visible(False)
    ax.tick_params(axis="y", length=0)
    fig.text(.04, .94, "Different counts / overlapping scores", fontsize=16, weight="bold")
    fig.text(.04, .87, "Bands: middle 50%  ·  Lines: median  ·  Diamonds: mean", fontsize=11, color=muted)
    finish(fig, out, "07-midterm-attempt-groups", "Midterm scores grouped by homework submission count",
           ["Descriptive count groups, not ability groups or recommended targets.",
            "Quartiles: linear interpolation. No individual marks or extrema shown.",
            "Unequal groups and attempted-problem coverage limit comparison."], mobile, web)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "data/midterm-summary.json")
    args = parser.parse_args()
    d = json.loads(args.input.read_text())
    for web in (False, True):
        apply_publication_style(web)
        out = ROOT / ("assets/story" if web else "assets/figures")
        for mobile in (False, True):
            for draw in (distribution, associations, groups):
                draw(d, out, mobile, web)


if __name__ == "__main__":
    main()
