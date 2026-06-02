const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TABLE = "edh_decks";

function normalize(p){
  return {
    id: Date.now().toString(),
    name: p.name || "",
    commander: p.commander || "",
    cards: p.cards || [],
    raw: p,
    createdAt: new Date().toISOString()
  };
}

async function push(deck){
  await fetch(${SUPABASE_URL}/rest/v1/,{
    method:"POST",
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:Bearer ,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(deck)
  });
}

app.post("/ingest", async (req,res)=>{
  try{
    const deck = normalize(req.body);
    await push(deck);
    console.log("PUSHED", deck.name);
    res.send("OK");
  }catch(e){
    console.log(e);
    res.status(500).send("ERROR");
  }
});

app.get("/",(_,res)=>res.send("LIVE"));

app.listen(process.env.PORT || 3000, ()=>console.log("RUNNING"));
