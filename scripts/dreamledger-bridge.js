// Bridge: render-ingestor → DreamLedger-compatible events
// Normalizes events for cross-system ledger consistency

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.cortex', 'dreamledger_bridge.jsonl');

function ensure(){
  const dir = path.dirname(OUT);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
  if(!fs.existsSync(OUT)) fs.writeFileSync(OUT,'');
}

function emit(event){
  ensure();
  fs.appendFileSync(OUT, JSON.stringify({
    ts: new Date().toISOString(),
    normalized: true,
    event
  })+'\n');
}

function fromGitHub(payload){
  emit({type:'github',repo:payload?.repository?.full_name,commit:payload?.after});
}

function fromStripe(payload){
  emit({type:'stripe',id:payload?.id,event:payload?.type});
}

function fromRender(payload){
  emit({type:'render',service:payload?.service,status:payload?.status});
}

module.exports = { emit, fromGitHub, fromStripe, fromRender };