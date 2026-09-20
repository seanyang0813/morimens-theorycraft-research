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
    command_counts=Counter();event_counts=Counter();initializations=[];events=[];command_results=[];property_changes=[];state_events=[];card_uses=[];hits=[];unknown_commands=[];unknown_events=[]
    init_id=catalog['commands']['rd_InitBattle'];result_id=catalog['commands']['rd_CommandResult'];cut_ids={catalog['commands']['rd_BattleCut'],catalog['commands']['rd_BattleInstantCut']}
    for record_index,record in enumerate(records):
        if not isinstance(record,dict) or not isinstance(record.get('msgId'),int) or not isinstance(record.get('msgData'),dict):raise ValueError(f'Malformed replay record {record_index}')
        msg_id=record['msgId'];name=command_names.get(msg_id);command_counts[name or f'UNKNOWN:{msg_id}']+=1
        if name is None:unknown_commands.append({'recordIndex':record_index,'msgId':msg_id})
        if msg_id==init_id:
            data=record['msgData'];initializations.append({'recordIndex':record_index,'time':record.get('time'),'roleDataList':copy.deepcopy(data.get('roleDataList',[])),'monsterDataList':copy.deepcopy(data.get('monsterDataList',[])),'cardDataList':copy.deepcopy(data.get('cardDataList',[])),'battleUuid':data.get('battleUuid'),'battleEngineUuid':data.get('battleEngineUuid')})
        if msg_id==result_id:
            nested=record['msgData'].get('msgId');command_results.append({'recordIndex':record_index,'time':record.get('time'),'commandId':nested,'commandName':command_names.get(nested),'data':copy.deepcopy(record['msgData'])})
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
    boundary_issues=[];action_snapshots=[];roles={};cards={};states={}
    for row in unknown_commands:boundary_issues.append({'code':'UNKNOWN_COMMAND',**row})
    if len(initializations)!=1:boundary_issues.append({'code':'INIT_COUNT','count':len(initializations)})
    else:
        initial=initializations[0]
        def add_entity(target,row,label):
            if not isinstance(row,dict) or not isinstance(row.get('uid'),int):boundary_issues.append({'code':'MALFORMED_INITIAL_ENTITY','kind':label});return
            target[str(row['uid'])]=copy.deepcopy(row)
            for state in row.get('stateList',[]) if isinstance(row.get('stateList',[]),list) else []:
                if isinstance(state,dict) and isinstance(state.get('stateUid'),int):states[str(state['stateUid'])]=copy.deepcopy(state)
                else:boundary_issues.append({'code':'MALFORMED_INITIAL_STATE','ownerUid':row['uid']})
        for row in initial['roleDataList']+initial['monsterDataList']:add_entity(roles,row,'role')
        for row in initial['cardDataList']:add_entity(cards,row,'card')
        for event in events:
            name,data=event['eventName'],event['data']
            if name is None:boundary_issues.append({'code':'UNKNOWN_EVENT','recordIndex':event['recordIndex'],'frameIndex':event['frameIndex'],'eventId':event['eventId']})
            elif name=='PropertyChanged':
                uid=data.get('uid');entity=roles.get(str(uid)) or cards.get(str(uid));prop=data.get('propertyType')
                if entity is None or not isinstance(prop,str) or not isinstance(data.get('value'),(int,float)):boundary_issues.append({'code':'UNBOUND_PROPERTY_CHANGE','recordIndex':event['recordIndex'],'frameIndex':event['frameIndex'],'uid':uid,'propertyType':prop})
                else:entity.setdefault('properties',{})[prop]=data['value']
            elif name in {'AddState','AddCardState'}:
                uid=data.get('stateUid')
                if not isinstance(uid,int) or not isinstance(data.get('ownerUid'),int) or not isinstance(data.get('stateId'),int):boundary_issues.append({'code':'MALFORMED_ADD_STATE','recordIndex':event['recordIndex'],'frameIndex':event['frameIndex']})
                else:states[str(uid)]=copy.deepcopy(data)
            elif name in {'ChangeStateLayer','ChangeCardStateLayer'}:
                uid=data.get('stateUid');state=states.get(str(uid))
                if state is None or not isinstance(data.get('newLayer'),(int,float)):boundary_issues.append({'code':'UNBOUND_STATE_LAYER','recordIndex':event['recordIndex'],'frameIndex':event['frameIndex'],'stateUid':uid})
                else:state.update(copy.deepcopy(data));state['layer']=data['newLayer']
            elif name=='DelState':
                uid=data.get('stateUid')
                if str(uid) not in states:boundary_issues.append({'code':'UNBOUND_DEL_STATE','recordIndex':event['recordIndex'],'frameIndex':event['frameIndex'],'stateUid':uid})
                else:del states[str(uid)]
            elif name=='ChangeCardId':
                uid=data.get('cardUid',data.get('uid'))
                if not isinstance(uid,int):boundary_issues.append({'code':'MALFORMED_CHANGE_CARD','recordIndex':event['recordIndex'],'frameIndex':event['frameIndex']})
                else:cards[str(uid)]=copy.deepcopy(data);cards[str(uid)]['uid']=uid
            elif name=='AddNewCard':
                rows=data.get('cards',[]);rows=rows if isinstance(rows,list) else [rows]
                for row in rows:add_entity(cards,row,'card')
            elif name=='CardArgsChange':
                for uid,change in data.items():
                    card=cards.get(str(uid))
                    if card is None or not isinstance(change,dict):boundary_issues.append({'code':'UNBOUND_CARD_ARGS','recordIndex':event['recordIndex'],'frameIndex':event['frameIndex'],'cardUid':uid})
                    else:card.update(copy.deepcopy(change))
            elif name in {'SkillArgsChange','SilverKeyAwakeArgsChange'}:
                role=roles.get(str(data.get('roleUid')))
                if role is None:boundary_issues.append({'code':'UNBOUND_ROLE_ARGS','recordIndex':event['recordIndex'],'frameIndex':event['frameIndex'],'roleUid':data.get('roleUid')})
                else:
                    key='skillArgs' if name=='SkillArgsChange' else 'silverKeyAwakeArgs';role[key]=copy.deepcopy(data.get('args'));role[key.replace('Args','DescArgs')]=copy.deepcopy(data.get('descArgs'))
            elif name=='ModifyCardCost':
                card=cards.get(str(data.get('cardUid')))
                if card is None:boundary_issues.append({'code':'UNBOUND_CARD_COST','recordIndex':event['recordIndex'],'frameIndex':event['frameIndex'],'cardUid':data.get('cardUid')})
                else:card['cost']=data.get('value')
            elif name=='SetCardAttribute':
                card=cards.get(str(data.get('cardUid')))
                if card is None or not isinstance(data.get('attribute'),str):boundary_issues.append({'code':'UNBOUND_CARD_ATTRIBUTE','recordIndex':event['recordIndex'],'frameIndex':event['frameIndex'],'cardUid':data.get('cardUid')})
                else:card[data['attribute']]=copy.deepcopy(data.get('val'))
            elif name=='SpawnMonster':add_entity(roles,data.get('roleData'), 'role')
            elif name=='SpawnWaveMonster':
                for row in data.get('roleDataList',[]) if isinstance(data.get('roleDataList',[]),list) else []:add_entity(roles,row,'role')
            elif name=='RemoveRole':roles.pop(str(data.get('roleUid')),None)
            elif name=='UseCard':
                active_states=[copy.deepcopy(state) for state in states.values() if not state.get('isDeleted')]
                action_snapshots.append({'actionIndex':len(action_snapshots),'recordIndex':event['recordIndex'],'frameIndex':event['frameIndex'],'time':event['frameTime'] if event['frameTime'] is not None else event['recordTime'],'cardUid':data.get('cardUid'),'camp':data.get('camp'),'roles':copy.deepcopy(roles),'cards':copy.deepcopy(cards),'activeStates':active_states,'boundaryStatus':'COMPLETE' if not boundary_issues else 'INCOMPLETE','boundaryIssueCount':len(boundary_issues)})
    for index,action in enumerate(action_snapshots):
        start=(action['recordIndex'],action['frameIndex']);next_action=action_snapshots[index+1] if index+1<len(action_snapshots) else None;end=(next_action['recordIndex'],next_action['frameIndex']) if next_action else None
        in_window=lambda record_index,frame_index=-1:(record_index,frame_index)>start and (end is None or (record_index,frame_index)<end)
        action['window']={'events':[copy.deepcopy(row) for row in events if in_window(row['recordIndex'],row['frameIndex'])],'commandResults':[copy.deepcopy(row) for row in command_results if in_window(row['recordIndex'])]}
        action['window']['selectedTargetCommands']=[row for row in action['window']['commandResults'] if row['commandName']=='lg_SelectTargets']
        action['window']['hits']=[row for row in action['window']['events'] if row['eventName']=='BeHit']
    return {'schemaVersion':1,'kind':'MORIMENS_REPLAY_EVENT_INDEX','build':catalog['build'],'inputSha256':artifact.get('inputSha256'),'protocolSourceHashes':copy.deepcopy(catalog.get('sourceHashes',{})),'battleDat':copy.deepcopy(artifact['decoded'].get('battleDat')),
      'counts':{'records':len(records),'events':len(events),'commands':dict(sorted(command_counts.items())),'renderEvents':dict(sorted(event_counts.items()))},'initializations':initializations,'events':events,'commandResults':command_results,'propertyChanges':property_changes,'stateEvents':state_events,'cardUses':card_uses,'hits':hits,'unknownCommands':unknown_commands,'unknownEvents':unknown_events,
      'actionSnapshots':action_snapshots,'snapshotBoundaryStatus':'COMPLETE' if not boundary_issues and len(initializations)==1 else 'INCOMPLETE','snapshotBoundaryIssues':boundary_issues,
      'limitations':['UseCard snapshot occurs after card energy payment and before BeforeUseCard triggers, matching original BEBeforeUseCard order','Action windows end at the next UseCard; nested/triggered actions and overlapping timelines still require evidence review','Command base value/tags and exact hit-to-row binding remain unresolved','Recorded critical result is post-outcome evidence and cannot freeze an uncertain holdout','No gameplay claim until an actual replay is decoded and reviewed']}
