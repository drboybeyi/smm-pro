import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { maasKaydiEkle, maasOzeti } from '../js/maas.js';
const cari={id:'p1',ad:'Test Personel',tip:'personel',sabitBrutMaas:40000};
const advance={id:'a1',cariId:'p1',tarih:'2026-09-01',tip:'gider',kasaId:'n',cariEtkisi:'avans_ver',tutar:10000};
async function view(file, records){
 const context=vm.createContext({window:{_odemelerAy:'2026-09'}, localStorage:{getItem:()=>null},
   Date:class extends Date {constructor(...args){super(...(args.length?args:['2026-09-08T12:00:00']));}}, Intl, records:Object.values(records), cari});
 const cache=new Map();
 const sources={
  'js/state.js':`export const getCariler=()=>[cari];export const getIslemler=()=>records;export const getSabitGiderler=()=>[];export const getVadeler=()=>[];export const getKategoriler=()=>[];export const getKasalar=()=>[];`,
  'js/db.js':'export const addIslem=()=>{};export const updateSabitGider=()=>{};',
  'js/views/maasOde.js':'export const openMaasOde=()=>{};',
  'js/views/cariDetay.js':'export const openOdemeFormu=()=>{};',
  'js/components/toast.js':'export const show=()=>{};'
 };
 async function load(name){
  if(cache.has(name))return cache.get(name);
  const mod=new vm.SourceTextModule(sources[name]??fs.readFileSync(name,'utf8'),{context,identifier:name});cache.set(name,mod);
  await mod.link((spec,ref)=>load(path.posix.normalize(path.posix.join(path.posix.dirname(ref.identifier),spec))));return mod;
 }
 const mod=await load(file);await mod.evaluate();return mod.namespace;
}
for(const file of ['js/views/buAyOdemeleri.js','js/views/odemeler.js','js/views/gecikmisOdemeler.js']){
 test(`${file}: kısmi maaş bekler, tamamı ödenince kapanır`,async()=>{
  const initial={a1:advance};
  const req={cari,donem:'2026-09',tarih:'2026-09-08',maas:40000,eskiOdeme:0,mahsup:10000,
    dagilim:[{kasaId:'b',tutar:15000}],timestamp:1,beklenen:maasOzeti(cari,Object.values(initial),'2026-09','2026-09-08')};
  const partial=maasKaydiEkle(initial,req,['p2','p3']);
  async function render(data){const m=await view(file,data);return m.default?m.default.render():m.renderBuAyOdemeKarti?m.renderBuAyOdemeKarti([cari],[],Object.values(data),[]):m.renderGecikmisOdemelerKarti();}
  const html=await render(partial);assert.match(html,/15\.000/);assert.match(html,/Öde →/);
  const done=maasKaydiEkle(partial,{...req,mahsup:0,timestamp:2,beklenen:maasOzeti(cari,Object.values(partial),'2026-09','2026-09-08')},['p4']);
  const complete=await render(done);assert.doesNotMatch(complete,/Öde →/);
 });
}
