const AYLAR_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export function formatTL(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0,00 TL';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' TL';
}

export function formatTarih(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${AYLAR_TR[m - 1]} ${y}`;
}

export function formatAy(dateStr) {
  if (!dateStr) return '';
  const [y, m] = (dateStr || bugun()).split('-').map(Number);
  return `${AYLAR_TR[m - 1]} ${y}`;
}

export function bugun() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayString() {
  return bugun();
}

export function ayinIlkGunu(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function ayinSonGunu(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

export function isToday(dateStr) {
  return dateStr === bugun();
}

export function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const [y, m] = dateStr.split('-').map(Number);
  return y === today.getFullYear() && m === (today.getMonth() + 1);
}

export function isInDateRange(dateStr, startStr, endStr) {
  if (!dateStr || !startStr || !endStr) return false;
  return dateStr >= startStr && dateStr <= endStr;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function isRequired(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function isValidDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return !isNaN(d.getTime());
}

export function isValidNumber(value, min = 0) {
  const n = Number(value);
  return !isNaN(n) && isFinite(n) && n >= min;
}

// ─── Cari Hesap Yardımcıları ───────────────────────────────────

export function hesaplaCariBakiye(cariId, islemler) {
  return islemler.reduce((toplam, i) => {
    if (i.cariId !== cariId) return toplam;
    const t = i.tutar || 0;
    if (i.cariEtkisi === 'borc_yaz')   return toplam - t;
    if (i.cariEtkisi === 'borc_cikar') return toplam + t;
    if (i.cariEtkisi === 'avans_ver')  return toplam + t;
    if (i.cariEtkisi === 'odeme')      return toplam + t;
    if (i.cariEtkisi === 'tahsilat')   return toplam - t;
    return toplam;
  }, 0);
}

export function gunFarki(date1, date2) {
  const d1 = date1 instanceof Date ? date1 : new Date(String(date1) + 'T00:00:00');
  const d2 = date2 instanceof Date ? date2 : new Date(String(date2) + 'T00:00:00');
  return Math.round((d1 - d2) / 86400000);
}

// ─── Kasa Hareketi Filtresi ────────────────────────────────────
// borc_yaz / borc_cikar → kasaId=null, kasa bakiyesini ETKİLEMEZ

export function islemKasaHarekedinSayilirMi(islem) {
  if (!islem.kasaId) return false;
  if (islem.cariEtkisi === 'borc_yaz')   return false;
  if (islem.cariEtkisi === 'borc_cikar') return false;
  return true;
}

// ─── Bugün Yardımcıları ────────────────────────────────────────

export function bugunIslemleri(islemler) {
  const today = bugun();
  return islemler.filter(i => i.tarih === today);
}

export function kasaBugunkiHareket(kasaId, islemler) {
  const today = bugun();
  return islemler
    .filter(i => i.tarih === today && islemKasaHarekedinSayilirMi(i))
    .reduce((sum, i) => {
      if (i.tip === 'gelir'    && i.kasaId      === kasaId) return sum + (i.tutar || 0);
      if (i.tip === 'gider'    && i.kasaId      === kasaId) return sum - (i.tutar || 0);
      if (i.tip === 'transfer' && i.kasaId      === kasaId) return sum - (i.tutar || 0);
      if (i.tip === 'transfer' && i.hedefKasaId === kasaId) return sum + (i.tutar || 0);
      return sum;
    }, 0);
}

// Bugün belirli kasaya GELEN para (gelir + transfer giriş)
export function kasaBugunkiGelir(kasaId, islemler) {
  const today = bugun();
  return islemler
    .filter(i => i.tarih === today && islemKasaHarekedinSayilirMi(i))
    .reduce((sum, i) => {
      if (i.tip === 'gelir'    && i.kasaId      === kasaId) return sum + (i.tutar || 0);
      if (i.tip === 'transfer' && i.hedefKasaId === kasaId) return sum + (i.tutar || 0);
      return sum;
    }, 0);
}

// Bugün belirli kasadan ÇIKAN para (gider + transfer çıkış), pozitif sayı döner
export function kasaBugunkiGider(kasaId, islemler) {
  const today = bugun();
  return islemler
    .filter(i => i.tarih === today && islemKasaHarekedinSayilirMi(i))
    .reduce((sum, i) => {
      if (i.tip === 'gider'    && i.kasaId === kasaId) return sum + (i.tutar || 0);
      if (i.tip === 'transfer' && i.kasaId === kasaId) return sum + (i.tutar || 0);
      return sum;
    }, 0);
}

// Bugün tüm kasalardaki GERÇEK gelir/gider (borc_yaz/borc_cikar dahil değil)
export function bugunNetGelirGider(islemler) {
  const today  = bugun();
  const todays = islemler.filter(i => i.tarih === today && islemKasaHarekedinSayilirMi(i));
  const gelir  = todays.filter(i => i.tip === 'gelir').reduce((s, i) => s + (i.tutar || 0), 0);
  const gider  = todays.filter(i => i.tip === 'gider').reduce((s, i) => s + (i.tutar || 0), 0);
  return { gelir, gider, net: gelir - gider };
}

export function kasaTipiBul(kasalar, ...anahtarlar) {
  return kasalar.find(k => {
    const ad = k.ad.toLowerCase();
    return anahtarlar.some(a => ad.includes(a.toLowerCase()));
  }) || null;
}

export function formatTarihUzun(dateStr) {
  if (!dateStr) return '';
  const GUNLER = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${d} ${AYLAR_TR[m - 1]} ${y} ${GUNLER[date.getDay()]}`;
}

export function islemTipiEtiketi(islem) {
  if (islem.cariEtkisi === 'borc_yaz')   return '📋 Borç';
  if (islem.cariEtkisi === 'borc_cikar') return '📋 Borç Çıkar';
  if (islem.cariEtkisi === 'tahsilat')   return '💰 Tahsilat';
  if (islem.cariEtkisi === 'odeme')      return '💸 Ödeme';
  if (islem.cariEtkisi === 'avans_ver')  return '👤 Avans';
  if (islem.tip === 'gelir')    return '▲ Gelir';
  if (islem.tip === 'gider')    return '▼ Gider';
  if (islem.tip === 'transfer') return '↔ Transfer';
  return islem.tip || '?';
}

export function islemTutarFormati(islem) {
  const t = formatTL(islem.tutar);
  if (islem.cariEtkisi === 'borc_yaz' || islem.cariEtkisi === 'borc_cikar') {
    return { tutar: t, renk: 'var(--warning)' };
  }
  if (islem.tip === 'gelir' || islem.cariEtkisi === 'tahsilat') {
    return { tutar: '+' + t, renk: 'var(--success)' };
  }
  if (islem.tip === 'gider' || islem.cariEtkisi === 'odeme' || islem.cariEtkisi === 'avans_ver') {
    return { tutar: '-' + t, renk: 'var(--danger)' };
  }
  if (islem.tip === 'transfer') {
    return { tutar: '↔ ' + t, renk: 'var(--accent)' };
  }
  return { tutar: t, renk: 'var(--text-primary)' };
}

export function kisaltilmisRakam(sayi) {
  if (!sayi || sayi <= 0) return '0';
  if (sayi >= 1_000_000) return (sayi / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (sayi >= 1_000)     return (sayi / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.round(sayi));
}

// ─── Vade Yardımcıları ─────────────────────────────────────────

export function bugunVadeleri(vadeler) {
  const today = bugun();
  return vadeler.filter(v => v.durum === 'bekliyor' && v.vadeTarih === today);
}

export function yaklaşanVadeler(vadeler, gunSayisi = 7) {
  const today = bugun();
  return vadeler.filter(v => {
    if (v.durum !== 'bekliyor') return false;
    const fark = gunFarki(v.vadeTarih, today);
    return fark >= 1 && fark <= gunSayisi;
  });
}

export function gecikmisVadeler(vadeler) {
  const today = bugun();
  return vadeler.filter(v => v.durum === 'bekliyor' && gunFarki(v.vadeTarih, today) < 0);
}

export function vadeRenkSinifi(vade, todayStr) {
  if (vade.durum !== 'bekliyor') return '';
  const fark = gunFarki(vade.vadeTarih, todayStr);
  if (fark < 0)   return 'vade-sinif-gecmis';
  if (fark === 0) return 'vade-sinif-bugun';
  if (fark <= 3)  return 'vade-sinif-yakin';
  return '';
}

export function gunFarkiMetni(tarih1, tarih2) {
  const fark = gunFarki(tarih1, tarih2);
  if (fark === 0) return 'Bugün';
  if (fark > 0)   return `${fark} gün sonra`;
  return `${Math.abs(fark)} gün gecikti`;
}

export function hesaplaSonrakiVade(cari, bugunStr) {
  if (!cari || !cari.vadeTipi || cari.vadeTipi === 'yok') return null;
  const bugunDate = new Date(bugunStr + 'T00:00:00');

  if (cari.vadeTipi === 'tarih' && cari.vadeTarih) {
    const vadeDate = new Date(cari.vadeTarih + 'T00:00:00');
    return vadeDate >= bugunDate ? vadeDate : null;
  }

  if (cari.vadeTipi === 'her_ay' && cari.vadeGunu) {
    const gun = Number(cari.vadeGunu);
    const y   = bugunDate.getFullYear();
    const m   = bugunDate.getMonth();
    const cap = d => Math.min(d, new Date(y, m + 1, 0).getDate());
    let vade  = new Date(y, m, cap(gun));
    if (vade < bugunDate) {
      const ny = m === 11 ? y + 1 : y;
      const nm = (m + 1) % 12;
      const capN = d => Math.min(d, new Date(ny, nm + 1, 0).getDate());
      vade = new Date(ny, nm, capN(gun));
    }
    return vade;
  }

  return null;
}

// ─── Tarih Aralığı Yardımcıları ───────────────────────────────

export function aralikIcindeMi(tarih, baslangic, bitis) {
  if (!tarih || !baslangic || !bitis) return false;
  return tarih >= baslangic && tarih <= bitis;
}

export function getTarihAraligiDegerleri(tip) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  const d   = now.getDate();

  const fmt = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

  if (tip === 'bugun') {
    const s = bugun();
    return { baslangic: s, bitis: s };
  }
  if (tip === 'buHafta') {
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const mon = new Date(y, m, d - dow);
    const sun = new Date(y, m, d - dow + 6);
    return { baslangic: fmt(mon), bitis: fmt(sun) };
  }
  if (tip === 'buAy') {
    const last = new Date(y, m + 1, 0);
    return { baslangic: `${y}-${String(m + 1).padStart(2, '0')}-01`, bitis: fmt(last) };
  }
  if (tip === 'gecenAy') {
    const pm   = m === 0 ? 11 : m - 1;
    const py   = m === 0 ? y - 1 : y;
    const last = new Date(py, pm + 1, 0);
    return { baslangic: `${py}-${String(pm + 1).padStart(2, '0')}-01`, bitis: fmt(last) };
  }
  if (tip === 'buYil') {
    return { baslangic: `${y}-01-01`, bitis: `${y}-12-31` };
  }
  return null;
}

export function aralikBasligi(baslangic, bitis, tip) {
  if (!baslangic || !bitis) return '';
  const [by, bm, bd] = baslangic.split('-').map(Number);
  const [ey, em, ed] = bitis.split('-').map(Number);
  if (tip === 'bugun')   return 'Bugün';
  if (tip === 'buHafta') {
    return bm === em
      ? `Bu Hafta — ${bd}-${ed} ${AYLAR_TR[bm - 1]}`
      : `Bu Hafta — ${bd} ${AYLAR_TR[bm - 1]}-${ed} ${AYLAR_TR[em - 1]}`;
  }
  if (tip === 'buAy')    return `Bu Ay — ${AYLAR_TR[bm - 1]} ${by}`;
  if (tip === 'gecenAy') return `Geçen Ay — ${AYLAR_TR[bm - 1]} ${by}`;
  if (tip === 'buYil')   return `Bu Yıl — ${by}`;
  return `${String(bd).padStart(2, '0')}.${String(bm).padStart(2, '0')}.${by} – ${String(ed).padStart(2, '0')}.${String(em).padStart(2, '0')}.${ey}`;
}

// ─── Aralık Bazlı Kasa Hesaplamaları ──────────────────────────

export function kasaAralikGelir(kasaId, baslangic, bitis, islemler) {
  return islemler
    .filter(i => aralikIcindeMi(i.tarih, baslangic, bitis) && islemKasaHarekedinSayilirMi(i))
    .reduce((sum, i) => {
      if (i.tip === 'gelir'    && i.kasaId      === kasaId) return sum + (i.tutar || 0);
      if (i.tip === 'transfer' && i.hedefKasaId === kasaId) return sum + (i.tutar || 0);
      return sum;
    }, 0);
}

export function kasaAralikGider(kasaId, baslangic, bitis, islemler) {
  return islemler
    .filter(i => aralikIcindeMi(i.tarih, baslangic, bitis) && islemKasaHarekedinSayilirMi(i))
    .reduce((sum, i) => {
      if (i.tip === 'gider'    && i.kasaId === kasaId) return sum + (i.tutar || 0);
      if (i.tip === 'transfer' && i.kasaId === kasaId) return sum + (i.tutar || 0);
      return sum;
    }, 0);
}

export function kasaAralikNet(kasaId, baslangic, bitis, islemler) {
  return islemler
    .filter(i => aralikIcindeMi(i.tarih, baslangic, bitis) && islemKasaHarekedinSayilirMi(i))
    .reduce((sum, i) => {
      if (i.tip === 'gelir'    && i.kasaId      === kasaId) return sum + (i.tutar || 0);
      if (i.tip === 'gider'    && i.kasaId      === kasaId) return sum - (i.tutar || 0);
      if (i.tip === 'transfer' && i.kasaId      === kasaId) return sum - (i.tutar || 0);
      if (i.tip === 'transfer' && i.hedefKasaId === kasaId) return sum + (i.tutar || 0);
      return sum;
    }, 0);
}

export function aralikNetGelirGider(baslangic, bitis, islemler) {
  const aralik = islemler.filter(i =>
    aralikIcindeMi(i.tarih, baslangic, bitis) && islemKasaHarekedinSayilirMi(i)
  );
  const gelir = aralik.filter(i => i.tip === 'gelir').reduce((s, i) => s + (i.tutar || 0), 0);
  const gider = aralik.filter(i => i.tip === 'gider').reduce((s, i) => s + (i.tutar || 0), 0);
  return { gelir, gider, net: gelir - gider };
}

export function gunKasaOzeti(gunTarih, kasalar, islemler) {
  return kasalar.map(k => {
    const gunIslemleri = islemler.filter(i =>
      i.tarih === gunTarih && islemKasaHarekedinSayilirMi(i)
    );
    const gelir = gunIslemleri
      .filter(i => (i.tip === 'gelir' && i.kasaId === k.id) ||
                   (i.tip === 'transfer' && i.hedefKasaId === k.id))
      .reduce((s, i) => s + (i.tutar || 0), 0);
    const gider = gunIslemleri
      .filter(i => (i.tip === 'gider' && i.kasaId === k.id) ||
                   (i.tip === 'transfer' && i.kasaId === k.id))
      .reduce((s, i) => s + (i.tutar || 0), 0);
    return { kasaId: k.id, ad: k.ad, emoji: k.emoji, gelir, gider, net: gelir - gider };
  }).filter(item => item.gelir > 0 || item.gider > 0);
}

export function ayKasaOzeti(islemler, kasalar, baslangic, bitis) {
  const aralikIslemler = islemler.filter(i =>
    aralikIcindeMi(i.tarih, baslangic, bitis) && islemKasaHarekedinSayilirMi(i)
  );
  return kasalar.map(k => {
    const gelir = aralikIslemler
      .filter(i => (i.tip === 'gelir' && i.kasaId === k.id) ||
                   (i.tip === 'transfer' && i.hedefKasaId === k.id))
      .reduce((s, i) => s + (i.tutar || 0), 0);
    const gider = aralikIslemler
      .filter(i => (i.tip === 'gider' && i.kasaId === k.id) ||
                   (i.tip === 'transfer' && i.kasaId === k.id))
      .reduce((s, i) => s + (i.tutar || 0), 0);
    return { kasaId: k.id, ad: k.ad, emoji: k.emoji, gelir, gider, net: gelir - gider };
  }).filter(item => item.gelir > 0 || item.gider > 0);
}

// ─── Kasa Aralık Hesaplamaları ────────────────────────────────

export function kasaAralikIslemleri(kasaId, baslangic, bitis, islemler) {
  return islemler.filter(i => {
    if (!aralikIcindeMi(i.tarih, baslangic, bitis)) return false;
    if (i.cariEtkisi === 'borc_yaz' || i.cariEtkisi === 'borc_cikar') return false;
    if (i.kasaId === kasaId) return true;
    if (i.tip === 'transfer' && i.hedefKasaId === kasaId) return true;
    return false;
  });
}

export function kasaAralikOzet(kasaId, baslangic, bitis, islemler) {
  const hareketler = kasaAralikIslemleri(kasaId, baslangic, bitis, islemler);
  let gelen = 0, cikan = 0, gelenAdet = 0, cikanAdet = 0;
  hareketler.forEach(i => {
    const t = i.tutar || 0;
    if ((i.tip === 'gelir'    && i.kasaId      === kasaId) ||
        (i.tip === 'transfer' && i.hedefKasaId === kasaId)) {
      gelen += t; gelenAdet++;
    } else {
      cikan += t; cikanAdet++;
    }
  });
  return { gelen, cikan, net: gelen - cikan, gelenAdet, cikanAdet };
}

export function kasaGunlukNet(kasaId, gun, islemler) {
  return islemler
    .filter(i => {
      if (i.tarih !== gun) return false;
      if (i.cariEtkisi === 'borc_yaz' || i.cariEtkisi === 'borc_cikar') return false;
      return i.kasaId === kasaId || (i.tip === 'transfer' && i.hedefKasaId === kasaId);
    })
    .reduce((sum, i) => {
      const t = i.tutar || 0;
      if ((i.tip === 'gelir'    && i.kasaId      === kasaId) ||
          (i.tip === 'transfer' && i.hedefKasaId === kasaId)) return sum + t;
      return sum - t;
    }, 0);
}

// ─── Tüm Kasalar Yardımcıları ─────────────────────────────────

export function tumKasalarOzet(kasalar, baslangic, bitis, islemler) {
  const aktifIds = new Set(kasalar.map(k => k.id));
  let gelen = 0, cikan = 0, gelenAdet = 0, cikanAdet = 0;
  islemler.forEach(i => {
    if (!aralikIcindeMi(i.tarih, baslangic, bitis)) return;
    if (i.cariEtkisi === 'borc_yaz' || i.cariEtkisi === 'borc_cikar') return;
    if (!i.kasaId || !aktifIds.has(i.kasaId)) return;
    if (i.tip === 'gelir') { gelen += i.tutar || 0; gelenAdet++; }
    if (i.tip === 'gider') { cikan += i.tutar || 0; cikanAdet++; }
  });
  return { gelen, cikan, net: gelen - cikan, gelenAdet, cikanAdet };
}

export function tumKasalarDagilim(kasalar, baslangic, bitis, islemler) {
  return kasalar
    .map(k => {
      const { gelen, cikan, net } = kasaAralikOzet(k.id, baslangic, bitis, islemler);
      return { kasaId: k.id, ad: k.ad, emoji: k.emoji, gelen, cikan, net };
    })
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

export function tumKasalarGunlukNet(gun, kasalar, islemler) {
  return islemler
    .filter(i => {
      if (i.tarih !== gun) return false;
      if (i.cariEtkisi === 'borc_yaz' || i.cariEtkisi === 'borc_cikar') return false;
      return !!i.kasaId;
    })
    .reduce((sum, i) => {
      if (i.tip === 'gelir') return sum + (i.tutar || 0);
      if (i.tip === 'gider') return sum - (i.tutar || 0);
      return sum;
    }, 0);
}

// ─── Bugün Özet Yardımcıları ──────────────────────────────────

export function bugunOzet(islemler) {
  const today    = bugun();
  const bugunler = islemler.filter(i => i.tarih === today && islemKasaHarekedinSayilirMi(i));
  const gelirler = bugunler.filter(i => i.tip === 'gelir');
  const giderler = bugunler.filter(i => i.tip === 'gider');
  const gelir    = gelirler.reduce((s, i) => s + (i.tutar || 0), 0);
  const gider    = giderler.reduce((s, i) => s + (i.tutar || 0), 0);
  return { gelir, gider, net: gelir - gider, gelirAdet: gelirler.length, giderAdet: giderler.length };
}

export function bugunKasaDagilim(islemler, kasalar) {
  const today    = bugun();
  const bugunler = islemler.filter(i => i.tarih === today && islemKasaHarekedinSayilirMi(i));
  return kasalar
    .filter(k => !k.silindi)
    .map(k => {
      let gelir = 0, gider = 0;
      bugunler.forEach(i => {
        const t = i.tutar || 0;
        if      (i.tip === 'gelir'    && i.kasaId      === k.id) gelir += t;
        else if (i.tip === 'gider'    && i.kasaId      === k.id) gider += t;
        else if (i.tip === 'transfer' && i.kasaId      === k.id) gider += t;
        else if (i.tip === 'transfer' && i.hedefKasaId === k.id) gelir += t;
      });
      return { kasaId: k.id, ad: k.ad, emoji: k.emoji, gelir, gider, net: gelir - gider };
    })
    .filter(k => k.gelir > 0 || k.gider > 0)
    .sort((a, b) => b.net - a.net);
}

// ─── Cari Borç Yardımcıları ───────────────────────────────────

export function tedarikciBorclari(cariler, islemler) {
  return cariler
    .filter(c => c.tip === 'tedarikci' && !c.silindi)
    .map(c => ({ ...c, bakiye: hesaplaCariBakiye(c.id, islemler) }))
    .filter(c => c.bakiye < 0);
}

export function cariEnYakinVade(cariId, vadeler, cari) {
  const bugunStr = bugun();

  // Önce vadeler[]'den bekleyen en yakın
  const bekleyenler = vadeler
    .filter(v => v.cariId === cariId && v.durum === 'bekliyor' && v.vadeTarih)
    .sort((a, b) => a.vadeTarih.localeCompare(b.vadeTarih));

  if (bekleyenler.length > 0) {
    const enYakin = bekleyenler[0];
    return {
      vadeTarih: enYakin.vadeTarih,
      gunFark:   gunFarki(enYakin.vadeTarih, bugunStr),
      kaynak:    'vade'
    };
  }

  // Sonra cari.vadeTipi'ne bak
  if (cari?.vadeTipi && cari.vadeTipi !== 'yok') {
    const vadeDate = hesaplaSonrakiVade(cari, bugunStr);
    if (vadeDate) {
      const fmt = dt =>
        `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const vadeTarihStr = fmt(vadeDate);
      return {
        vadeTarih: vadeTarihStr,
        gunFark:   gunFarki(vadeTarihStr, bugunStr),
        kaynak:    'cari'
      };
    }
  }

  return null;
}

export function borcSiraOnceligi(gunFark) {
  if (gunFark === null || gunFark === undefined) return 9999;
  if (gunFark < 0)  return gunFark;   // gecikmiş: negatif → en üstte
  if (gunFark <= 30) return gunFark;  // bugün=0 ... 30 gün
  return 999;                         // 30+ gün hepsi aynı
}

// ─── Tüm Zamanlar Özeti ───────────────────────────────────────

export function tumZamanlarOzet(islemler, kasalar, kategoriler) {
  const sayilanlar = islemler.filter(islemKasaHarekedinSayilirMi);
  if (!sayilanlar.length) return null;

  const tarihler = sayilanlar.map(i => i.tarih).filter(Boolean).sort();
  const ilkTarih = tarihler[0];
  const sonTarih = tarihler[tarihler.length - 1];
  const sureDays = gunFarki(sonTarih, ilkTarih) + 1;

  const toplamGelir = sayilanlar.filter(i => i.tip === 'gelir').reduce((s, i) => s + (i.tutar || 0), 0);
  const toplamGider = sayilanlar.filter(i => i.tip === 'gider').reduce((s, i) => s + (i.tutar || 0), 0);

  const aySet = new Set(sayilanlar.map(i => i.tarih?.slice(0, 7)).filter(Boolean));
  const ayCount = aySet.size || 1;

  const kasaOzet = kasalar.map(k => {
    const gelir = sayilanlar
      .filter(i => (i.tip === 'gelir' && i.kasaId === k.id) ||
                   (i.tip === 'transfer' && i.hedefKasaId === k.id))
      .reduce((s, i) => s + (i.tutar || 0), 0);
    const gider = sayilanlar
      .filter(i => (i.tip === 'gider' && i.kasaId === k.id) ||
                   (i.tip === 'transfer' && i.kasaId === k.id))
      .reduce((s, i) => s + (i.tutar || 0), 0);
    return { kasaId: k.id, ad: k.ad, emoji: k.emoji, gelir, gider, net: gelir - gider };
  }).filter(item => item.gelir > 0 || item.gider > 0);

  const aylikMap = {};
  sayilanlar.forEach(i => {
    const ay = i.tarih?.slice(0, 7);
    if (!ay) return;
    if (!aylikMap[ay]) aylikMap[ay] = { gelir: 0, gider: 0 };
    if (i.tip === 'gelir') aylikMap[ay].gelir += (i.tutar || 0);
    if (i.tip === 'gider') aylikMap[ay].gider += (i.tutar || 0);
  });
  const aylikSatirlar = Object.entries(aylikMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([ay, { gelir, gider }]) => ({ ay, gelir, gider, net: gelir - gider }));

  const gelirKatMap = {};
  const giderKatMap = {};
  sayilanlar.forEach(i => {
    if (!i.kategoriId) return;
    if (i.tip === 'gelir') gelirKatMap[i.kategoriId] = (gelirKatMap[i.kategoriId] || 0) + (i.tutar || 0);
    if (i.tip === 'gider') giderKatMap[i.kategoriId] = (giderKatMap[i.kategoriId] || 0) + (i.tutar || 0);
  });
  const mapToKat = katMap => Object.entries(katMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([katId, toplam]) => ({ kat: kategoriler.find(k => k.id === katId), toplam }))
    .filter(x => x.kat);

  return {
    ilkTarih, sonTarih, sureDays, ayCount,
    toplamGelir, toplamGider, toplamNet: toplamGelir - toplamGider,
    ayOrtalGelir: toplamGelir / ayCount,
    ayOrtalGider: toplamGider / ayCount,
    kasaOzet, aylikSatirlar,
    topGelirKat: mapToKat(gelirKatMap),
    topGiderKat: mapToKat(giderKatMap)
  };
}
