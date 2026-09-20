const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadModel() {
  const indexPath = path.join(__dirname, '../index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    const match = html.match(/\/\/ BEGIN SEQUENCE MODEL([\s\S]*?)\/\/ END SEQUENCE MODEL/);
    if (match) {
      return vm.runInNewContext(match[1] + '\n({normalizeSequence, seedSequence, importSequenceHtml})');
    }
  }
  return require('../sequence-model.js');
}

const {normalizeSequence, seedSequence, importSequenceHtml} = loadModel();
const plain = value => JSON.parse(JSON.stringify(value));

function referenceFixture() {
  const participants = [
    {id: 'cus', name: '顧客', icon: 'person', color: '#39485A'},
    {id: 'tan', name: '担当者', icon: 'person', color: '#39485A'},
    {id: 'apv', name: '承認者', icon: 'person', color: '#4E4A63'},
    {id: 'app', name: '案件アプリ', icon: 'monitor', color: '#185FA5'},
    {id: 'est', name: '見積アプリ', icon: 'monitor', color: '#0F6E56'},
    {id: 'inv', name: '請求アプリ', icon: 'monitor', color: '#993C1D'},
    {id: 'mst', name: 'マスタ', icon: 'db', color: '#7A6A3E'}
  ];
  const rows = [{phase: '受付・登録'}];
  for (let n = 1; n <= 47; n += 1) {
    if (n === 5) rows.push({phase: '稟議'});
    if (n === 10) rows.push({phase: '見積'});
    if (n === 21) rows.push({phase: '受注・書類授受'});
    if (n === 31) rows.push({phase: '実作業'});
    if (n === 37) rows.push({phase: '請求・実績'});
    rows.push(n === 31
      ? {n, self: 'tan', text: '作業を実施', kind: 'manual'}
      : {n, f: n % 2 ? 'cus' : 'tan', t: n % 3 ? 'app' : 'mst', text: '工程 ' + n, kind: n === 9 ? 'mail' : 'manual', alt: n === 9, fut: n === 47});
  }
  const quote = value => JSON.stringify(value).replace(/"([^"\\]*(?:\\.[^"\\]*)*)"(?=\s*:)/g, "'$1'");
  return '<html><title>fixture</title><h1>fixture</h1><div class="notes"><p>one</p><p>two</p></div><script>var P=' + quote(participants).replace(/"/g, "'") + ';var R=' + quote(rows).replace(/"/g, "'") + ';</script></html>';
}

test('imports the staged reference with all 47 numbered rows, phases, notes and routes', () => {
  const referencePath = path.join(__dirname, '../reference.html');
  const html = fs.existsSync(referencePath) ? fs.readFileSync(referencePath, 'utf8') : referenceFixture();
  const imported = importSequenceHtml(html);
  assert.equal(imported.sequence.participants.length, 7);
  assert.equal(imported.sequence.messages.length, 47);
  assert.equal(imported.sequence.notes.length, fs.existsSync(referencePath) ? 5 : 2);
  assert.deepEqual(plain(imported.sequence.messages.map(message => message.id)), Array.from({length: 47}, (_, index) => 'm' + (index + 1)));
  assert.equal(imported.sequence.messages[0].phase, '受付・登録');
  assert.equal(imported.sequence.messages[9].phase, '見積');
  assert.equal(imported.sequence.messages[8].route, 'reject');
  assert.equal(imported.sequence.messages[46].route, 'future');
  assert.equal(imported.sequence.messages[30].from, 'tan');
  assert.equal(imported.sequence.messages[30].to, 'tan');
});

test('imports future JSON exports without executing script contents', () => {
  const payload = {
    format: 'simple-flow-sequence',
    version: 1,
    name: '保存したシーケンス',
    sequence: {
      participants: [{id: 'p1', name: 'A', sub: '', icon: 'person', color: '#123456'}],
      messages: [{id: 'm1', phase: '', from: 'p1', to: 'p1', text: 'line 1\nline 2', kind: 'manual', status: '', route: 'normal'}],
      notes: []
    }
  };
  const html = '<script id="sequence-board-data" type="application/json">' + JSON.stringify(payload) + '</script><script>globalThis.sequenceImportPwned = true</script>';
  const context = {globalThis: {}};
  const imported = importSequenceHtml(html);
  assert.equal(imported.name, '保存したシーケンス');
  assert.equal(imported.sequence.messages[0].text, 'line 1\nline 2');
  assert.equal(context.globalThis.sequenceImportPwned, undefined);
});

test('reference literals allow escaped text but reject expressions and malicious calls', () => {
  const good = "<script>var P=[{id:'p1',name:'A',icon:'person',color:'#123456'}];var R=[{n:1,f:'p1',t:'p1',text:'line\\n\\\'quoted\\\'',kind:'manual'}];</script>";
  const imported = importSequenceHtml(good);
  assert.equal(imported.sequence.messages[0].text, "line\n'quoted'");
  assert.throws(() => importSequenceHtml("<script>var P=[{id:'p1',name:evil(),icon:'person',color:'#123456'}];var R=[];</script>"), /Invalid data literal/);
  assert.throws(() => importSequenceHtml("<script>var P=[{id:'p1',name:'A',icon:'person',color:'#123456'}];var R=[{n:1,f:'p1',t:window.pwned,text:'x'}];</script>"), /Invalid data literal/);
});

test('rejects unknown references and malformed embedded sequence data', () => {
  const unknown = "<script>var P=[{id:'p1',name:'A',icon:'person',color:'#123456'}];var R=[{n:1,f:'p1',t:'missing',text:'x'}];</script>";
  assert.throws(() => importSequenceHtml(unknown), /unknown participant/i);
  const malformed = {format: 'simple-flow-sequence', version: 1, name: 'bad', sequence: {participants: [{id: 'p1', name: 'A', icon: 'person', color: '#123456'}], messages: [{id: 'm1', phase: '', from: 'p1', to: 'missing', text: 'x'}], notes: []}};
  assert.throws(() => importSequenceHtml('<script id="sequence-board-data">' + JSON.stringify(malformed) + '</script>'), /unknown participant/i);
});

test('seeds lane interactions in edge order and gives isolated nodes their own step', () => {
  const graph = {
    lanes: ['営業', 'アプリ'],
    nodes: [
      {id: 'a', label: '受付', lane: '営業'},
      {id: 'b', label: '登録', lane: 'アプリ'},
      {id: 'c', label: '確認', lane: '営業'},
      {id: 'isolated', label: '保留', lane: '営業'}
    ],
    edges: [
      {from: 'a', to: 'b', label: '入力'},
      {from: 'a', to: 'b', label: '再送'},
      {from: 'b', to: 'c', label: ''}
    ]
  };
  const sequence = seedSequence(graph);
  assert.deepEqual(plain(sequence.participants.map(participant => participant.name)), ['営業', 'アプリ']);
  assert.deepEqual(plain(sequence.messages.map(message => message.text)), ['入力', '再送', '確認', '保留']);
  assert.deepEqual(plain(sequence.messages.map(message => [message.from, message.to])), [['p1', 'p2'], ['p1', 'p2'], ['p2', 'p1'], ['p1', 'p1']]);
  assert.deepEqual(plain(sequence.messages.map(message => message.id)), ['m1', 'm2', 'm3', 'm4']);
});

test('normalizes malformed settings into fresh bounded canonical data', () => {
  const participants = Array.from({length: 45}, (_, index) => ({id: 'p' + (index + 1), name: 'P' + (index + 1), icon: 'invalid', color: 'red'}));
  const messages = Array.from({length: 550}, (_, index) => ({id: 'same', phase: '', from: 'p1', to: 'p1', text: 'line\n' + index, kind: 'invalid', route: 'invalid'}));
  const notes = [42, 'keep\nnewlines'];
  const original = {participants, messages, notes};
  const normalized = normalizeSequence(original);
  assert.equal(normalized.participants.length, 40);
  assert.equal(normalized.messages.length, 500);
  assert.deepEqual(plain(normalized.notes), ['keep\nnewlines']);
  assert.equal(normalized.participants[0].icon, 'person');
  assert.equal(normalized.messages[0].kind, 'manual');
  assert.equal(normalized.messages[0].route, 'normal');
  assert.equal(normalized.messages[0].id, 'same');
  assert.equal(normalized.messages[1].id, 'm2');
  assert.notStrictEqual(normalized.participants, participants);
  assert.equal(original.participants[0].color, 'red');
});
