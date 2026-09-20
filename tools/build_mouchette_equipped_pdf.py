from pathlib import Path
import json
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'output/pdf/mouchette-equipped-baseline-calculation.json').read_text())
raise SystemExit('This PDF is superseded as a team prediction: intrinsic Arachne Prism/Beacon reconstruction must be completed before issuing a replacement. The saved arithmetic remains a diagnostic reference.')
assert d['arithmeticVerification']['status']=='PASS'
s=getSampleStyleSheet()
for name,size,lead in [('T',25,29),('H',13,17),('B',10,14),('S',8.5,12),('N',34,40)]:
 s.add(ParagraphStyle(name=name,fontName='Helvetica-Bold' if name in ['T','H','N'] else 'Helvetica',fontSize=size,leading=lead,spaceAfter=9,textColor=colors.HexColor('#087F8C' if name in ['H','N'] else '#20384A')))
story=[]
def p(t,style='B'):story.append(Paragraph(t,s[style]))
def table(rows,widths):
 t=Table([[Paragraph(str(v),s['S']) for v in row] for row in rows],colWidths=widths,repeatRows=1)
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E8F3F4')),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#D5E2E4')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]));story.append(t);story.append(Spacer(1,10))
def footer(c,doc):
 c.setFont('Helvetica',8);c.drawString(48,28,'Mouchette equipped calculation | PC res144/build51 | Conditional, not gameplay verified');c.drawRightString(564,28,str(doc.page))
p('MOU CHETTE / EQUIPPED UPDATE'.replace('MOU CHETTE','MOUCHETTE'),'S')
p('Five Strike / Mortal Blast pairs','T');p(f"{d['totals']['combined']:,}",'N')
p('<b>Direct damage before target mitigation.</b> Updated for 150% team Damage Amplification and Mouchette\'s max-effect signature Wheel, <b>Doomsday Rampage</b>. This supersedes the earlier 97,228 total for your revised setup.')
table([['Source','Damage'],['Mortal Blast',f"{d['totals']['blast']:,}"],['Mouchette pursuits',f"{d['totals']['pursuit']:,}"],['Mouchette subtotal',f"{d['totals']['mouchette']:,}"],['Arachne Strikes',f"{d['totals']['arachne']:,}"],['Combined',f"{d['totals']['combined']:,}"]],[350,160])
p('Setup retained','H')
p('Both Awakeners Lv90, max skills and Gnostic Potential. Mouchette E2, Soulforge 10, Rouse before Exalt; Arachne unroused with no added equipment effects. Final crit rate 100%, final Crit DMG stat 150% (x2.5), STR 0. One Astral Reign Dominator; no other modifiers, relics, caps or mitigation.')
p('Play [Arachne Strike -&gt; Mortal Blast] five times in one turn, letting pursuits resolve between pairs. Start with zero pursuit progress, personal Strike layers and Wheel stacks. Supply the required cards/energy. Exalt\'s opening attack is excluded; its +645 flat Strike buff is already active. The target must survive all hits.')
p('What the Wheel actually adds','H')
p('At max effect: Exalt and pursuit Base DMG +60%. After each played Strike, Mouchette gains ceil(258 x 25%) = <b>65 flat Strike damage</b>, up to eight times. Arachne\'s attack adds a stack before the next Blast; Blast adds another before the pursuit. Pursuits do not add played-card stacks themselves.')
p('The Wheel\'s main stat is Death Resistance. The specified 100%/150% crit stats are held as final values, so equipment/talent crit contributions are not added again. The Wheel\'s Exalt Base DMG bonus affects the opening attack, not the separate +645 buff.')
story.append(PageBreak())
p('Per-hit working and evidence','T')
p('Base inputs: Mouchette ATK 258; Arachne ATK 138. Stored skill arguments: ceil(258 x 30%) = 78 and ceil(138 x 20%) = 28. Exalt flat buff: ceil(258 x 250%) = 645. Damage Amplification 150% supplies x2.5 to the base term; Soulforge Strike Base DMG supplies x1.35.')
p('<b>Blast utility:</b> ceil((78 x 1.35 x 2.5 + 645 + 65w) x (1 + 0.25k) - 0.00001).<br/><b>Pursuit utility:</b> ceil((78 x 1.35 x 2.5 x 1.6 + 645 + 65w) x (1 + 0.25k) - 0.00001).<br/><b>Mouchette per hit:</b> ceil(utility x 2.5 crit x 1.5 Dominator).<br/><b>Arachne per Strike:</b> ceil(ceil(28 x 1.35 x 2.5 + 645 - 0.00001) x 2.5) = 1,850.','S')
p('w = current Wheel stack count; k = completed pursuits. The later utility floor has no effect here because reductions are neutral. Flat +645 and Wheel +65w are added after the base-only factors.','S')
table([['Pair / k','Wheel w Blast / pursuit','Blast per hit (x2)','Pursuit per hit (x3)','Pair total incl. Arachne']]+[[f"{r['round']} / {r['blast']['layers']}",f"{r['blast']['wheelStacks']} / {r['pursuit']['wheelStacks'] if r['pursuit'] else '-'}",f"{r['blast']['preHitDamage']:,}",f"{r['pursuit']['preHitDamage']:,}" if r['pursuit'] else 'None: cap reached',f"{r['total']:,}"] for r in d['rounds']],[56,112,106,114,122])
p('First-pair example','H')
p('Blast: (78 x 1.35 x 2.5) + 645 + 65 = 973.25 -&gt; utility 974 -&gt; ceil(974 x 3.75) = 3,653 per hit. Pursuit has two Wheel stacks: 421.2 + 645 + 130 = 1,196.2 -&gt; utility 1,197 -&gt; 4,489 per hit. Pair total: 1,850 + 2 x 3,653 + 3 x 4,489 = <b>22,623</b>.','S')
p('Sources and validation','H')
url='https://github.com/dansa/SKeyDB/blob/'+d['sourceCommit']+'/src/data/public-v3/records/wheels/wheel-0029.json'
p('<link href="'+url+'" color="#087F8C">SKeyDB: Doomsday Rampage, pinned source</link>. PC State 123521 places the +60% in o_damage_per_ulti / o_damage_per_attachpost; Cmd 124065 adds State 124066 flat Strike layers and counter 123518 (cap eight). Original ShowDamageFormula / __GetFinalDamage matched all 14 resolved per-hit records. The event sequence uses recovered code; it is not independently gameplay verified.','S')
p('Reproduce with tools/mouchette-equipped-baseline.mjs and tools/verify_mouchette_baseline.py. Full vectors and traces: output/pdf/mouchette-equipped-baseline-calculation.json. SKeyDB data credit: dansa; adapted data under <link href="https://creativecommons.org/licenses/by-nc-sa/4.0/" color="#087F8C">CC BY-NC-SA 4.0</link>.','S')
p('<b>Comparison only:</b> with eligible Old Embers, sufficient stacks/HP and no HP-change immunity or cap, the extra 3x would give <b>672,156 combined</b>. That mechanic has not been confirmed for your friend\'s result and is not included in 168,039.','S')
out=ROOT/'output/pdf/mouchette-signature-wheel-calculation.pdf'
SimpleDocTemplate(str(out),pagesize=(612,792),leftMargin=48,rightMargin=48,topMargin=40,bottomMargin=46,title='Mouchette: signature Wheel and 150% Damage Amplification').build(story,onFirstPage=footer,onLaterPages=footer)
print(out)
