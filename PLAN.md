# Project #3 — .ai mint (rencana teknis)

Dibuat 26 Okt 2026. Basis: pelajaran dari Pengupunk (#2) dan Lodepass (#1).

## Apa yang salah di #1 dan #2, dan perbaikannya

| masalah nyata | penyebab | perbaikan di #3 |
|---|---|---|
| Reveal telat 83.000 blok, semua keping SEALED | kontrak tanpa owner + reveal manual; watcher cuma lapor | (a) cron auto-reveal yang **mengirim tx**, (b) `tokenURI` hitung seed lazy, (c) `revealFallback()` pakai `keccak(secret)` kalau lewat 256 blok |
| `blockhash` kedaluwarsa → seed = keccak(0x0, secret) | reveal dikirim jauh setelah target | reveal wajib masuk ≤256 blok; fallback eksplisit biar jujur |
| Order book mati: THE WALL & BN World bid-only, Nakamigos 5.834 listing 0 bid | desain market cuma satu sisi | market **dua sisi**: `list()` + `bid()` + `acceptBid()`, plus `floor()` view |
| Kontrak Pengupunk belum terverifikasi di BscScan | form BscScan loop, upload manual gagal | verify **sebelum** announce, via Hardhat + API key `?chainid=56`; kalau gagal, tunda launch |
| Kuota gratis 223 habis 20 menit, lalu mint berhenti | kuota kecil + harga naik terlalu cepat | tier gratis lebih besar + harga bayar rendah & datar |
| Artist/metadata bergantung server | — | metadata di IPFS (pin) atau on-chain penuh kalau trait sedikit |

## Desain kontrak #3 (ERC-721 + market)

Mint:
- gate: `AgentIdRegistry(0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F).balanceOf(w) > 0`
- gratis: 1 per wallet (kuota total misal 500), lalu harga datar 0,0003–0,0005 BNB
- max 3 per wallet
- tanpa owner, tanpa pause, tanpa withdraw (dana langsung ke treasury di tx yang sama)
- royalty ERC2981 2,5%

Reveal (yang benar):
```
seedLazy(tokenId) = uint256(keccak256(abi.encodePacked(blockhash(revealBlock), secret, tokenId)))
```
- `reveal()` dipanggil cron tepat setelah `revealBlock` (gas ~46k)
- kalau `blockhash == 0` (telat), otomatis pakai `keccak256(abi.encodePacked(secret, tokenId))`
- `tokenURI` tidak butuh transaksi tambahan

Market (dua sisi, satu kontrak):
- `list(tokenId, price, days)` · `cancelListing`
- `bid(tokenId, days)` payable · `acceptBid(bidId, tokenId)` · `cancelBid`
- fee 2% → treasury, sisa ke seller dalam tx yang sama
- `floor()` view untuk halaman

## Urutan kerja
1. Pilih konsep + nama (butuh keputusan user)
2. Art: 1 base + 5–6 slot trait (mohawk/shades/collar/accessory/bg/beak) — pixel, 512×512
3. Kontrak + 15 tes (gate, kuota, harga, refund, reveal window, fallback, market dua sisi)
4. Deploy **testnet BSC** dulu → cek mint + reveal + list + bid end-to-end
5. Deploy mainnet → verify di BscScan → baru umumkan
6. Halaman: mint + market. Pakai `vibeprompts.dev` untuk layout, `transitions.dev` untuk animasi, WalletConnect projectId yang sudah ada
7. Checklist `isreadyforlaunch.com` sebelum announce
8. Launch: post X + gambar hasil mint, market link, gate .ai

## Biaya (gas only)
| langkah | perkiraan |
|---|---|
| deploy NFT | ~0,00007 BNB |
| deploy market | ~0,00007 BNB |
| verify | 0 |
| reveal | ~0,0000023 BNB |
| mint kita sendiri (3 keping) | 0 ke kontrak + gas ~0,000006/keping |

## Peran tool dari toolkit
- `vibeprompts.dev` — 286 prompt UI: pakai untuk halaman market/mint biar tidak generik
- `transitions.dev` — animasi halus di reveal/mint
- `skill-issue.in` — pola skill desain; bandingkan dengan skill kita
- `opendesign.dev` — mockup gratis tanpa Figma
- `isreadyforlaunch.com` — gate terakhir sebelum announce
- `free-pi` — bantu coding harian gratis (folder bersih, tanpa kunci)
