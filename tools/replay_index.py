"""Build a lossless chronological index from an offline decoded replay."""
from __future__ import annotations
from collections import Counter
import copy

STATE_EVENTS={'AddState','ChangeStateLayer','DelState','AddCardState','ChangeCardStateLayer'}

def build_replay_index(artifact,catalog):
    if not isinstance(artifact,dict) or artifact.get('schemaVersion')!=1 or artifact.get('kind')!='MORIMENS_DECODED_REPLAY' or not isinstance(artifact.get('decoded'),dict):raise ValueError('Supported decoded replay artifact required')
    if not isinstance(catalog,dict) or catalog.get('build')!='pc-res144-build51':raise ValueError('PC144 replay protocol catalog required')
    records=artifact['decoded'].get('unZippedRecord')
    if not isinstance(records,list):raise ValueError('Decoded replay requires unZippedRecord list')
    command_names={value:key for key,value in catalog['commands'].items()};event_names={value:key for key,value in catalog['renderEvents'].items()}
    command_counts=Counter();event_counts=Counter();initializations=[];events=[];property_changes=[];state_events=[];card_uses=[];hits=[];unknown_commands=[];unknown_events=[]
    init_id=catalog['commands']['rd_InitBattle'];cut_ids={catalog['commands']['rd_BattleCut'],catalog['commands']['rd_BattleInstantCut']}
    for record_index,record in enumerate(records):
        if not isinstance(record,dict) or not isinstance(record.get('msgId'),int) or not isinstance(record.get('msgData'),dict):raise ValueError(f'Malformed replay record {record_index}')
        msg_id=record['msgId'];name=command_names.get(msg_id);command_counts[name or f'UNKNOWN:{msg_id}']+=1
        if name is None:unknown_commands.append({'recordIndex':record_index,'msgId':msg_id})
        if msg_id==init_id:
            data=record['msgData'];initializations.append({'recordIndex':record_index,'time':record.get('time'),'roleDataList':copy.deepcopy(data.get('roleDataList',[])),'monsterDataList':copy.deepcopy(data.get('monsterDataList',[])),'cardDataList':copy.deepcopy(data.get('cardDataList',[])),'battleUuid':data.get('battleUuid'),'battleEngineUuid':data.get('battleEngineUuid')})
        if msg_id not in cut_ids:continue
        frames=record['msgData'].get('frameList')
        if not isinstance(frames,list):raise ValueError(f'Battle cut {record_index} requires frameList')
        for frame_index,frame in enumerate(frames):
            if not isinstance(frame,dict):raise ValueError(f'Malformed frame {record_index}:{frame_index}')
            if 'eventId' not in frame:continue
            event_id=frame['eventId']
            if not isinstance(event_id,int):raise ValueError(f'Noninteger event ID {record_index}:{frame_index}')
            event_name=event_names.get(event_id);event_counts[event_name or f'UNKNOWN:{event_id}']+=1
            data=frame.get('data',{})
            if not isinstance(data,dict):raise ValueError(f'Nonobject event data {record_index}:{frame_index}')
            row={'recordIndex':record_index,'frameIndex':frame_index,'recordTime':record.get('time'),'frameTime':frame.get('time'),'eventId':event_id,'eventName':event_name,'data':copy.deepcopy(data)};events.append(row)
            if event_name is None:unknown_events.append({'recordIndex':record_index,'frameIndex':frame_index,'eventId':event_id})
            elif event_name=='PropertyChanged':property_changes.append(row)
            elif event_name in STATE_EVENTS:state_events.append(row)
            elif event_name=='UseCard':card_uses.append(row)
            elif event_name=='BeHit':hits.append(row)
    return {'schemaVersion':1,'kind':'MORIMENS_REPLAY_EVENT_INDEX','build':catalog['build'],'inputSha256':artifact.get('inputSha256'),'protocolSourceHashes':copy.deepcopy(catalog.get('sourceHashes',{})),'battleDat':copy.deepcopy(artifact['decoded'].get('battleDat')),
      'counts':{'records':len(records),'events':len(events),'commands':dict(sorted(command_counts.items())),'renderEvents':dict(sorted(event_counts.items()))},'initializations':initializations,'events':events,'propertyChanges':property_changes,'stateEvents':state_events,'cardUses':card_uses,'hits':hits,'unknownCommands':unknown_commands,'unknownEvents':unknown_events,
      'limitations':['Chronological lossless index only; no automatic action grouping or pre-action snapshot reconstruction','Recorded critical result is post-outcome evidence and cannot freeze an uncertain holdout','No gameplay claim until an actual replay is decoded and reviewed']}
