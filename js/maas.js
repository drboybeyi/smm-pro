// Maaş takibi: kuruş hassasiyetiyle net tutar, dönem ve avans mahsupları.
export const kurus = value => Math.round(Number(value || 0) * 100);

export function maasOzeti(cari, islemler, donem, tarih, maas, eskiOdeme) {
  const kayitlar = islemler.filter(i => i.cariId === cari.id && i.maasDonemi === donem && i.maasGrupId);
  const son = [...kayitlar].sort((a, b) => (b.olusturmaTarihi || 0) - (a.olusturmaTarihi || 0))[0];
  const aylik = kurus(maas ?? son?.maasAylikTutar ?? cari.sabitBrutMaas);
  const eski = kurus(eskiOdeme ?? son?.maasEskiOdeme ?? 0);
  const odenen = kayitlar.reduce((s, i) => s + kurus(i.tutar), 0);
  const avans = Math.max(0, islemler.reduce((s, i) => {
    if (i.cariId !== cari.id) return s;
    // Geçmiş tarihli ödeme, daha sonra mahsup edilmiş avansı tekrar kullanamaz.
    if (i.tarih > tarih && ['borc_cikar', 'avans_ver', 'odeme'].includes(i.cariEtkisi)) return s;
    if (['borc_cikar', 'avans_ver', 'odeme'].includes(i.cariEtkisi)) return s + kurus(i.tutar);
    if (['borc_yaz', 'tahsilat'].includes(i.cariEtkisi)) return s - kurus(i.tutar);
    return s;
  }, 0));
  const kalan = Math.max(0, aylik - eski - odenen);
  return { aylik: aylik / 100, eski: eski / 100, odenen: odenen / 100,
    avans: avans / 100, kalan: kalan / 100, mahsup: Math.min(kalan, avans) / 100,
    kayitVar: kayitlar.length > 0 };
}

// Tek işlemde yazılacak kayıtlar; tekrar denemelerde aynı kimlikler kullanılır.
export function maasKaydiEkle(current, req, ids) {
  const data = current || {};
  if (data[ids[0]]) return data;
  const { cari, donem, tarih, maas, eskiOdeme, mahsup, dagilim, beklenen, timestamp } = req;
  const ozet = maasOzeti(cari, Object.values(data), donem, tarih, maas, eskiOdeme);
  if (['avans', 'odenen'].some(k => kurus(ozet[k]) !== kurus(beklenen[k]))) return current;
  const tutarlar = [maas, eskiOdeme, mahsup, ...dagilim.map(d => d.tutar)];
  if (tutarlar.some(t => !Number.isFinite(t) || t < 0 || !Number.isSafeInteger(kurus(t)))) return current;
  if (maas <= 0 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(donem) || !/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return current;
  const toplam = dagilim.reduce((s, d) => s + kurus(d.tutar), 0) + kurus(mahsup);
  if (toplam <= 0 || toplam > kurus(ozet.kalan) || kurus(mahsup) > kurus(ozet.mahsup)) return current;
  if (dagilim.some(d => d.tutar > 0 && !d.kasaId)) return current;
  const meta = { tarih, cariId: cari.id, maasDonemi: donem, maasGrupId: ids[0],
    maasAylikTutar: maas, maasEskiOdeme: eskiOdeme, olusturmaTarihi: timestamp };
  const records = dagilim.filter(d => d.tutar > 0).map(d => ({ ...meta,
    tip: 'gider', tutar: kurus(d.tutar) / 100, kasaId: d.kasaId,
    kategoriId: req.kategoriId || null, cariEtkisi: null, maasTuru: 'odeme',
    aciklama: req.aciklama || `${cari.ad} — ${donem} maaş ödemesi` }));
  if (mahsup > 0) records.push({ ...meta, tip: 'gelir', tutar: mahsup,
    kasaId: null, kategoriId: null, cariEtkisi: 'tahsilat', maasTuru: 'mahsup',
    aciklama: `${cari.ad} — ${donem} avans mahsup` });
  const next = { ...data };
  records.forEach((r, i) => { next[ids[i]] = { ...r, id: ids[i] }; });
  return next;
}
