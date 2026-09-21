"""Conditional worksheet, explicitly not a completed numerical prediction."""
from pathlib import Path
import json
import hashlib
import math
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
ROOT=Path(__file__).resolve().parents[1]
audit=json.loads((ROOT/'research/evidence/mouchette-worksheet-audit.json').read_text())
assert audit['status']=='CONDITIONAL_WORKSHEET_EQUATIONS_MATCH' and audit['masteryResolved'] is False
assert hashlib.sha256((ROOT/'website/dist/scenario.json').read_bytes()).hexdigest()==audit['scenarioSha256'], 'Re-run the worksheet equation audit after changing scenario inputs'
primary_path=ROOT/'research/evidence/mouchette-case-study-primary.json'
primary=json.loads(primary_path.read_text())
assert hashlib.sha256(primary_path.read_bytes()).hexdigest()==audit['primaryBuildSha256'], 'Re-run the worksheet equation audit after changing primary build inputs'
m_atk=primary['characters']['mouchette']['stats']['ATK'];a_atk=primary['characters']['arachne']['stats']['ATK']
m_arg=math.ceil(m_atk*.30);a_arg=math.ceil(a_atk*.20);exalt=math.ceil(m_atk*2.50);wheel_flat=math.ceil(m_atk*.25)
assert (m_atk,a_atk,m_arg,a_arg,exalt,wheel_flat)==(258,138,78,28,645,65)
arachne_base=a_arg*1.35*2.5+exalt;blast_base=m_arg*1.35*2.5+exalt;pursuit_base=m_arg*1.35*2.5*1.6+exalt
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleX',fontName='Helvetica-Bold',fontSize=23,leading=28,textColor=colors.HexColor('#19364a'),spaceAfter=16))
styles.add(ParagraphStyle(name='BodyX',fontSize=10,leading=15,spaceAfter=10))
styles.add(ParagraphStyle(name='SmallX',fontSize=8.5,leading=12,spaceAfter=8))
story=[]
def p(text,style='BodyX'):story.append(Paragraph(text,styles[style]))
def table(rows,widths):
    t=Table([[Paragraph(str(x),styles['SmallX']) for x in row] for row in rows],colWidths=widths,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e6eef2')),('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),.3,colors.HexColor('#b7c6ce'))]));story.append(t);story.append(Spacer(1,12))
def footer(canvas,doc):
    canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#526978'));canvas.drawString(45,28,'Morimens | PC res150 build51 | Conditional research worksheet');canvas.drawRightString(567,28,str(doc.page))
p('Mouchette + Arachne<br/>Five Strike / Mortal Blast pairs','TitleX')
p('<b>Conditional worksheet - final damage is not established.</b> Final player Realm Mastery is unresolved. This document gives the exact equations of the current research model without assigning an invented mastery or total. It replaces neither gameplay validation nor a complete battle simulation.')
p('1. Accepted setup','Heading2')
p('Both Lv90, max skills and Gnostic Potential. Mouchette E2, Soulforge 10, Rouse before Exalt, maximum Doomsday Rampage. Arachne unroused. Final crit rate 100%; final Crit DMG stat 150%; STR 0. Final team Damage Amplification 150%, including any realm contribution.')
p('One Astral Reign Dominator; no additional modifiers. Five [Arachne Strike then Mortal Blast] pairs in one ordinary turn. Required cards and energy are supplied. Start with zero pursuit progress, personal Strike layers and Wheel stacks. Let each pursuit resolve between pairs. Exalt opening damage is excluded. The target must survive all hits.')
table([['Input / effect','Working'],['Mouchette / Arachne ATK',f'{m_atk} / {a_atk} from the general client progression resolver'],['Stored damage arguments',f'Mouchette: ceil({m_atk} x 30%) = {m_arg}; Arachne: ceil({a_atk} x 20%) = {a_arg}'],['Exalt flat Strike bonus',f'ceil({m_atk} x 250%) = {exalt}'],['Wheel flat per played Strike',f'ceil({m_atk} x 25%) = {wheel_flat}; cap eight stacks'],['Base-term multipliers','Soulforge Strike: 1.35; amplification: 2.5; Mouchette pursuit Wheel bonus: 1.6'],['After offensive rounding','Crit: 2.5 for both. Mouchette Dominator factor: 1.5. Arachne has no supplied Dominator bonus.']],[175,347])
p('Arachne\'s optional maximum Eternal Weave adds 72 mastery before mastery multipliers. It does not determine final team mastery by itself. Its amplification passive needs Arachne\'s own pursuits; none are included here. Mouchette\'s pursuit does not substitute for one.','SmallX')
story.append(PageBreak())
p('2. Damage stacking and sequence','TitleX')
p('Let M be the final player Realm Mastery relevant to these effects. Define P = ceil(15 x (1 + 0.0005M)) Prism layers and B = ceil(25 x (1 + 0.0005M)) Beacon layers. Both add within the same factor: 1 + 0.02P + 0.02b. They are not two separately multiplied bonuses.')
p('C(x) = max(ceil(x - 0.00001), 1). Reductions are neutral in this setup, so the later offensive floor leaves this integer unchanged. Each hit then receives its own target/crit multiplication and ceiling.')
p(f'<b>Arachne per hit:</b> A(b) = ceil(2.5 x C({arachne_base:g} x (1 + 0.02P + 0.02b))).<br/>{arachne_base:g} = {a_arg} x 1.35 x 2.5 + {exalt}.')
p(f'<b>Mortal Blast per hit:</b> D(w,k) = ceil(3.75 x C(({blast_base:g} + {wheel_flat}w) x (1 + 0.25k) x (1 + 0.02P))).<br/>{blast_base:g} = {m_arg} x 1.35 x 2.5 + {exalt}.')
p(f'<b>Mouchette pursuit per hit:</b> F(w,k) = ceil(3.75 x C(({pursuit_base:g} + {wheel_flat}w) x (1 + 0.25k) x (1 + 0.02P))).<br/>{pursuit_base:g} = {m_arg} x 1.35 x 2.5 x 1.6 + {exalt}.')
p('w is Wheel stacks at that hit; k is previously completed pursuits. Flat bonuses are added after the base-only factors. The 25% per completed pursuit and Prism multiply the resulting subtotal. Pursuits receive Prism but do not activate the played-card Beacon trigger.')
table([['Pair','k','Blast w','Pursuit w','Pair contribution'],['1',0,1,2,'A(b1) + 2D(1,0) + 3F(2,0)'],['2',1,3,4,'A(0) + 2D(3,1) + 3F(4,1)'],['3',2,5,6,'A(0) + 2D(5,2) + 3F(6,2)'],['4',3,7,8,'A(0) + 2D(7,3) + 3F(8,3)'],['5',4,8,'None','A(0) + 2D(8,4)']],[38,28,58,66,332])
story.append(PageBreak())
p('2.1 Sequence total','Heading2')
p('Total = sum of the five pair contributions. Blast contributes ten hits; pursuits contribute twelve hits across four activations; Arachne contributes five hits. If Dimension Shuttle is unused at sequence start, b1 = B. If already used in this ordinary turn, b1 = 0. No pre-existing Beacon cards or extra Shuttle activations are included.')
p('3. Evidence and what remains missing','Heading1')
p('<b>Why there is no single damage number:</b> final player mastery is not interchangeable with a character preview or a team-sum getter. Original PvE startup routes supplied copyProperties to the player and attrs to characters. The property constructor copies and ceilings supplied numbers; it does not itself derive missing final mastery. Later mastery changes have a separate recomputation hook.')
p('The accepted inputs do not establish that starting value or every initial state change. The optional Arachne Wheel choice and whether Shuttle was already used must also be explicit. The worksheet keeps those branches visible instead of silently choosing them.')
p('<b>Evidence levels:</b> selected arithmetic, property, layer and trigger components have original-runtime tests. The five-pair scheduling is a research composition. It has not been validated as a complete original battle or against an independent observed outcome. Pre-hit damage is not final HP loss: shields, prevention, HP caps, overkill and triggered HP changes can alter the result.')
table([['Claim','Auditable local evidence'],['Primary ATK and advancement rounding','mouchette-case-study-primary.json generated from resource-150 progression through engine/client-build-stats.mjs; Mouchette 198 base to 258 at talent level 10; Arachne remains 138 at explicit level 0'],['Offensive factor order / crit / target rounding','engine/show-damage.mjs; engine/active-target.mjs; original ShowDamageFormula and __GetFinalDamage checks plus resource-150 cross-build runtime comparisons'],['Prism, Beacon and supplied mastery','engine/singularity-realm.mjs; singularity layer/Beacon runtime fixtures and tests'],['Mastery initialization boundary','original-property-initialization.json: 24 original cases; pve-property-input-boundary.json: six original method-chain cases'],['Worksheet equations','mouchette-worksheet-audit.json: '+str(audit['checks'])+' per-hit equation checks over synthetic mastery values and both Shuttle branches. This cross-checks authored implementations, not gameplay.']],[170,352])
p('The friend\'s reported 500k-1m is an observation to explain, not a target to fit. Missing damage amplification and Wheel effects explain why earlier calculations were incomplete, but there is not yet evidence that the remaining difference is caused by mastery, Old Embers, or another modifier. No such effect has been added merely to match that range.','SmallX')
p('Sources: installed PC resource 150 / build 51 progression data; resource-144 recovered formula components with their documented resource-150 runtime comparisons; local evidence registry with source hashes. Character/Wheel data adapted from <link href="https://github.com/dansa/SKeyDB/tree/a2ff07765b2e0c78af827577f881054dbe224d8d" color="#145b83">dansa/SKeyDB pinned revision a2ff07765b2e</link>, licensed <link href="https://creativecommons.org/licenses/by-nc-sa/4.0/" color="#145b83">CC BY-NC-SA 4.0</link>. This worksheet contains explanatory formulas and numerical inputs, not extracted client code.','SmallX')
p('Scenario SHA-256: '+audit['scenarioSha256'],'SmallX')
p('Primary-build SHA-256: '+audit['primaryBuildSha256'],'SmallX')
out=ROOT/'output/pdf/mouchette-arachne-conditional-breakdown.pdf'
SimpleDocTemplate(str(out),pagesize=(612,792),leftMargin=45,rightMargin=45,topMargin=38,bottomMargin=48,title='Mouchette and Arachne - conditional damage worksheet').build(story,onFirstPage=footer,onLaterPages=footer)
print(out)
