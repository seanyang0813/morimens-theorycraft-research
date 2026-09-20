"""Approved Mouchette conditional calculation; all totals consumed from pipeline."""
from pathlib import Path
from xml.sax.saxutils import escape
import json
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'output/pdf/mouchette-approved-baseline-calculation.json').read_text())
assert d['arithmeticVerification']['status']=='PASS'
out=ROOT/'output/pdf/mouchette-arachne-approved-calculation.pdf'
styles=getSampleStyleSheet()
for name,size,leading,color in [('TitleX',25,29,'#163247'),('H',13,17,'#087F8C'),('B',10,14,'#243746'),('S',8,11,'#4A5965'),('N',34,39,'#087F8C')]:
    styles.add(ParagraphStyle(name=name,fontName='Helvetica-Bold' if name in ['TitleX','H','N'] else 'Helvetica',fontSize=size,leading=leading,textColor=colors.HexColor(color),spaceAfter=8))
story=[]
def p(text,style='B'):story.append(Paragraph(text,styles[style]))
def h(text):p(text,'H')
def title(num,text):p('MORIMENS / APPROVED BASELINE / '+num,'S');p(text,'TitleX')
def table(rows,widths):
    t=Table([[Paragraph(str(cell),styles['S']) for cell in row] for row in rows],colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E8F3F4')),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#D4DFE6')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    story.append(t);story.append(Spacer(1,10))
def page():story.append(PageBreak())
def footer(canvas,doc):
    canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#61717D'))
    canvas.drawString(48,28,'Conditional calculation | PC res144/build51 | 19 September 2026')
    canvas.drawRightString(564,28,str(doc.page))
title('01','Mouchette + Arachne\nFive Strike / Mortal Blast pairs')
p(f"{d['totals']['combined']:,}",'N')
p('<b>Combined damage before target mitigation</b>, for the approved setup below. The opening Exalt attack is not included. This report replaces all earlier PDFs of this five-pair example.')
table([['Contribution','Damage'],['Mortal Blast: 5 casts, 2 hits each',f"{d['totals']['blast']:,}"],['Dramatic Encounter: 4 pursuits, 3 hits each',f"{d['totals']['pursuit']:,}"],['Mouchette subtotal',f"{d['totals']['mouchette']:,}"],['Arachne: 5 Strikes',f"{d['totals']['arachne']:,}"],['Combined',f"{d['totals']['combined']:,}"]],[345,165])
h('The setup you approved')
p('Both Awakeners are level 90, with maximum skills (level 6) and Gnostic Potential (level 5). Mouchette is E2 and Soulforge 10; she Rouses before Exalt. Arachne is unroused. Both have 100% crit rate and a 150% Crit DMG stat. Starting STR is 0.')
p('Astral Reign; one Dominator; no additional modifiers. After Rouse and Exalt, play <b>[Arachne Strike -&gt; Mortal Blast] five times in the same turn</b>. Start with zero pursuit progress and zero personal Strike stacks. Let each pursuit resolve before playing the next pair.')
p('The question supplies five casts: sufficient cards and energy are treated as available. No separate Arachne Soulforge, Rouse/Fate Cut, equipment, relic, extra target state or other damage source is added. The target must survive the complete sequence.')
h('What this number means')
p('The sourced setup and recovered formula produce the total above. Fourteen resolved per-hit records were rechecked through original Lua arithmetic and matched exactly. This is <b>not an independently verified replay or a complete battle simulation</b>. Shield, immunity, boss caps, phases or other target mechanics would change actual HP loss.')
page()
title('02','Inputs and stacking order')
h('SKeyDB stat calculation [S1-S3]')
p('Max Gnostic Potential adds 10 base-attribute levels. SKeyDB rounds the base stat up, then rounds the Soulforge percentage result up. Its stat calculation uses a 0.000000001 floating-point tolerance.')
table([['Quantity','Calculation','Result'],['Mouchette base ATK','ceil((20 + 90 + 10) x 1.65)','198'],['Mouchette ATK, Soulforge 10','ceil(198 x 1.30)','258'],['Arachne ATK','ceil((20 + 90 + 10) x 1.15)','138'],['Exalt flat Strike contribution','ceil(258 x 250%)','645'],['Mortal Blast / pursuit argument','ceil(258 x 30%)','78'],['Arachne Strike argument','ceil(138 x 20%)','28']],[156,284,70])
h('Separate multipliers, separate owners [P1-P3]')
p('<b>1. Ordinary skill argument:</b> ceil the ATK coefficient before it becomes stored Arg1. Explicit card argument overrides are a different path; none are supplied here.')
p('<b>2. Soulforge Strike Base DMG:</b> +35%, or x1.35, scales the base argument for both Awakeners. It does not multiply the separate +645 Exalt contribution.')
p('<b>3. Flat Exalt bonus:</b> add 645 to each eligible Strike hit. STR contributes 0. The flat bonus applies once per hit, not once per card.')
p('<b>4. Personal Strike stacks:</b> Mouchette multiplies that subtotal by (1 + 0.25 x k). Arachne does not inherit this personal multiplier. Here k is the number of completed pursuits.')
p('<b>5. Crit and Dominator:</b> a 150% Crit DMG stat adds 150% to normal damage: x2.5, not x1.5. Mouchette alone then receives the Soulforge +50% Dominator factor, x1.5. Arachne receives no such bonus in this setup.')
h('Per-hit formulas for this baseline')
p('<b>Mouchette:</b> U(k) = ceil(((78 x 1.35) + 645) x (1 + 0.25k) - 0.00001).<br/>D(k) = ceil(U(k) x 2.5 x 1.5).')
p('<b>Arachne:</b> U = ceil((28 x 1.35) + 645 - 0.00001) = 683.<br/>D = ceil(683 x 2.5) = <b>1,708 per Strike</b>.')
p('The recovered utility also applies its later floor/minimum stage; with neutral reductions and these positive integer outputs, it leaves U unchanged. Target rounding is performed per hit before summing hits.','S')
page()
title('03','All five pairs, step by step')
p('Roused Mouchette has three pursuit hits. E2 Mortal Blast has two hits; the E3 Exalt extra-hit upgrade is absent. Every two played Strikes cause one pursuit, capped at four per turn. Mortal Blast counts as a Strike; the pursuit does not recursively count as another played Strike. [S4, P2]')
table([['Pair','k before','Mouchette U','Mouchette / hit','Blast x2','Pursuit x3','Arachne','Pair total']]+[[r['round'],r['blast']['layers'],r['blast']['showDamage'],f"{r['blast']['preHitDamage']:,}",f"{r['blastTotal']:,}",f"{r['pursuitTotal']:,}",f"{r['arachneTotal']:,}",f"{r['total']:,}"] for r in d['rounds']],[34,42,62,74,64,72,70,92])
h('Pair 1: no personal stack yet')
p('The base-plus-flat subtotal is (78 x 1.35) + 645 = 750.3. With k = 0, the utility rounds this to 751. Crit and Dominator give ceil(751 x 2.5 x 1.5) = ceil(2,816.25) = <b>2,817 per Mouchette hit</b>.')
p('Arachne contributes 1,708. Mortal Blast contributes 2 x 2,817 = 5,634. The pursuit contributes 3 x 2,817 = 8,451. Pair 1 total: <b>15,793</b>. Only after the pursuit damage does Mouchette gain her first +25% personal Strike layer.')
h('Pairs 2-4: the pursuit adds the next stack afterward')
p('At k = 1, 2 and 3, the utility subtotals are 937.875, 1,125.45 and 1,313.025. They round to 938, 1,126 and 1,314. The final per-hit amounts are 3,518, 4,223 and 4,928. Each pursuit uses its current k for all three hits, then adds one layer. [P2]')
h('Pair 5: four layers, but the pursuit cap is reached')
p('At k = 4, 750.3 x 2 = 1,500.6, rounded to 1,501. Each Blast hit is ceil(1,501 x 2.5 x 1.5) = 5,629. There is no fifth pursuit: 1,708 + 2 x 5,629 = <b>12,966</b>.')
h('Final addition')
p('<b>Mortal Blast:</b> 2 x (2,817 + 3,518 + 4,223 + 4,928 + 5,629) = 42,230.<br/><b>Pursuits:</b> 3 x (2,817 + 3,518 + 4,223 + 4,928) = 46,458.<br/><b>Arachne:</b> 5 x 1,708 = 8,540.<br/><b>Total:</b> 42,230 + 46,458 + 8,540 = <b>97,228</b>.')
page()
title('04','Evidence and reproducibility')
h('SKeyDB: character data and coefficients')
base='https://github.com/dansa/SKeyDB/blob/'+d['sourceCommit']+'/'
sources=[('S1','Stat scaling','src/domain/awakener-level-scaling.ts'),('S2','Mouchette','src/data/public-v3/records/awakeners/awakener-0033.json'),('S2','Arachne','src/data/public-v3/records/awakeners/awakener-0056.json'),('S3','Gnostic Potential','src/data/public-v3/records/talents/talent.mouchette.gnostic-potential.json'),('S3','Soulforge Aptitude','src/data/public-v3/records/talents/talent.mouchette.soulforge-aptitude.json'),('S4','Mortal Blast','src/data/public-v3/records/skills/skill.mouchette.mortal-blast.json'),('S4','Shining Tornado','src/data/public-v3/records/skills/skill.mouchette.shining-tornado.json'),('S4','Arachne Strike','src/data/public-v3/records/skills/skill.arachne.strike.json'),('S4','Dramatic Encounter','src/data/public-v3/records/derived/derived.mouchette.dramatic-encounter.json')]
# Resolve the derived record's actual repository location from the pinned tree.
tree=json.loads((ROOT/'tmp/skeydb-tree.json').read_text(encoding='utf-8-sig'))['tree']
for label,name,path in sources:
    candidates=[x['path'] for x in tree if x['path'].endswith('/'+Path(path).name)]
    assert len(candidates)==1,(name,candidates)
    p(f'[{label}] <link href="{base+candidates[0]}" color="#087F8C">{escape(name)}</link>','S')
p('Pinned commit: '+d['sourceCommit']+'. Character data is credited to dansa / SKeyDB. This report adapts its data and adds calculations and recovered-code analysis. Data-derived material is shared under <link href="https://creativecommons.org/licenses/by-nc-sa/4.0/" color="#087F8C">CC BY-NC-SA 4.0</link>; see <link href="'+base+'DATA-LICENSE.md" color="#087F8C">SKeyDB data license</link>.','S')
h('Recovered PC code and configuration')
p('<b>[P1] Arithmetic:</b> BattleCmdServer.GetSkillArgs, __GetShowDamage and __GetFinalDamage; BattleUtilServer.ShowDamageFormula. Ordinary argument ceiling, flat/percentage order, critical multiplier and final ceiling were recovered from PC resource 144/build 51.','S')
p('<b>[P2] Sequence:</b> Skill 122483 (Blast), Skill 123159 (pursuit), Cmd 123160 (two-Strike trigger), Cmd 123163 (pursuit damage before personal layer), State 123165 (four-pursuit counter), State 123168 (+25% inside Strike per layer). Cmd 122491 and State 124039 establish that the extra hit requires E3. BEAfterUseCard suppresses the pursuit\'s recursive played-card event.','S')
p('<b>[P3] Soulforge and Exalt:</b> Talent 122481 level 10, State 123703 (+35% outside Strike), State 124656 (+50% damage_per2monster_boss), State 124034 (+645 strikecard_damage_plus here). Player-owned flat Strike contributions are distributed to Awakeners; they must not be counted twice.','S')
h('What was checked, and what was not')
p('The reproducible JSON includes input vectors, per-hit traces, source SHA-256 hashes and 14 matching original-runtime arithmetic checks. The generator is tools/mouchette-approved-baseline.mjs; the checker is tools/verify_mouchette_baseline.py. The accompanying JSON is output/pdf/mouchette-approved-baseline-calculation.json.','S')
p('These checks exercise arithmetic with resolved inputs. They do not independently establish a whole-battle event trace, target survival or a particular boss\'s caps/phases. The sequence is a conditional worked example using the recovered configuration. It does not satisfy the calculator\'s gameplay publication gate.','S')
SimpleDocTemplate(str(out),pagesize=(612,792),rightMargin=48,leftMargin=48,topMargin=42,bottomMargin=46,title='Mouchette and Arachne: five-pair damage breakdown',author='Morimens research').build(story,onFirstPage=footer,onLaterPages=footer)
print(out)
