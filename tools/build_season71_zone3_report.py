"""Build a shareable, evidence-bounded Zone 3 theorycraft PDF."""

import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.platypus import (
    HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "research/evidence/season71-zone3-survival-frontier.json"
OUTPUT = ROOT / "output/pdf/season71-zone3-budget-team-report.pdf"


def build():
    data = json.loads(EVIDENCE.read_text(encoding="utf-8"))
    assert data["kind"] == "REPLAY_CONDITIONED_ENEMY_PRESSURE_NOT_CLEAR_SIM"
    assert data["candidateInitialPlayerHp"] is None
    assert data["candidateSurvivalFrontier"] is None
    assert data["observedTotalIncomingBeforeBlock"] == 17053
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    navy = colors.HexColor("#15283D")
    blue = colors.HexColor("#246A81")
    pale = colors.HexColor("#EAF3F5")
    gray = colors.HexColor("#526172")
    red = colors.HexColor("#9D422E")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleCustom", parent=styles["Title"],
                              fontName="Helvetica-Bold", fontSize=20, leading=23,
                              textColor=navy, alignment=TA_LEFT, spaceAfter=5))
    styles.add(ParagraphStyle(name="Deck", parent=styles["Normal"], fontSize=10.5,
                              leading=15, textColor=gray, spaceAfter=12))
    styles.add(ParagraphStyle(name="SectionCustom", parent=styles["Heading2"],
                              fontName="Helvetica-Bold", fontSize=11.5, leading=15,
                              textColor=blue, spaceBefore=12, spaceAfter=5,
                              keepWithNext=True))
    styles.add(ParagraphStyle(name="BodyCustom", parent=styles["Normal"],
                              fontName="Helvetica", fontSize=9.2, leading=13.4,
                              textColor=navy, spaceAfter=7))
    styles.add(ParagraphStyle(name="SmallCustom", parent=styles["Normal"],
                              fontName="Helvetica", fontSize=7.7, leading=10.5,
                              textColor=gray, spaceAfter=5))
    styles.add(ParagraphStyle(name="Cell", parent=styles["Normal"], fontSize=8.3,
                              leading=10.5, textColor=navy))
    styles.add(ParagraphStyle(name="CellHead", parent=styles["Normal"],
                              fontName="Helvetica-Bold", fontSize=8.1,
                              leading=10.2, textColor=colors.white))
    styles.add(ParagraphStyle(name="Verdict", parent=styles["Normal"],
                              fontName="Helvetica-Bold", fontSize=9.2,
                              leading=13, textColor=red))

    def para(s, kind="BodyCustom"):
        return Paragraph(s, styles[kind])

    story = [
        para("D-Tide Season 71 | Zone 3", "SmallCustom"),
        para("Budget-team feasibility report", "TitleCustom"),
        para("Replay-conditioned survival and damage screens for the Brain in a Vat encounter. "
             "Prepared from the saved replay; no account play or desktop control was used.", "Deck"),
        HRFlowable(width="100%", thickness=1.2, color=blue),
        Spacer(1, 9),
    ]

    verdict = Table([[para("VERDICT", "CellHead"),
                      para("One testable team; no verified minimum-cost or no-death clear. "
                           "Candidate player HP is unresolved, so no numerical survival "
                           "prediction is reported.", "BodyCustom")]],
                    colWidths=[0.95 * inch, 5.85 * inch])
    verdict.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), blue),
        ("BACKGROUND", (1, 0), (1, 0), pale),
        ("BOX", (0, 0), (-1, -1), 0.6, blue),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [verdict, para("Candidate and investment", "SectionCustom")]

    team = [
        ("Mouchette E3", "Area damage to boss and summons; post-Exalt Mortal Blast can gain a third hit."),
        ("Lotan E7", "One 15%-of-target-max-HP pure hit to all enemies from the E7 effect, when its action is legal."),
        ("Doll E2", "Healing and all-enemy Weakness; E2 improves her other recovery/Block effect."),
        ("Ogier E0", "Baseline Defend and Rampart cards supply Block; their actual output is uncalculated."),
    ]
    tbl = Table([[para("Slot", "CellHead"), para("Reason", "CellHead")]] +
                [[para(a, "Cell"), para(b, "Cell")] for a, b in team],
                colWidths=[1.25 * inch, 5.55 * inch], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), navy),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, pale]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, blue),
    ]))
    story += [tbl, Spacer(1, 4),
              para("All four are Chaos members, matching the listed starting Chaos Ring. "
                   "No Wheel, Soulforge, equipment, level, skill level, or owned roster state is assumed.", "SmallCustom"),
              para("What the replay establishes", "SectionCustom"),
              para("The submitted clear took <b>16 rounds and two deaths/respawns</b>. "
                   "It spawned 27 adds and recorded <b>17,053 incoming damage before Block</b>. "
                   "Equivalent Exchange occurred four times: the player's maximum HP fell "
                   "3,141 to 2,513 to 2,011 to 1,609 to 1,288, while the boss's "
                   "maximum HP grew. The two listed starting bars total <b>8,014,887 HP</b>, "
                   "but the boss's second-bar maximum reached 11,079,782 by turn 14."),
              para("Survival input boundary", "SectionCustom"),
              para("<b>The 3,141 HP in the replay belongs to Meruru's different team. "
                   "It cannot be used as this candidate's starting HP.</b> The game receives "
                   "the player's final HP in battleInitData.copyProperties; the current "
                   "character catalog alone does not reconstruct that value for a hypothetical "
                   "team. The previous Block/heal threshold table used the wrong HP and has "
                   "been withdrawn."),
              para("For this proposed build, the relevant value is its own initial player "
                   "max HP after loadout and battle-start effects. Only then can a "
                   "replay-conditioned stress test apply each 20% maximum-HP cut to that "
                   "candidate value. Actual Doll healing and Ogier Block also need to be "
                   "resolved from the same build and action schedule."),
              ]

    story += [para("Damage and add-clear gates", "SectionCustom"),
              para("Without HP growth or add damage, the two bars alone require about "
                   "<b>1.00M damage per turn</b> by turn 8, or <b>729k per turn</b> by turn 11. "
                   "These are necessary averages, not predicted DPS. Lotan's E7 coefficient "
                   "corresponds to about 400,744 raw HP on the first boss bar and 801,489 on "
                   "the unmodified second bar, only if that action is charged and resolves."),
              para("The first observed add had 58,776 HP. One Lotan 15% hit is about 8,816, "
                   "leaving about 49,960. After Mouchette's first E3 Exalt, a three-hit "
                   "Mortal Blast would need at least <b>16,654 actual HP damage per hit</b> "
                   "to finish that add alone. A historical Mouchette Blast in another stage "
                   "dealt only 13,815 <i>total</i> damage to each small enemy. That comparison "
                   "does not predict this build, but it makes add clearing the main unresolved risk."),
              para("Recorded enemy pressure by turn", "SectionCustom"),
              para("Incoming damage before Block from the submitted replay; turn 9 is the "
                   "largest observed spike. These values are conditional on that run's enemy "
                   "states and add survival.", "SmallCustom"),
              ]

    chart = Drawing(6.75 * inch, 1.65 * inch)
    chart.add(Line(28, 27, 6.75 * inch - 7, 27, strokeColor=gray, strokeWidth=0.6))
    values = data["observedIncomingByTurn"]
    top = max(values.values())
    for turn in range(1, 17):
        val = values[str(turn)]
        x = 33 + (turn - 1) * 27.4
        h = val / top * 78
        chart.add(Rect(x, 27, 17, h, fillColor=blue if turn != 9 else red,
                       strokeColor=None))
        chart.add(String(x + 8.5, 13, str(turn), fontName="Helvetica",
                         fontSize=7, textAnchor="middle", fillColor=gray))
    chart.add(String(33, 112, "2,656 on turn 9", fontName="Helvetica-Bold",
                     fontSize=8, fillColor=red))
    story += [chart,
              para("Why this is a screen, not a battle simulation", "SectionCustom"),
              para("The replay's incoming hits already include its own enemy states; applying "
                   "Doll's Weakness again would double-count mitigation. A different team "
                   "changes kill timing and enemy actions. We have not resolved actual build "
                   "stats, card draws, Compute, Aliemus, Keyflare/Posse, Wheel triggers, "
                   "healing or Block output. We therefore cannot certify survival, mobbing, "
                   "a boss kill, or minimum investment."),
              para("Next verification gate", "SectionCustom"),
              para("Freeze one actual Lv70/90 loadout and Wheel set; calculate its turn-by-turn "
                   "healing, Block, and damage; show add deaths before attacks and both boss "
                   "bars before repeated Equivalent Exchange; then compare an independent "
                   "no-death replay. Do not spend account resources on this hypothesis alone."),
              HRFlowable(width="100%", thickness=0.6, color=blue),
              Spacer(1, 5),
              para("Sources: saved Zone 3 replay SHA-256 f44238ef60669a40f8b4e59a0d7f9d2ee0d3fad2610246012119d8fbf5ec3b93; "
                   "sanitized replay audit and survival-frontier JSON in the project repository; "
                   "installed Skill 4365/4176/4195/122483 and AwakerPotency 13146; "
                   "Season 71 zone listing at qingdengbuyi.top/morimens-tools.html#zones.", "SmallCustom"),
              ]

    def page_footer(canvas, doc):
        canvas.saveState()
        w, _ = doc.pagesize
        canvas.setStrokeColor(colors.HexColor("#CBD8DD"))
        canvas.line(doc.leftMargin, 0.53 * inch, w - doc.rightMargin, 0.53 * inch)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(gray)
        canvas.drawString(doc.leftMargin, 0.37 * inch, "Morimens theorycraft research | 13 Oct 2026")
        canvas.drawRightString(w - doc.rightMargin, 0.37 * inch, f"Page {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(str(OUTPUT), pagesize=(8.5 * inch, 11 * inch),
                            leftMargin=0.78 * inch, rightMargin=0.78 * inch,
                            topMargin=0.7 * inch, bottomMargin=0.75 * inch,
                            title="Season 71 Zone 3 Budget-Team Feasibility Report",
                            author="Morimens Theorycraft Research")
    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()
