"""Shareable conditional worked example; consumes our pipeline output."""
from pathlib import Path
import json
raise SystemExit('Superseded Mouchette PDF builder disabled: its text and totals omit skill-argument rounding and do not match the requested crit/Soulforge setup. Resolve the scenario and revise the report before publishing.')
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'output/pdf/mortal-blast-example-calculation.json').read_text())
OUT=ROOT/'output/pdf/arachne-mortal-blast-five-repetitions.pdf'
s=getSampleStyleSheet()
for name,size,lead,font,color in [('TitleX',27,31,'Helvetica-Bold','#142D43'),('HeadX',14,18,'Helvetica-Bold','#087F8C'),('BodyX',10.5,15,'Helvetica','#243746'),('SmallX',8.5,12,'Helvetica','#45596B')]:
 s.add(ParagraphStyle(name=name,fontName=font,fontSize=size,leading=lead,textColor=colors.HexColor(color),spaceAfter=9))
story=[]
def p(t):story.append(Paragraph(t,s['BodyX']))
def h(t):story.append(Paragraph(t,s['HeadX']))
def title(n,t,sub):
 story.append(Paragraph('MORIMENS / WORKED EXAMPLE / '+n,s['SmallX']));story.append(Paragraph(t,s['TitleX']));p(sub)
def table(rows,widths):
 t=Table([[Paragraph(str(c),s['SmallX']) for c in row] for row in rows],colWidths=widths,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#EAF4F4')),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#D4DFE6')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]));story.append(t);story.append(Spacer(1,10))
def page():story.append(PageBreak())

title('01','Arachne + Mortal Blast','Revised baseline: SKeyDB level 70 and level 90. This replaces the earlier arbitrary-stat example.')
p('Main sequence: <b>[Arachne Strike -> Mouchette Mortal Blast] x 5</b>. Ten played cards, four awakened Dramatic Encounter follow-ups, one enemy. Results are conditional non-critical Active damage before HP resolution.')
table([['Both characters at','Arachne Strike total','Mortal Blast total','Follow-ups total','Combined total']]+[[x['pairs']['level'],f"{x['pairs']['arachne']:,}",f"{x['pairs']['blast']:,}",f"{x['pairs']['follow']:,}",f"{x['pairs']['total']:,}"] for x in data['levels']],[90,100,100,100,100])
h('Real stat inputs, explicit baseline conditions')
p('We use SKeyDB\'s published stat growth and skill coefficients. Both characters have max Gnostic Potential (+10 base-stat levels), skill level 6, no equipment and no active seasonal talent. Starting STR is zero. These choices define an unequipped reference baseline; they do not claim to reproduce a geared endgame team. [S1-S4]')
p('Mouchette is E2, roused, and has already used her level-6 Exalt. E3 and Absolute Axiom are absent: Mortal Blast has two hits, the roused follow-up has three, and the cap is four follow-ups. Arachne is unroused; her conditional attached action/Fate Cut is inactive. All hits are explicitly non-critical, not an average over crit RNG. [S3-S5]')
p('There are no starting follow-up stacks or partial pair progress. Sufficient cards and energy are supplied to perform all five pairs. Mortal Blast can copy the Arachne Strike; that copy normally remains owned by Arachne. The final generated copy is not played and adds no damage. Five Mortal Blasts must be available; this sequence does not generate those five casts by itself. [S3, P2]')
h('If you meant only five Mortal Blasts')
p('With Arachne present but no Arachne Strike played, two follow-ups trigger under the same zero-progress starting condition: <b>8,682 at level 70</b> or <b>10,400 at level 90</b>. The all-five-pairs interpretation above includes five extra played Strikes and two extra follow-ups.')
p('No client answer or replay total was used to obtain these numbers. Our JavaScript pipeline calculates them from the sourced inputs. The Exalt\'s initial attack is outside the requested five-pair window and is not included.')
page()
title('02','Where every input comes from','SKeyDB snapshot: a2ff07765b2e0c78af827577f881054dbe224d8d. Retrieved 19 September 2026.')
h('Character attack')
p('SKeyDB\'s primary-stat formula is <b>ceil((20 + character level + Gnostic bonus levels) x growth - 0.000000001)</b>. Its catalog gives ATK growth 1.65 for Mouchette and 1.15 for Arachne, with default Gnostic bonus levels 10. We use no Soulforge percentage or equipment additions. [S1, S2]')
table([['Character','Level 70','Level 90'],['Mouchette','ceil((20 + 70 + 10) x 1.65) = 165','ceil((20 + 90 + 10) x 1.65) = 198'],['Arachne','ceil((20 + 70 + 10) x 1.15) = 115','ceil((20 + 90 + 10) x 1.15) = 138']],[90,200,200])
h('Level-6 skill inputs')
table([['Event / contribution','SKeyDB coefficient','Level 70 input','Level 90 input'],['Arachne Strike','20% of Arachne ATK','115 x 0.20 = 23','138 x 0.20 = 27.6'],['Mortal Blast, per hit','30% of Mouchette ATK','165 x 0.30 = 49.5','198 x 0.30 = 59.4'],['Dramatic Encounter, per hit','30% of Mouchette ATK','49.5','59.4'],['Exalt flat Strike buff','250% of Mouchette ATK','ceil(165 x 2.50) = 413','ceil(198 x 2.50) = 495']],[130,120,120,120])
p('The raw damage arguments retain their decimals until the pipeline rounding stage. The Exalt buff is different: our recovered state-initialization path rounds its property contribution upward when the buff is applied. Thus 412.5 becomes a stored +413, before later damage calculations. [P1, P3]')
h('No invented positive STR or damage bonuses')
p('Starting STR is zero, not 100. All other offensive and target modifiers are neutral for this reference case. Crit chance still exists on the characters, but we condition on non-critical outcomes; this is not an expected-damage calculation. The equipped result needs actual wheel, covenant, posse, relic and battle-state inputs.')
page()
title('03','Run the recovered pipeline','Flat bonuses, personal stacks and per-hit rounding explain the total.')
h('Arachne stays separate from Mouchette\'s personal stacks')
p('Arachne\'s non-critical pre-hit amount is <b>ceil(raw Strike + Exalt flat bonus)</b> under neutral modifiers: level 70 gives ceil(23 + 413) = <b>436</b>; level 90 gives ceil(27.6 + 495) = <b>523</b>. Mouchette\'s personal inside-Strike stack does not transfer to her. [P1-P3]')
h('Mortal Blast and Dramatic Encounter')
p('At skill level 6, Mortal Blast and the follow-up happen to have the same raw coefficient here. Their per-hit subtotal is <b>49.5 + 413 = 462.5</b> at level 70, or <b>59.4 + 495 = 554.4</b> at level 90. Mortal Blast deals two hits and the awakened follow-up deals three. [S3-S5]')
p('With k previously completed follow-ups, multiply that subtotal by <b>1 + 0.25k</b>. The original offensive pipeline ceilings after subtracting 0.00001, then floors after neutral reductions with +0.00001. The neutral target step ceilings again. In this example this gives the per-hit values below. [P1]')
table([['Prior layers k','Personal factor','Level 70, per hit','Level 90, per hit']]+[[k,f'{1+.25*k:.2f}x',data['levels'][0]['pairs']['rounds'][k]['blast']['damage'],data['levels'][1]['pairs']['rounds'][k]['blast']['damage']] for k in range(5)],[100,110,140,140])
p('Example: at level 70 with one prior layer, 462.5 x 1.25 = 578.125 -> <b>579 per hit</b>. Mortal Blast gives 2 x 579 = 1,158; its following Dramatic Encounter gives 3 x 579 = 1,737. Round each hit before summing. Do not round only the whole card total.')
p('Our assumed schedule resolves one follow-up after each of the first four card pairs. The new +25-point layer is awarded after its damage. Pair five uses the existing 2.00x factor but triggers no follow-up because the cap is reached. This ordering uses prior code evidence; the complete event sequence is not gameplay-verified. [P2]')
page()
title('04','All five pairs, both levels','Each row includes one Arachne Strike and one Mortal Blast. Follow-up damage is included where the cap permits it.')
for x in data['levels']:
 b=x['pairs'];h('Both characters level '+str(b['level']))
 table([['Pair','Arachne','Blast: 2 hits','Follow-up: 3 hits','Total']]+[[r['round'],r['aTotal'],r['bTotal'],r['fTotal'] if r['follow'] else 'Cap reached',r['total']] for r in b['rounds']],[40,90,120,140,100])
 p(f"<b>{b['arachne']:,} + {b['blast']:,} + {b['follow']:,} = {b['total']:,}</b> Active damage before HP resolution.")
h('Five Mortal Blasts without playing Arachne')
p('Factors are 1.00, 1.00, 1.25, 1.25, 1.50; follow-ups occur after casts 2 and 4. Level 70: Blast 5,554 + follow-ups 3,128 = 8,682. Level 90: Blast 6,650 + follow-ups 3,750 = 10,400. The values below are generated by the same pipeline, not scaled from the combined total.')
page()
title('05','Scope, evidence and next steps','A sourced character baseline is more useful than arbitrary inputs, but it still needs a fully specified battle to predict actual HP loss.')
p('These are one-target, unmitigated, non-critical reference results. Enemy shields, vulnerability, reduction, caps, death, seasonal buffs and random target allocation can change them. Arachne\'s enabled attached action can add prism and Fate Cut effects between cards; the inactive case used here excludes those events. Our Frenzy replay is a separate, more complex scenario.')
p('The SKeyDB snapshot is an external data source, not proof that its current region/version exactly matches PC144/build51. Its coefficients and described follow-up mechanics used here agree with our prior recovered expressions. A complete baseline battle has not been independently checked. We still have zero completed gameplay predictions and zero holdouts.')
h('Source links and attribution')
base='https://github.com/dansa/SKeyDB/blob/'+data['sourceCommit']+'/'
refs=[('S1','Stat growth and defaults','src/data/public-v3/catalogs/awakeners.json'),('S2','Primary-stat scaling implementation','src/domain/awakener-level-scaling.ts'),('S3','Mortal Blast coefficients and E2 copy','src/data/public-v3/records/skills/skill.mouchette.mortal-blast.json'),('S4','Exalt coefficients and E3 distinction','src/data/public-v3/records/skills/skill.mouchette.shining-tornado.json'),('S5','Rouse and follow-up changes','src/data/public-v3/records/skills/skill.mouchette.mist-realm-vestige.json'),('S6','Arachne Strike coefficients','src/data/public-v3/records/skills/skill.arachne.strike.json'),('S7','Dramatic Encounter coefficient','src/data/public-v3/records/derived-skills/derived.mouchette.dramatic-encounter.json')]
for ref,label,path in refs:story.append(Paragraph(f'{ref}: <link href="{base+path}" color="#087F8C">{label} - SKeyDB</link>',s['SmallX']))
p('SKeyDB by dansa and contributors supplies the cited dataset and scaling reference. Its original data/content is licensed CC BY-NC-SA 4.0; this adapted baseline write-up is shared under the same terms. Game-owned material remains owned by its respective rights holders. No artwork or extracted client files are included.')
psy=[('P1','docs/DAMAGE_FORMULA.md; engine/show-damage.mjs; engine/active-target.mjs'),('P2','docs/MOUCHETTE.md; docs/CARD_ATTRIBUTION.md'),('P3','docs/STATE_PROPERTY_ROUTING.md: buff routing and initialization ceiling')]
for ref,text in psy:story.append(Paragraph(ref+': '+text,s['SmallX']))
h('Reproduction')
p('Run node tools/mortal-blast-example.mjs. It reads the pinned SKeyDB inputs and writes output/pdf/mortal-blast-example-calculation.json with all input values and hit traces. The earlier 57,478 result used arbitrary stats and is superseded by this revision. This example adds no gameplay verification credit.')
def footer(c,d):
 c.setStrokeColor(colors.HexColor('#BDDADA'));c.line(52,43,542,43);c.setFont('Helvetica',8);c.setFillColor(colors.HexColor('#45596B'));c.drawString(52,29,'SKEYDB LEVEL BASELINES / conditional, non-critical / CC BY-NC-SA 4.0');c.drawRightString(542,29,str(d.page))
SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),leftMargin=52,rightMargin=52,topMargin=44,bottomMargin=58,title='Arachne + Mortal Blast: SKeyDB level 70 and 90',author='Morimens research project; SKeyDB data attribution').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
