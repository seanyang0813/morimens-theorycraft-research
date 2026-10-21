"""Build native-Sheets add-tab requests for a COPY of the source workbook.

Writes a JSON payload only; no authentication, upload or remote mutation.
The destination spreadsheet ID must be verified as different from the source.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp/community-sheet-requests.json'


def main():
    catalog = json.loads((ROOT / 'research/community/suggested-teams.json').read_text())
    audit = json.loads((ROOT / 'research/evidence/community-planning-audit.json').read_text())
    pressure = json.loads((ROOT / 'research/evidence/season71-zone3-example-enemy-audit.json').read_text())
    requests = []

    def sheet(sheet_id, title, rows, widths, table=False):
        columns = len(widths)
        rows = [row + [''] * (columns - len(row)) for row in rows]
        requests.append({'addSheet': {'properties': {'sheetId': sheet_id, 'title': title,
                         'index': sheet_id - 2001, 'gridProperties': {'rowCount': max(len(rows), 40),
                         'columnCount': columns, 'frozenRowCount': 1 if table else 0}}}})
        values = []
        for row in rows:
            cells = []
            for value in row:
                key = 'formulaValue' if isinstance(value, str) and value.startswith('=') else 'numberValue' if isinstance(value, (int, float)) else 'stringValue'
                cells.append({'userEnteredValue': {key: value}})
            values.append({'values': cells})
        extent = {'sheetId': sheet_id, 'startRowIndex': 0, 'endRowIndex': len(rows), 'startColumnIndex': 0, 'endColumnIndex': columns}
        requests.extend([
            {'updateCells': {'range': extent, 'rows': values, 'fields': 'userEnteredValue'}},
            {'repeatCell': {'range': extent, 'cell': {'userEnteredFormat': {
                'backgroundColor': {'red': 1, 'green': 1, 'blue': 1},
                'textFormat': {'fontFamily': 'Arial', 'fontSize': 10, 'foregroundColor': {'red': 0, 'green': 0, 'blue': 0}},
                'wrapStrategy': 'WRAP', 'verticalAlignment': 'TOP'}}, 'fields': 'userEnteredFormat'}},
            {'repeatCell': {'range': {**extent, 'endRowIndex': 1}, 'cell': {'userEnteredFormat': {
                'backgroundColor': {'red': .94, 'green': .94, 'blue': .94}, 'textFormat': {'bold': True}}},
                'fields': 'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold'}},
        ])
        for column, width in enumerate(widths):
            requests.append({'updateDimensionProperties': {'range': {'sheetId': sheet_id, 'dimension': 'COLUMNS', 'startIndex': column, 'endIndex': column + 1}, 'properties': {'pixelSize': width}, 'fields': 'pixelSize'}})
        requests.append({'updateDimensionProperties': {'range': {'sheetId': sheet_id, 'dimension': 'ROWS', 'startIndex': 0, 'endIndex': len(rows)}, 'properties': {'pixelSize': 85 if table else 46}, 'fields': 'pixelSize'}})
        requests.append({'updateDimensionProperties': {'range': {'sheetId': sheet_id, 'dimension': 'ROWS', 'startIndex': 0, 'endIndex': 1}, 'properties': {'pixelSize': 34}, 'fields': 'pixelSize'}})
        if table:
            requests.append({'setBasicFilter': {'filter': {'range': extent}}})
        return extent

    sheet(2001, 'Start here', [
        ['Morimens team research', 'How to use this workbook'],
        ['Purpose', 'Explain community recommendations and expose executable thresholds without a local game installation.'],
        ['Original preserved', 'SkeyDB is the copied source tab, including images. New tabs are structured working views.'],
        ['Team guide', 'Eight templates. Reasons from KizunoV auto-captions; character identities checked against lineup images.'],
        ['Investment', 'Recommended investment from the source. Not a proven minimum. Baseline Lv60 / SF10; skill levels assumed maxed by the video.'],
        ['Engine results', 'Six synthetic candidates, all paid-action orders. Results use the repo engine; they are not listed teams’ real damage.'],
        ['Damage grids', 'Two-axis pre-hit worksheets with source/cost notes. Explicit scenarios only; every value calls the recovered engine.'],
        ['Critical audit', 'Live arithmetic correction for the visible Rotan formula; conditional critical damage is separate from full expectation.'],
        ['Survival lab', 'Fill all five inputs. Every recorded hit is replayed with hypothetical fresh Block and capped healing. No candidate HP is inferred.'],
        ['Version boundary', 'October guides and the repo’s older pinned client are distinct. Current patch parity and complete team battle loops remain unverified.'],
        ['Source', catalog['source']['url']],
        ['Companion video', catalog['source']['companionVideo']['url']],
        ['Other guide', 'https://docs.google.com/spreadsheets/d/1cC7FOebdy_J2hONmVT1QUSk6SxIRTuVoI4XADVlq5JU/edit#gid=1757667844'],
        ['Wiki orientation', 'https://forget-last-night-morimens.fandom.com/wiki/Keyflare'],
        ['Repo', 'https://github.com/seanyang0813/morimens-theorycraft-research'],
        ['Limits', 'No game clear, win rate, minimum spend or current-build gameplay validation is established. Native Google formula results are checked separately from engine results.'],
    ], [190, 730])
    guide = [['Team', 'Roster', 'Placement advice', 'Posse', 'Why recommended', 'Hard dependencies / uncertainty', 'Source cells', 'Video', 'Source status']]
    investments = [['Team', 'Difficulty', 'Source investment text', 'Source cell', 'Meaning']]
    for team in catalog['teams']:
        guide.append([team['name'], ' / '.join(row['name'] for row in team['members']), team['placement']['text'], team['posse'], team['rationale']['text'], ' '.join(row['text'] for row in team['restrictions']) or 'Wheel icons and complete combat stats not resolved.', team['imageSource']['anchor'] + '; ' + team['placement']['cell'], team['rationale']['url'], 'Community guidance; unverified'])
        for tier in team['tiers']:
            investments.append([team['name'], tier['tier'], tier['text'], tier['cell'], 'Recommendation, not minimum; baseline Lv60 / SF10'])
        if not team['tiers']:
            investments.append([team['name'], 'Unknown', 'Source author does not know the investment breakpoints.', 'K105', 'Do not infer a breakpoint'])
    sheet(2002, 'Team guide', guide, [220, 300, 270, 170, 340, 340, 140, 290, 180], True)
    sheet(2003, 'Investment', investments, [220, 120, 750, 100, 270], True)
    results = [['Synthetic candidate', 'Best paid-action order', 'Modeled HP loss', 'Threshold', 'Result / scope']]
    for row in audit['syntheticWheelThreshold']['candidates']:
        results.append([row['id'], ' → '.join(row['bestOrder']), row['modeledHpLost'], 1000, 'PASS in model' if row['passed'] else 'FAIL in model'])
    results += [
        ['Inputs', '100/500 base; Doomsday attack 1000; 2 Compute; one explicit Arachne pursuit; neutral target. Synthetic only.'],
        ['Search scope', '12 permutations; six explicit Wheel loadouts; all orders of the two supplied cards.'],
        ['Survival fixture', 'Hypothetical HP 3000, start HP 3000, heal 200, horizon 8.', 406, '', 'Minimum Block/turn; 405 fails. Not an actual build.'],
        ['Portfolio search', '256 template subsets checked; 3 maximum-size portfolios of 5 teams. Character and Posse overlap only.'],
        ['Missing mechanics', 'No inferred Keyflare, hand/draw model, team HP, unsupported upgrades or enemy response.'],
    ]
    sheet(2004, 'Engine results', results, [280, 670, 140, 100, 290])
    # Live spreadsheet survival recurrence mirrors the separately tested JS/Python model.
    lab = [
        ['Fixed Zone 3 enemy-pressure lab', 'Candidate inputs required'],
        ['Supply whole numbers; blank HP stays unknown.', 'No game clear is implied'],
        ['Candidate max HP', ''], ['Candidate starting HP', ''], ['Effective heal at turn start', ''],
        ['Fresh Block each turn', ''], ['Horizon (turns 1–16)', 8],
        ['Model', 'Fresh Block expires at turn end. Healing caps at max HP. Recorded damage already includes its observed modifiers.'],
        ['Input state', '=IF(COUNT(B3:B7)<5,"INPUTS REQUIRED",IF(AND(B3>0,B4>0,B4<=B3,B5>=0,B6>=0,B7>=1,B7<=16,SUMPRODUCT(MOD(B3:B7,1))=0),"VALID","INVALID INPUTS"))'],
        ['Result', ''],
        ['Boundary', 'A pass survives this fixed trace only. It does not show any candidate can supply this healing/Block or change enemy actions.'],
        ['Source', 'research/evidence/season71-zone3-example-enemy-audit.json; record order and 20% max-HP cuts preserved.'],
        ['Try the explicitly hypothetical fixture', 'HP=3000; starting HP=3000; heal=200; Block=406; horizon=8 passes, while Block=405 fails.'],
        ['Turn', 'Incoming pre-Block', '20% max-HP cut', 'HP before hit', 'Block before hit', 'HP after hit', 'Block after hit', 'Max HP after hit', 'Status'],
    ]
    changes = {(row['turn'], row['record']) for row in pressure['playerMaxHpChanges']}
    for i, row in enumerate(pressure['enemyHitsToPlayer']):
        r = 15 + i
        prev = r - 1
        cut = 1 if (row['turn'], row['record']) in changes else 0
        gate = f'OR($B$9<>"VALID",A{r}>$B$7' + (f',I{prev}="DEAD",I{prev}=""' if i else '') + ')'
        old_max = '$B$3' if i == 0 else f'H{prev}'
        hp_before = 'MIN($B$3,$B$4+$B$5)' if i == 0 else f'IF(A{r}=A{prev},F{prev},MIN(H{prev},F{prev}+$B$5))'
        block_before = '$B$6' if i == 0 else f'IF(A{r}=A{prev},G{prev},$B$6)'
        raw_hp = f'D{r}-MAX(0,B{r}-E{r})'
        lab.append([
            row['turn'], row['incomingBeforeBlock'], cut,
            f'=IF({gate},"",{hp_before})',
            f'=IF(D{r}="","",{block_before})',
            f'=IF(D{r}="","",IF({raw_hp}<=0,{raw_hp},MIN({raw_hp},H{r})))',
            f'=IF(D{r}="","",MAX(0,E{r}-B{r}))',
            f'=IF(D{r}="","",IF(AND(C{r}=1,{raw_hp}>0),ROUNDUP({old_max}*0.8,0),{old_max}))',
            f'=IF(D{r}="","",IF(F{r}<=0,"DEAD","ALIVE"))',
        ])
    lab[9][1] = f'=IF(B9<>"VALID",B9,IF(COUNTIF(I15:I{len(lab)},"DEAD")>0,"FAIL fixed trace","PASS fixed trace"))'
    sheet(2005, 'Survival lab', lab, [260, 310, 160, 130, 140, 130, 140, 150, 170])
    requests.append({'repeatCell': {'range': {'sheetId': 2005, 'startRowIndex': 2, 'endRowIndex': 7, 'startColumnIndex': 1, 'endColumnIndex': 2}, 'cell': {'userEnteredFormat': {'backgroundColor': {'red': .96, 'green': .96, 'blue': .96}, 'numberFormat': {'type': 'NUMBER', 'pattern': '0'}}}, 'fields': 'userEnteredFormat.backgroundColor,userEnteredFormat.numberFormat'}})
    requests.append({'setDataValidation': {'range': {'sheetId': 2005, 'startRowIndex': 2, 'endRowIndex': 7, 'startColumnIndex': 1, 'endColumnIndex': 2}, 'rule': {'condition': {'type': 'NUMBER_GREATER_THAN_EQ', 'values': [{'userEnteredValue': '0'}]}, 'strict': True, 'inputMessage': 'Whole numbers; max/start HP > 0, start <= max, horizon 1–16.'}}})
    requests.append({'repeatCell': {'range': {'sheetId': 2005, 'startRowIndex': 13, 'endRowIndex': 14}, 'cell': {'userEnteredFormat': {'backgroundColor': {'red': .94, 'green': .94, 'blue': .94}, 'textFormat': {'bold': True}}}, 'fields': 'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold'}})
    requests.append({'updateDimensionProperties': {'range': {'sheetId': 2005, 'dimension': 'ROWS', 'startIndex': 14, 'endIndex': len(lab)}, 'properties': {'pixelSize': 28}, 'fields': 'pixelSize'}})
    for start, end in [(7, 8), (10, 13)]:
        requests.append({'updateDimensionProperties': {'range': {'sheetId': 2005, 'dimension': 'ROWS', 'startIndex': start, 'endIndex': end}, 'properties': {'pixelSize': 72}, 'fields': 'pixelSize'}})
    grids = [['Damage grids — engine pre-hit', 'Every cell uses explicit resolved inputs'],
             ['Boundary', 'Skill/upgrade/stack transforms are not inferred; these are arithmetic examples, not complete character simulations.']]
    for name, metric in [('visible-rotan', 'expected'), ('active', 'expected'), ('tentacle', 'critical')]:
        result = json.loads(subprocess.check_output(['node', 'tools/run_damage_worksheet.mjs', f'research/examples/damage-worksheet-{name}.json'], cwd=ROOT, text=True))
        setup = result['setups'][0]
        grids += [[], [setup['label'], metric + ' pre-hit damage'],
                  [result['rowAxis']['label'] + ' / ' + result['columnAxis']['label'], *result['columnAxis']['values']]]
        for row_value in result['rowAxis']['values']:
            grids.append([row_value, *[next(cell[metric] for cell in setup['grid'] if cell['rowValue'] == row_value and cell['columnValue'] == column_value) for column_value in result['columnAxis']['values']]])
        grids += [['Source', setup['source']], ['Critical probability', 'Unknown' if setup['criticalProbability'] is None else setup['criticalProbability']],
                  ['Cost', setup['cost']], ['Trace and rebuild', f'node tools/run_damage_worksheet.mjs research/examples/damage-worksheet-{name}.json']]
    sheet(2006, 'Damage grids', grids, [360, 230, 180, 180, 180, 180])
    for i, row in enumerate(grids):
        if len(row) == 2 and isinstance(row[1], str) and row[1]:
            requests.append({'mergeCells': {'range': {'sheetId': 2006, 'startRowIndex': i, 'endRowIndex': i + 1, 'startColumnIndex': 1, 'endColumnIndex': 6}, 'mergeType': 'MERGE_ALL'}})
    requests.append({'repeatCell': {'range': {'sheetId': 2006, 'startRowIndex': 0, 'endRowIndex': len(grids), 'startColumnIndex': 1, 'endColumnIndex': 6}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'NUMBER', 'pattern': '#,##0.###'}}}, 'fields': 'userEnteredFormat.numberFormat'}})
    critical_rows = [
        ['Critical expectation audit', 'Value', 'Meaning / evidence'],
        ['Scope', 'Visible Rotan arithmetic', 'User-provided image; no claim of game coefficient or build validation.'],
        ['Critical probability p', 0.746, 'Displayed 74.6% treated literally. Runtime discrete-roll probability needs complete context.'],
        ['Noncritical pre-hit damage', 8357, 'Visible STR 100 case: ceil(1158 × 2.864 × 1.692 × 1.4) + 5 × 100.'],
        ['Critical bonus', 2.2, '220% bonus means a total critical factor of 3.2 in this visible expression.'],
        ['Conditional critical damage', '=CEILING(B4*(1+B5),1)', 'Round the critical branch before computing its expectation.'],
        ['Critical-only contribution', '=B3*B6', 'This omits all noncritical outcomes; it is not expected damage.'],
        ['Expected pre-hit damage', '=(1-B3)*B4+B3*B6', 'Includes both branches; an expectation may be fractional.'],
        ['Visible screenshot expression', '=CEILING(B4*B3*(1+B5),1)', 'Reproduces 19,950 from the visible formula. Its final rounding differs from rounding each outcome.'],
        ['Correction versus visible value', '=B8-B9', 'Approximately 2,123 additional expected damage under the same displayed probability.'],
        ['Game mechanics still missing', 'Not validated', 'Target modifiers, skill coefficients, build, crit eligibility and discrete probability.'],
        ['Vortice RM ledger', 'Unrounded total', 'Checks only visible sum/multiplier arithmetic.'],
        ['RM setup', '=(24+48+72+72+102+450)*1.35', '1,036.8, consistent with displayed 1,037.'],
        ['Crit setup', '=(24+48+72+0+102+450)*1.35', '939.6, consistent with displayed 940.'],
        ['What to reuse from old sheets', 'Cost, setup and two-axis damage grids', 'Keep source stat ledgers, conditions and outputs separate.'],
        ['Unknown conditions', 'Remain unknown', 'A checkbox does not reconstruct Rouse, OE/AA, proc counters, resources or enemy state.'],
    ]
    sheet(2007, 'Critical audit', critical_rows, [310, 240, 690])
    requests.append({'setDataValidation': {'range': {'sheetId': 2007, 'startRowIndex': 2, 'endRowIndex': 3, 'startColumnIndex': 1, 'endColumnIndex': 2}, 'rule': {'condition': {'type': 'NUMBER_BETWEEN', 'values': [{'userEnteredValue': '0'}, {'userEnteredValue': '1'}]}, 'strict': True}}})
    requests.append({'repeatCell': {'range': {'sheetId': 2007, 'startRowIndex': 2, 'endRowIndex': 3, 'startColumnIndex': 1, 'endColumnIndex': 2}, 'cell': {'userEnteredFormat': {'numberFormat': {'type': 'PERCENT', 'pattern': '0.0%'}}}, 'fields': 'userEnteredFormat.numberFormat'}})
    # Reject malformed hand-authored requests before sending any remote mutation.
    for request in requests:
        assert len(request) == 1
        if 'updateCells' in request:
            value = request['updateCells']; area = value['range']
            assert len(value['rows']) == area['endRowIndex'] - area['startRowIndex']
            assert all(len(row['values']) == area['endColumnIndex'] - area['startColumnIndex'] for row in value['rows'])
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({'requests': requests, 'include_spreadsheet_in_response': True,
                             'response_include_grid_data': False}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'payload': str(OUT.relative_to(ROOT)), 'requests': len(requests), 'tabs': 7, 'pressureRows': len(pressure['enemyHitsToPlayer'])}))


if __name__ == '__main__':
    main()
