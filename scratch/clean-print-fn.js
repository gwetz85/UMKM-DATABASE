const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/finish/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the start of handlePrintActor
const fnStart = content.indexOf('  const handlePrintActor = (actor: BusinessActor) => {');
if (fnStart === -1) { console.error('Cannot find handlePrintActor'); process.exit(1); }

// Find where the next const begins after the function (adminRef)
const adminRefMarker = '  const adminRef = useMemoFirebase';
let adminRefPos = content.indexOf(adminRefMarker, fnStart + 100);
if (adminRefPos === -1) { console.error('Cannot find adminRef'); process.exit(1); }

// Make sure there's only one adminRef in the replacement section
// count how many adminRef declarations occur 
const beforeFn = content.substring(0, fnStart);
const afterFn = content.substring(adminRefPos);

const newFn = `  const handlePrintActor = (actor: BusinessActor) => {
    const a = actor as any
    const sd = a.surveyData || {}
    const parsed = parsePobDob(actor.pobDob || "")
    const dob = actor.dob || parsed.dob || "-"
    const pob = actor.pob || parsed.pob || "-"
    const regCode = (actor.id || '00000000').slice(-8).toUpperCase()
    const barcodeStr = regCode.split('').map((c: string) => c.charCodeAt(0).toString(2).padStart(7,'0')).join('')
    const barcodeSvg = \`<svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">\${barcodeStr.split('').map((bit: string, i: number) =>
      bit === '1' ? \`<rect x="\${i*1.1}" y="0" width="1" height="40" fill="black"/>\` : ''
    ).join('')}</svg>\`
    const row = (label: string, value: string | undefined) =>
      \`<tr><td class="lbl">\${label}</td><td class="sep">:</td><td class="val">\${value || '-'}</td></tr>\`
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(\`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Formulir Biodata - \${actor.fullName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;font-size:11px;color:#222;background:white;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:12mm 14mm 10mm 14mm;}
  .kop{display:flex;align-items:center;gap:10px;padding-bottom:8px;}
  .kop-logo-placeholder{width:68px;height:68px;border:2px solid #1565C0;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:7px;font-weight:900;color:#1565C0;text-align:center;line-height:1.2;background:#EBF5FB;flex-shrink:0;}
  .kop-center{flex:1;padding-left:4px;}
  .kop-center .org{font-size:15px;font-weight:900;color:#1565C0;text-transform:uppercase;letter-spacing:0.5px;}
  .kop-center .sub{font-size:10px;font-weight:700;color:#1565C0;text-transform:uppercase;margin-top:1px;}
  .kop-right{text-align:center;min-width:110px;}
  .kop-right .reg-code{font-size:12px;font-weight:900;font-family:monospace;letter-spacing:2px;margin-top:2px;}
  .kop-right .reg-label{font-size:8px;color:#555;letter-spacing:1px;text-transform:uppercase;}
  .kop-line{height:3px;background:linear-gradient(to right,#1565C0 70%,#4CAF50 100%);margin-top:6px;margin-bottom:14px;}
  .judul-row{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:16px;}
  .judul-text{font-size:17px;font-weight:900;text-transform:uppercase;letter-spacing:1px;text-align:center;}
  .judul-underline{width:60px;height:3px;background:#1565C0;margin:4px auto 0 auto;}
  .no-badge{background:#1565C0;color:white;font-weight:900;font-size:11px;padding:5px 16px;border-radius:20px;white-space:nowrap;}
  .section{margin-bottom:0;}
  .sec-hdr{background:#BBDEFB;color:#0D47A1;font-weight:900;font-size:11px;padding:6px 10px;border:1px solid #90CAF9;letter-spacing:0.3px;}
  .sec-body{border:1px solid #90CAF9;border-top:none;}
  table{width:100%;border-collapse:collapse;}
  td.lbl{width:200px;font-weight:700;font-size:11px;padding:6px 10px;vertical-align:top;color:#222;}
  td.sep{width:16px;padding:6px 2px;color:#222;font-weight:700;}
  td.val{font-size:11px;padding:6px 8px;color:#222;border-bottom:1px solid #E3F2FD;}
  tr:last-child td{border-bottom:none;}
  tr:nth-child(even) td{background:#F8FCFF;}
  .stbl{width:100%;border-collapse:collapse;font-size:10.5px;}
  .stbl th,.stbl td{border:1px solid #90CAF9;padding:5px 8px;}
  .stbl th{background:#BBDEFB;color:#0D47A1;font-weight:700;text-transform:uppercase;font-size:9.5px;width:35%;}
  .stbl tr:nth-child(even) td{background:#F8FCFF;}
  .stbl .highlight-th{background:#C8E6C9;color:#1B5E20;}
  .stbl .highlight-td{background:#F1F8E9;font-weight:700;color:#1B5E20;}
  .lpj-box{display:flex;justify-content:space-between;align-items:center;background:#E8F5E9;border:2px solid #66BB6A;border-radius:4px;padding:10px 16px;}
  .lpj-nom{font-size:22px;font-weight:900;color:#2E7D32;}
  .lpj-badge{background:#2E7D32;color:white;font-weight:900;font-size:10px;padding:5px 14px;border-radius:4px;}
  .ttd-row{display:flex;justify-content:space-between;gap:10px;margin-top:20px;}
  .ttd-col{flex:1;text-align:center;border:1px solid #ccc;padding:10px 6px 6px 6px;border-radius:4px;}
  .ttd-title{font-size:10px;font-weight:900;text-transform:uppercase;margin-bottom:2px;}
  .ttd-sub{font-size:8.5px;color:#666;margin-bottom:55px;}
  .ttd-name{border-top:1px solid #333;padding-top:3px;font-size:9px;font-weight:700;}
  .footer{margin-top:12px;border-top:1px solid #ddd;padding-top:5px;text-align:center;font-size:8px;color:#aaa;}
  @media print{.page{margin:0;padding:8mm 10mm;}body{background:white;}}
</style>
</head>
<body>
<div class="page">
<div class="kop">
  <div class="kop-logo-placeholder">TUNAS<br/>BANGSA<br/>KEPRI</div>
  <div class="kop-center">
    <div class="org">Tunas Bangsa Kepulauan Riau</div>
    <div class="sub">Pengajuan Bantuan UMKM Tahun 2026</div>
  </div>
  <div class="kop-right">
    \${barcodeSvg}
    <div class="reg-code">\${regCode}</div>
    <div class="reg-label">Registration Code</div>
  </div>
</div>
<div class="kop-line"></div>
<div class="judul-row">
  <div>
    <div class="judul-text">Formulir Biodata Pelaku Usaha</div>
    <div class="judul-underline"></div>
  </div>
  <div class="no-badge">NO: \${actor.id?.slice(-4) || '1'}</div>
</div>
<div class="section">
  <div class="sec-hdr">I. DATA PRIBADI</div>
  <div class="sec-body"><table>
    \${row('Nama Lengkap', actor.fullName)}
    \${row('NIK', actor.nik)}
    \${row('Nomor Kartu Keluarga', actor.noKK)}
    \${row('Jenis Kelamin', actor.gender)}
    \${row('Tempat Lahir', pob)}
    \${row('Tanggal Lahir', dob)}
    \${row('Nomor HP / WhatsApp', actor.phone)}
    \${row('Kecamatan / Kelurahan', (actor.kecamatan && actor.kelurahan) ? actor.kecamatan + ' / ' + actor.kelurahan : (actor.kecamatan || actor.kelurahan || '-'))}
    \${row('Alamat Domisili', actor.address)}
  </table></div>
</div>
<div class="section" style="margin-top:8px;">
  <div class="sec-hdr">II. INFORMASI USAHA</div>
  <div class="sec-body"><table>
    \${row('Nama Usaha', actor.businessName)}
    \${row('Kategori Usaha', actor.businessCategory)}
    \${row('Lokasi Usaha', actor.businessLocation)}
    \${row('Korlap / Koordinator', actor.coordinator)}
  </table></div>
</div>
<div class="section" style="margin-top:8px;">
  <div class="sec-hdr">III. DATA PERBANKAN</div>
  <div class="sec-body"><table>
    \${row('Nama Bank', actor.bankName)}
    \${row('Nomor Rekening', actor.bankNumber)}
    \${row('Nama Pemilik Rekening', actor.bankOwner)}
  </table></div>
</div>
<div class="section" style="margin-top:8px;">
  <div class="sec-hdr">IV. HASIL SURVEY DINAS</div>
  <div class="sec-body" style="padding:0;"><table class="stbl">
    <tr><th>Bidang Usaha</th><td>\${sd.bidangUsaha||'-'}</td><th>Tahun Berdiri</th><td>\${sd.tahunBerdiri||'-'}</td></tr>
    <tr><th>Peralatan Usaha</th><td>\${sd.peralatan||'-'}</td><th>Email</th><td>\${sd.email||'-'}</td></tr>
    <tr><th>Sosial Media</th><td>\${sd.sosmed||'-'}</td><th>DTKS</th><td>\${sd.dtks?.masuk?'Ya ('+sd.dtks.jenis+')':'Tidak'}</td></tr>
    <tr><th>Modal Usaha</th><td>\${sd.modalUsaha||'-'}</td><th>Omset / Bulan</th><td>\${sd.omset||'-'}</td></tr>
    <tr><th>Izin yang Dimiliki</th><td colspan="3">\${(sd.izin||[]).join(', ')||'-'}</td></tr>
    <tr><th>Pernah Terima Hibah?</th><td colspan="3">\${sd.hibah?.pernah?'Ya (Dari: '+sd.hibah.dariMana+', Tahun: '+sd.hibah.tahun+')':'Tidak'}</td></tr>
    <tr><th>Rencana Penggunaan Dana</th><td colspan="3">\${sd.rencanaPenggunaan||'-'}</td></tr>
    <tr><th class="highlight-th">Hasil Survey</th><td colspan="3" class="highlight-td">\${sd.hasilSurvey||'-'}</td></tr>
  </table></div>
</div>
\${a.verificationLocationDinas ? \`
<div class="section" style="margin-top:8px;">
  <div class="sec-hdr">V. TITIK LOKASI GPS SURVEY</div>
  <div class="sec-body"><table>
    \${row('Koordinat GPS', a.verificationLocationDinas.lat + ', ' + a.verificationLocationDinas.lon)}
    \${row('Link Google Maps', 'maps.google.com/?q=' + a.verificationLocationDinas.lat + ',' + a.verificationLocationDinas.lon)}
  </table></div>
</div>\` : ''}
<div class="section" style="margin-top:8px;">
  <div class="sec-hdr">VI. LAPORAN PERTANGGUNG JAWABAN (LPJ)</div>
  <div class="sec-body" style="padding:8px;">
    <div class="lpj-box">
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#2E7D32;margin-bottom:3px;">Nominal Dana Terlaporkan</div>
        <div class="lpj-nom">Rp \${(actor.lpjNominal||0).toLocaleString('id-ID')}</div>
      </div>
      <div class="lpj-badge">&#10003; Telah Terverifikasi</div>
    </div>
  </div>
</div>
<div class="ttd-row">
  <div class="ttd-col">
    <div class="ttd-title">Pelaku Usaha</div>
    <div class="ttd-sub">Yang bertanda tangan di bawah ini</div>
    <div class="ttd-name">(\${actor.fullName?.toUpperCase()||'..............................'})</div>
  </div>
  <div class="ttd-col">
    <div class="ttd-title">Koordinator Lapangan</div>
    <div class="ttd-sub">Menyatakan data telah diperiksa</div>
    <div class="ttd-name">(\${actor.coordinator?.toUpperCase()||'..............................'})</div>
  </div>
  <div class="ttd-col">
    <div class="ttd-title">Pejabat Verifikasi Dinas</div>
    <div class="ttd-sub">Menyatakan data telah diverifikasi</div>
    <div class="ttd-name">(..............................)</div>
  </div>
</div>
<div class="footer">Sistem Informasi DKUKM &bull; Dicetak: \${new Date().toLocaleString('id-ID')} &bull; Kode: \${regCode}</div>
</div></body></html>\`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 600)
  }

`;

// Replace everything between the start of handlePrintActor and adminRef
const newContent = beforeFn + newFn + afterFn;
fs.writeFileSync(filePath, newContent);
console.log('File cleaned and replaced successfully!');
