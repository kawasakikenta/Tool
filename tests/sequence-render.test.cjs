const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const code=html.match(/\/\/ BEGIN SEQUENCE RENDER([\s\S]*?)\/\/ END SEQUENCE RENDER/)?.[1]||fs.readFileSync(path.join(__dirname,'../sequence-render.js'),'utf8');
const {renderSequenceDiagram}=vm.runInNewContext(code+'\n({renderSequenceDiagram})');
const participants=Array.from({length:7},(_,i)=>({id:'p'+i,name:['お客様','担当者','承認者','案件管理アプリ','見積アプリ','請求アプリ','マスタ'][i],sub:'説明',icon:i<3?'person':'monitor',color:'#185fa5'}));
const messages=Array.from({length:47},(_,i)=>({id:'m'+i,phase:i<10?'受付':'稟議',from:'p'+i%7,to:'p'+(i+2)%7,text:'手順の説明 '+(i+1),kind:['manual','mail','notify','click','form','api','appact'][i%7],status:i%4?'':'承認完了',route:i===8?'reject':i===46?'future':'normal'}));
test('47-step sequence lays out every participant and step within the exported bounds',()=>{
  const diagram=renderSequenceDiagram({participants,messages,notes:['補足の説明']});
  assert.equal(diagram.rowBounds.length,47);assert.equal(diagram.participantBounds.length,7);
  for(const bounds of [...diagram.rowBounds,...diagram.participantBounds]){
    for(const key of ['x','y','width','height'])assert.ok(Number.isFinite(bounds[key]));
    assert.ok(bounds.x>=0&&bounds.y>=0);assert.ok(bounds.x+bounds.width<=diagram.width+.01);assert.ok(bounds.y+bounds.height<=diagram.height+.01);
  }
  for(let i=1;i<diagram.rowBounds.length;i++)assert.ok(diagram.rowBounds[i].y>=diagram.rowBounds[i-1].y+diagram.rowBounds[i-1].height-.01);
  assert.equal((diagram.markup.match(/data-seq-message=/g)||[]).length,47);
  assert.equal((diagram.markup.match(/data-seq-participant=/g)||[]).length,7);
});
test('long labels, phase names, status and self loops have finite non-overlapping rows',()=>{
  const rows=[{...messages[0],to:'p0',phase:'長い工程名'.repeat(12),text:'長い説明文'.repeat(170),status:'ステータス'.repeat(16)},{...messages[1],from:'p6',to:'p6'}];
  const result=renderSequenceDiagram({participants,messages:rows,notes:['注記'.repeat(400)]},'mono');
  assert.ok(result.rowBounds[0].height>result.rowBounds[1].height);
  assert.ok(result.height>result.rowBounds.at(-1).y+result.rowBounds.at(-1).height);
  assert.ok(!/NaN|Infinity/.test(result.markup));assert.match(result.markup,/凡例/);
  const empty=renderSequenceDiagram({participants:[],messages:[],notes:[]});assert.ok(empty.width>0&&empty.height>0);
});
test('user content is escaped in text and interactive attributes',()=>{
  const malicious='<script>alert(1)</script><image href="https://evil.invalid/x">';
  const result=renderSequenceDiagram({participants:[{...participants[0],name:malicious,sub:malicious}],messages:[{...messages[0],from:'p0',to:'p0',text:malicious,status:malicious}],notes:[malicious]});
  assert.ok(!result.markup.includes('<script>'));assert.ok(!result.markup.includes('<image href="https://evil.invalid'));
  assert.match(result.markup,/&lt;/);
});
test('standalone HTML includes inert reusable sequence data and escapes closing script text',()=>{
  const ui=html.includes('function buildShareHtml(')?html:fs.readFileSync(path.join(__dirname,'../sequence-ui.js'),'utf8');
  const body=ui.slice(ui.indexOf('function buildShareHtml('),ui.indexOf("$('#saveHtmlBtn').onclick="));
  const escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const build=vm.runInNewContext(body+'\n buildShareHtml',{escapeHtml});
  const unsafe='名前</script><script>alert(1)</script>';
  const result=build('<svg xmlns="http://www.w3.org/2000/svg"></svg>',unsafe,{participants,messages:[{...messages[0],text:unsafe}],notes:[]});
  assert.equal((result.match(/<script\b/g)||[]).length,1);assert.ok(!result.includes('<script>alert'));
  const saved=JSON.parse(result.match(/<script type="application\/json" id="sequence-board-data">([\s\S]*?)<\/script>/)[1]);
  assert.equal(saved.sequence.messages[0].text,unsafe);
});
