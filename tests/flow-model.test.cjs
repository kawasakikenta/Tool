const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
const model = html.match(/\/\/ BEGIN FLOW MODEL([\s\S]*?)\/\/ END FLOW MODEL/)[1];
const {parse, layout, editEdgeLabel, insertEdgeNode, editNodeText, editLaneText, readSettings, writeSettings, setConnectionMode, connectionMode, updateNode, addVisualNode, connectNodes, removeFromFlow, moveVisualNode, resetPositions, safeMediaUrl, normalizeMedia, setMediaCards, changeMedia, resizeMedia, validateBoard} = vm.runInNewContext(model + '\n({parse,layout,editEdgeLabel,insertEdgeNode,editNodeText,editLaneText,readSettings,writeSettings,setConnectionMode,connectionMode,updateNode,addVisualNode,connectNodes,removeFromFlow,moveVisualNode,resetPositions,safeMediaUrl,normalizeMedia,setMediaCards,changeMedia,resizeMedia,validateBoard})', {URL});
const plain = value => JSON.parse(JSON.stringify(value));
const edges = graph => plain(graph.edges.map(({from,to,label}) => ({from,to,label})));

const imageCard = {id:'media-test',type:'image',assetId:'asset-test',title:'参考画像',x:2500,y:1400,width:400,height:280,aspect:true,border:'blue'};
test('media remains editable through flow changes and both orientations include its bounds', () => {
  const text=setMediaCards('営業:\nA → B', [imageCard]);
  const updated=editNodeText(text,parse(text),'A','確認');
  assert.deepEqual(plain(readSettings(updated).media),[imageCard]);
  for(const orientation of ['horizontal','vertical']){
    const graph=layout(parse(writeSettings(updated,{...readSettings(updated),orientation})));
    assert.ok(graph.width>=2900);assert.ok(graph.height>=1680);
    assert.deepEqual(plain(graph.settings.media),[imageCard]);
  }
  const moved=changeMedia(text,'media-test',{x:500,y:600,width:700});
  assert.equal(readSettings(moved).media[0].width,700);
  assert.equal(parse(moved).edges.length,1);
  assert.equal(readSettings(setMediaCards(moved,[])).media.length,0);
});
test('media metadata rejects unsafe URLs, duplicate IDs and invalid assets and bounds geometry', () => {
  for(const url of ['javascript:alert(1)','data:text/html,test','file:///tmp/test','https://user:pass@example.com','//example.com'])assert.equal(safeMediaUrl(url),null);
  assert.equal(safeMediaUrl(' https://example.com/a?q=1 '),'https://example.com/a?q=1');
  const cards=normalizeMedia([imageCard,imageCard,{...imageCard,id:'\" onclick=alert(1)'},{...imageCard,id:'media-other',type:'embed',url:'javascript:alert(1)'},{...imageCard,id:'media-bad',assetId:'data:image/png;base64,AAA='},{...imageCard,id:'media-bounded',x:-50,y:Infinity,width:99999,height:-12}]);
  assert.equal(cards.length,2);assert.equal(cards[1].x,12);assert.equal(cards[1].y,100);assert.equal(cards[1].width,2000);assert.equal(cards[1].height,90);
  assert.deepEqual(plain(readSettings('A → B').media),[]);
});
test('image resize preserves the inner image ratio and allows independent dimensions', () => {
  const resized=resizeMedia(imageCard,600,500,2);
  assert.equal((resized.width-24)/(resized.height-52),2);
  const free=resizeMedia(imageCard,600,500);assert.equal(free.width,600);assert.equal(free.height,500);
  const big=resizeMedia(imageCard,9000,9000,2);assert.ok(big.width<=2000&&big.height<=1800);
});
test('portable boards validate format and require embedded raster assets', () => {
  const board={format:'simple-flow-board',version:1,name:'画像ボード',theme:'green',source:setMediaCards('A → B',[imageCard]),assets:[{id:'asset-test',dataUrl:'data:image/png;base64,AAAA'}]};
  const valid=validateBoard(board);assert.equal(valid.name,'画像ボード');assert.equal(valid.assets.length,1);
  assert.throws(()=>validateBoard({...board,version:2}),/対応/);
  assert.throws(()=>validateBoard({...board,assets:[]}),/必要な画像/);
  assert.throws(()=>validateBoard({...board,assets:[{id:'asset-test',dataUrl:'data:image/svg+xml;base64,AAAA'}]}),/画像データ/);
  assert.throws(()=>validateBoard({...board,assets:[...board.assets,...board.assets]}),/画像データ/);
});

test('labels apply to each segment, including ASCII arrows and quoted punctuation', () => {
  const graph = parse('営業:\nA["受付 → 確認"] -- "はい -- \\"確認\\"" -> B -- 完了後 --> C');
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.nodes[0].label, '受付 → 確認');
  assert.deepEqual(edges(graph), [{from:'A',to:'B',label:'はい -- "確認"'},{from:'B',to:'C',label:'完了後'}]);
});

test('editing a middle edge preserves other labels, comments, lane declarations and CRLF', () => {
  const text = '# メモ\r\n営業：\r\n  A -- 前半 --> B -> C\r\n責任者:\r\nC → D\r\n';
  const graph = parse(text);
  const result = editEdgeLabel(text, graph.edges[1], '承認 → 次へ <確認>');
  assert.equal(result, '# メモ\r\n営業：\r\n  A -- 前半 --> B -- "承認 → 次へ <確認>" -> C\r\n責任者:\r\nC → D\r\n');
  assert.deepEqual(edges(parse(result)), [{from:'A',to:'B',label:'前半'},{from:'B',to:'C',label:'承認 → 次へ <確認>'},{from:'C',to:'D',label:''}]);
  assert.equal(parse(result).nodes.find(node=>node.id==='D').lane, '責任者');
});

test('removing a label does not remove its connection', () => {
  const text = 'A -- "はい" → B -- その後 → C';
  const result = editEdgeLabel(text, parse(text).edges[0], '');
  assert.deepEqual(edges(parse(result)), [{from:'A',to:'B',label:''},{from:'B',to:'C',label:'その後'}]);
});

test('inserting a shape preserves surrounding edges and moves the label to its incoming edge', () => {
  const text = '営業:\nA → B -- 承認後 → C → D\n# 次の担当\n責任者:\nC → E';
  const graph = parse(text), result = insertEdgeNode(text, graph, graph.edges[1], 'decision', '内容[再確認] → OK？');
  const updated = parse(result.text), node = updated.nodes.find(node=>node.id===result.id);
  assert.equal(node.type, 'decision');
  assert.equal(node.label, '内容[再確認] → OK？');
  assert.equal(node.lane, '営業');
  assert.equal(updated.edges.some(edge=>edge.from==='B'&&edge.to==='C'), false);
  assert.deepEqual(edges(updated), [{from:'A',to:'B',label:''},{from:'B',to:result.id,label:'承認後'},{from:result.id,to:'C',label:''},{from:'C',to:'D',label:''},{from:'C',to:'E',label:''}]);
  assert.ok(result.text.includes('# 次の担当\n責任者:\nC → E'));
});

test('duplicate occurrences are edited together without duplicate stages or stale direct connections', () => {
  const text = '営業:\n工程1[既存] → A -- はい → B\n責任者:\nA -- はい → B → C';
  const graph = parse(text), edge = graph.edges.find(edge=>edge.from==='A'&&edge.to==='B');
  const labeled = editEdgeLabel(text, edge, '確認後');
  assert.equal((labeled.match(/-- "確認後"/g)||[]).length, 2);
  const result = insertEdgeNode(text, graph, edge, 'process', '追加工程');
  assert.equal(result.id, '工程2');
  const updated = parse(result.text);
  assert.equal(updated.nodes.filter(node=>node.label==='追加工程').length, 1);
  assert.equal(updated.nodes.find(node=>node.id===result.id).lane, '営業');
  assert.equal(updated.edges.some(edge=>edge.from==='A'&&edge.to==='B'), false);
  assert.equal(updated.edges.filter(edge=>edge.to===result.id).length, 1);
});

test('insertion before a shared destination moves that destination after the inserted stage', () => {
  const text = 'A → B\nX → B', graph = parse(text);
  const result = insertEdgeNode(text, graph, graph.edges[0], 'terminal', '確認完了');
  const positioned = layout(parse(result.text));
  const x = id => positioned.nodes.find(node=>node.id===id).x;
  assert.ok(x('A') < x(result.id));
  assert.ok(x(result.id) < x('B'));
  assert.equal(positioned.nodes.find(node=>node.id===result.id).type, 'terminal');
});

test('cycles and self-loops remain finite and can be split', () => {
  const graph = parse('A → A\nA → B\nB → C → B');
  const result = insertEdgeNode('A → A\nA → B\nB → C → B', graph, graph.edges[0], 'process', '再確認');
  const positioned = layout(parse(result.text));
  assert.ok(Number.isFinite(positioned.width));
  assert.ok(positioned.width < 10000);
  assert.ok(positioned.nodes.every(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)));
});

test('existing explicit shapes, single stages, comments and empty input still parse', () => {
  const graph = parse('# comment\n営業:\n開始((受付)) → 確認[内容確認]\n確認 → 判断{対応可能？}\n判断 -- はい → 完了((納品完了))\n独立工程');
  assert.equal(graph.nodes.length, 5);
  assert.equal(graph.nodes.find(node=>node.id==='確認').label, '内容確認');
  assert.equal(graph.nodes.find(node=>node.id==='完了').type, 'terminal');
  assert.equal(parse('').nodes.length, 0);
});

test('editing a display name updates every reference and preserves IDs, shapes and connections', () => {
  const text = '# メモ\n営業:\n受付 → 確認{確認？} → 完了\n経理:\n確認 → 請求\n確認{確認？} → 保存';
  const graph = parse(text), result = editNodeText(text,graph,'確認','新しい "確認" → [判定]');
  const updated = parse(result);
  assert.deepEqual(edges(updated),edges(graph));
  assert.equal(updated.nodes.length,graph.nodes.length);
  assert.equal(updated.nodes.find(n=>n.id==='確認').label,'新しい "確認" → [判定]');
  assert.equal(updated.nodes.find(n=>n.id==='確認').type,'decision');
  assert.equal(updated.nodes.find(n=>n.id==='確認').lane,'営業');
  assert.ok(result.startsWith('# メモ\n営業:'));
  assert.throws(()=>editNodeText(text,graph,'確認','  '));
});

test('lane editing handles repeated headings and implicit lanes without merging lanes', () => {
  const text='A → B\n経理:\nB → C\n共通:\nA → D',graph=parse(text);
  const result=editLaneText(text,graph,'共通','営業 → 製造'),updated=parse(result);
  assert.deepEqual(plain(updated.lanes),['営業 → 製造','経理']);
  assert.equal(updated.nodes.find(n=>n.id==='D').lane,'営業 → 製造');
  assert.equal(updated.nodes.find(n=>n.id==='C').lane,'経理');
  assert.deepEqual(edges(updated),edges(graph));
  assert.throws(()=>editLaneText(text,graph,'共通','経理'));
});

test('parallel labeled connections remain independently editable and have different routes', () => {
  const text='A -- はい → B\nA -- いいえ → B\nA -- 保留 → B',graph=layout(parse(text));
  assert.equal(graph.edges.length,3);
  assert.equal(new Set(graph.routes.map(r=>r.d)).size,3);
  assert.equal(new Set(graph.routes.map(r=>r.color)).size,3);
  const updated=parse(editEdgeLabel(text,graph.edges[1],'差戻し'));
  assert.deepEqual(plain(updated.edges.map(e=>e.label)),['はい','差戻し','保留']);
});

test('vertical layout keeps text geometry upright, lanes side by side and edges within bounds', () => {
  const text='営業:\nA -- はい → B\nA -- いいえ → B\nA -- 保留 → B\n経理:\nB → C → D\nA → D\nD → A';
  const settings={...readSettings(text),orientation:'vertical'},graph=layout(parse(writeSettings(text,settings)));
  const node=id=>graph.nodes.find(n=>n.id===id);
  assert.ok(node('B').y>node('A').y);
  assert.ok(node('C').x>node('A').x);
  assert.equal(node('A').width,166);
  for(const route of graph.routes)for(const p of route.points){assert.ok(p.x>=0&&p.x<=graph.width,JSON.stringify(p));assert.ok(p.y>=0&&p.y<=graph.height,JSON.stringify(p))}
});

test('long connections use matching destinations and manual modes override auto shortening', () => {
  let text='A → B → C → D\nA -- 直行 → D';
  text=writeSettings(text,{...readSettings(text),longLinks:'auto'});
  let graph=layout(parse(text));
  assert.equal(graph.routes.filter(r=>r.jump).length,1);
  assert.equal(graph.routes[3].badge.text,'④へ · 直行');
  text=setConnectionMode(text,graph.edges[3],'line');
  graph=layout(parse(text));assert.equal(graph.routes[3].jump,false);
  text=setConnectionMode(text,graph.edges[0],'jump');
  graph=layout(parse(text));assert.equal(graph.routes[0].badge.target,'B');
  assert.equal(graph.routes[0].badge.text,'②へ');
});

test('settings survive text edits and insertion without orphaned connection preferences', () => {
  let text='A -- はい → B',graph=parse(text);
  text=setConnectionMode(text,graph.edges[0],'jump');graph=parse(text);
  text=editEdgeLabel(text,graph.edges[0],'承認後');graph=parse(text);
  assert.equal(connectionMode(graph.settings,graph.edges[0]),'jump');
  const result=insertEdgeNode(text,graph,graph.edges[0],'process','確認');
  const updated=parse(result.text);
  assert.equal(updated.settings.connections.length,1);
  assert.equal(connectionMode(updated.settings,updated.edges.find(e=>e.from===result.id)),'jump');
  assert.equal(updated.settings.connections[0].from,result.id);
  assert.ok(result.text.includes('A -- "承認後"'));
});

test('long shape labels and multiple jump badges stay inside both layouts', () => {
  const name='確認'.repeat(60),base='A{'+JSON.stringify(name)+'} → B → C → D\nA -- 別の確認経路 → C\nA -- まとめて処理 → D';
  for(const orientation of ['horizontal','vertical']){
    const text=writeSettings(base,{...readSettings(base),orientation,longLinks:'auto'}),initial=parse(text);
    const graph=layout(parse(setConnectionMode(text,initial.edges[3],'jump')));
    for(const node of graph.nodes){assert.ok(node.x>=0&&node.y>=0);assert.ok(node.x+node.width<=graph.width&&node.y+node.height<=graph.height)}
    for(const route of graph.routes){
      for(const point of route.points)assert.ok(point.x>=0&&point.y>=0&&point.x<=graph.width&&point.y<=graph.height);
      if(route.badge){const b=route.badge;assert.ok(b.x-b.width/2>=0&&b.y-b.height/2>=0);assert.ok(b.x+b.width/2<=graph.width&&b.y+b.height/2<=graph.height)}
    }
  }
});

test('node properties retain connections while changing shape, color and lane', () => {
  const text='営業:\nA[受付] → B[確認] → C\n管理:\nB → D',graph=parse(text);
  const next=updateNode(text,graph,'B',{label:'承認しますか？',type:'decision',color:'purple',lane:'管理'}),updated=parse(next);
  const node=updated.nodes.find(n=>n.id==='B');
  assert.equal(node.type,'decision');assert.equal(node.color,'purple');assert.equal(node.lane,'管理');assert.equal(node.label,'承認しますか？');
  assert.deepEqual(edges(updated),edges(graph));
  const renamed=parse(editLaneText(next,updated,'管理','責任者'));
  assert.equal(renamed.nodes.find(n=>n.id==='B').lane,'責任者');
});

test('new shapes receive distinct IDs and connect without duplicating existing edges', () => {
  const text='営業:\n図形1[既存] → B',graph=parse(text);
  const added=addVisualNode(text,graph,{type:'decision',label:'既存',lane:'営業',color:'green',position:{flow:500,cross:80}});
  assert.equal(added.id,'図形2');assert.equal(parse(added.text).nodes.length,3);
  const connected=connectNodes(added.text,parse(added.text),'B',added.id);
  assert.equal(parse(connected).edges.length,2);
  assert.equal(connectNodes(connected,parse(connected),'B',added.id),connected);
  assert.throws(()=>connectNodes(connected,parse(connected),'B','B'));
});

test('deleting a node removes every reference without silently bridging its neighbors', () => {
  const text='# メモ\r\n営業:\r\nA -- 前 → B[確認] -- 後 → C → D\r\n管理:\r\nE → B → F\r\nB → B\r\n';
  const next=removeFromFlow(text,'B'),graph=parse(next);
  assert.deepEqual(plain(graph.nodes.map(n=>n.id)),['A','C','D','E','F']);
  assert.deepEqual(edges(graph),[{from:'C',to:'D',label:''}]);
  assert.ok(next.includes('# メモ\r\n'));assert.ok(next.includes('管理:\r\n'));
  assert.equal(graph.nodes.find(n=>n.id==='F').lane,'管理');
});

test('deleting one labeled connection preserves all shapes and other parallel connections', () => {
  const text='A[受付] -- はい → B[処理] → C\nA -- いいえ → B\nA -- はい → B';
  const graph=parse(text),next=removeFromFlow(text,null,graph.edges[0]),updated=parse(next);
  assert.deepEqual(plain(updated.nodes.map(n=>n.id)),['A','B','C']);
  assert.deepEqual(edges(updated),[{from:'B',to:'C',label:''},{from:'A',to:'B',label:'いいえ'}]);
  assert.equal(updated.nodes.find(n=>n.id==='B').label,'処理');
});

test('dragging saves snapped positions and lane membership independently in both orientations', () => {
  let text='営業:\nA → B\n管理:\nC',graph=layout(parse(text));
  const band=graph.laneBands.find(b=>b.lane==='管理');
  text=moveVisualNode(text,graph,'B',487,band.start+63,true);graph=layout(parse(text));
  let node=graph.nodes.find(n=>n.id==='B');assert.equal(node.x,490);assert.equal(node.lane,'管理');assert.equal(node.y,graph.laneBands.find(b=>b.lane==='管理').start+60);
  const horizontal=readSettings(text).nodes.find(n=>n.id==='B').positions.horizontal;
  text=writeSettings(text,{...readSettings(text),orientation:'vertical'});graph=layout(parse(text));
  text=moveVisualNode(text,graph,'B',graph.nodes.find(n=>n.id==='B').x,557,false);
  assert.equal(layout(parse(text)).nodes.find(n=>n.id==='B').y,557);
  text=resetPositions(text);assert.deepEqual(plain(readSettings(text).nodes.find(n=>n.id==='B').positions.horizontal),plain(horizontal));
  assert.equal(readSettings(text).nodes.find(n=>n.id==='B').positions.vertical,undefined);
  assert.deepEqual(edges(parse(text)),[{from:'A',to:'B',label:''}]);
});

test('invalid imported positions are ignored and extreme values are bounded', () => {
  const settings=readSettings('# @flow {"nodes":[{"id":"A","positions":{"horizontal":{"flow":"wrong","cross":null},"vertical":{"flow":1e9,"cross":-5}}}]}\nA → B');
  assert.equal(settings.nodes[0].positions.horizontal,undefined);assert.equal(settings.nodes[0].positions.vertical.flow,12000);assert.equal(settings.nodes[0].positions.vertical.cross,20);
});
