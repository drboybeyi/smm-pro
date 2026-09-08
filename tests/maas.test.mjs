import test from 'node:test';
import assert from 'node:assert/strict';
import { maasOzeti, maasKaydiEkle } from '../js/maas.js';
const cari = {id:'p1', ad:'Personel', sabitBrutMaas:40000};
const advance = {id:'a1', cariId:'p1', tarih:'2026-09-01', tip:'gider', kasaId:'nakit', cariEtkisi:'avans_ver', tutar:10000};
function request(data, overrides={}) {
  return { cari, donem:'2026-09', tarih:'2026-09-08', maas:40000, eskiOdeme:0,
    mahsup:10000, dagilim:[{kasaId:'banka',tutar:15000}], timestamp:1,
    beklenen:maasOzeti(cari,Object.values(data),'2026-09','2026-09-08'), ...overrides };
}
test('Avans ve kısmi maaş sonrası kalan, son ödeme ve kasa toplamı',()=>{
  let data={a1:advance};
  data=maasKaydiEkle(data,request(data),['p2','p3']);
  let o=maasOzeti(cari,Object.values(data),'2026-09','2026-09-08');
  assert.equal(o.kalan,15000);assert.equal(o.avans,0);assert.equal(o.odenen,25000);
  data=maasKaydiEkle(data,request(data,{mahsup:0,timestamp:2}),['p4','p5']);
  o=maasOzeti(cari,Object.values(data),'2026-09','2026-09-08');
  assert.equal(o.kalan,0);
  assert.equal(Object.values(data).filter(i=>i.kasaId).reduce((s,i)=>s+i.tutar,0),40000);
  assert.equal(maasOzeti(cari,Object.values(data),'2026-10','2026-10-08').kalan,40000);
});
test('Maaştan yüksek avansın fazlası sonraki aya kalır; para çıkmadan mahsup',()=>{
  const data={a1:{...advance,tutar:50000}};
  const next=maasKaydiEkle(data,request(data,{mahsup:40000,dagilim:[]}),['p2']);
  const o=maasOzeti(cari,Object.values(next),'2026-09','2026-09-08');
  assert.equal(o.avans,10000); assert.equal(o.kalan,0);
  assert.equal(Object.values(next).filter(i=>i.kasaId).length,1);
});
test('İki cihazdan aynı bakiye ile ödeme yapılması ve tekrar deneme',()=>{
  const data={a1:advance};const r=request(data);const ids=['p2','p3'];
  const next=maasKaydiEkle(data,r,ids);
  assert.strictEqual(maasKaydiEkle(next,r,ids),next);
  assert.strictEqual(maasKaydiEkle(next,r,['p4','p5']),next);
});
test('Negatif, sonsuz, fazla, sıfır ödeme ve eksik kasa reddedilir',()=>{
  const data={a1:advance};
  for(const extra of [{dagilim:[{kasaId:'b',tutar:-1}]},{maas:Infinity},{dagilim:[{kasaId:'b',tutar:30001}]},
    {mahsup:0,dagilim:[]},{dagilim:[{kasaId:null,tutar:1}]},{mahsup:10001}]){
    assert.strictEqual(maasKaydiEkle(data,request(data,extra),['x','y']),data);
  }
});
test('Eski ödemeler bir kez belirtilir, avans tekrar gider sayılmaz',()=>{
  const data={a1:advance};
  const next=maasKaydiEkle(data,request(data,{eskiOdeme:15000}),['p2','p3']);
  const o=maasOzeti(cari,Object.values(next),'2026-09','2026-09-08');
  assert.equal(o.eski,15000);assert.equal(o.kalan,0);
});
test('Başka personel ve gelecekteki avans hesabı etkilemez',()=>{
  const list=[advance,{...advance,cariId:'p2',tutar:70000},{...advance,tarih:'2026-09-20',tutar:8000}];
  assert.equal(maasOzeti(cari,list,'2026-09','2026-09-08').avans,10000);
});
test('Kuruş hassasiyeti ve bölünmüş ödeme',()=>{
  const data={};const person={...cari,sabitBrutMaas:0.3};
  const next=maasKaydiEkle(data,request(data,{cari:person,maas:0.3,mahsup:0,dagilim:[{kasaId:'n',tutar:0.1},{kasaId:'b',tutar:0.2}]}),['x','y']);
  assert.equal(maasOzeti(person,Object.values(next),'2026-09','2026-09-08').kalan,0);
});
test('Geriye tarihli maaş, sonraki tarihte mahsup edilen avansı tekrar kullanamaz',()=>{
  const data={a1:advance};
  const next=maasKaydiEkle(data,request(data,{tarih:'2026-09-15'}),['p2','p3']);
  assert.equal(maasOzeti(cari,Object.values(next),'2026-08','2026-09-08').avans,0);
});
