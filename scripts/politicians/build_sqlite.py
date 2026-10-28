#!/usr/bin/env python3
"""사람별 JSON → SQLite 스냅샷(분석·통계용). 원본은 JSON, 이 파일은 언제든 다시 만들 수 있음.
테이블: people, terms, party_switches, bills, news, incidents"""
import json, glob, sqlite3, sys, os
P, OUT = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'politicians.sqlite'
if os.path.exists(OUT): os.remove(OUT)
db = sqlite3.connect(OUT); c = db.cursor()
c.executescript('''
create table people(id text primary key,name text,hanja text,en text,birth text,sex text,current int,party text,district text,reelect text,photo text,committees text,history text,json text);
create table terms(pid text,age int,party text,district text,kind text);
create table party_switches(pid text,from_party text,to_party text,age_from int,age_to int);
create table bills(id text primary key,no text,name text,date text,age int,committee text,result text,url text,proposer text);
create table bill_people(bill_id text,pid text,role text);
create table news(pid text,date text,title text,url text,press text,via text);
create table incidents(pid text,date text,stage text,title text,url text,press text);
''')
for f in glob.glob(f'{P}/people/*.json'):
    d = json.load(open(f, encoding='utf-8')); i = d['id']
    c.execute('insert into people values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (i, d['name'], d.get('hanja'), d.get('en'), d.get('birth'), d.get('sex'), int(d.get('current', False)), d.get('party'), d.get('district'), d.get('reelect'), d.get('photo'), d.get('committees'), '\n'.join(d.get('history') or []), json.dumps(d, ensure_ascii=False)))
    c.executemany('insert into terms values(?,?,?,?,?)', [(i, t['age'], t['party'], t['district'], t['kind']) for t in d.get('terms', [])])
    c.executemany('insert into party_switches values(?,?,?,?,?)', [(i, s['from'], s['to'], *s['between']) for s in d.get('party_switches', [])])
    c.executemany('insert into news values(?,?,?,?,?,?)', [(i, n['date'], n['title'], n['url'], n.get('press'), n.get('via')) for n in d.get('news', [])])
    c.executemany('insert into incidents values(?,?,?,?,?,?)', [(i, n['date'], n['stage'], n['title'], n['url'], n.get('press')) for n in (d.get('incidents') or {}).get('items', [])])
for f in glob.glob(f'{P}/bills_*.json'):
    for b in json.load(open(f, encoding='utf-8')):
        c.execute('insert or replace into bills values(?,?,?,?,?,?,?,?,?)', (b['id'], b['no'], b['name'], b['date'], b['age'], b['committee'], b['result'], b['url'], b['proposer']))
db.commit(); print('sqlite', OUT, c.execute('select count(*) from people').fetchone()[0], 'people')
