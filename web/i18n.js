/* Agent Bestiary — i18n (EN / ID / 中文). Static strings via data-i18n, dynamic via t(). */
(() => {
  const DICT = {
    en: {
      "nav.intake": "Intake",
      "nav.agents": "Agents",
      "nav.market": "Market",
      "nav.connect": "Connect",

      "live.label": "bsc mainnet · live",
      "hero.title1": "Five thousand specimens.",
      "hero.title2": "One per agent.",
      "hero.lede":
        "Every piece prints your agent's handle straight from the Agent ID registry on BNB Chain — not data we typed in. The first piece is free for the first 1,000 agents, after that 0.0003 BNB, five per wallet at most. The art lives inside the contract: no IPFS, no server.",

      "console.title": "specimen intake",
      "console.sealed": "sealed",
      "console.revealed": "revealed",
      "console.price": "Your wallet price",
      "console.mine": "Your pieces",
      "console.agent": "Agent ID status",
      "console.connectFirst": "connect first",
      "console.loading": "reading chain…",

      "btn.connectWallet": "Connect wallet",
      "btn.free": "Take it free",
      "btn.mint": "Mint",
      "btn.limit": "Wallet limit reached",
      "btn.noAgent": "Agent ID required",
      "btn.cancel": "Cancel",
      "btn.buy": "Buy",
      "btn.sellBid": "Sell into bid",
      "btn.list": "Set price",
      "btn.bid": "Bid",
      "btn.copy": "Copy",
      "btn.copyDone": "Prompt copied — paste it into your agent",

      "ticker.minted": "Minted",
      "ticker.free": "Free used",
      "ticker.price": "Price",
      "ticker.floor": "Floor ask",
      "ticker.book": "Ask / Bid",
      "ticker.reveal": "Reveal block",
      "ticker.empty": "empty",
      "ticker.done": "done",

      "specimen.none": "SPECIMEN",
      "specimen.nofree": "no piece yet",
      "specimen.mint": "mint to see it",

      "log.title": "Just arrived",
      "log.sub": "read from contract events",
      "log.empty": "no mints in this block window",
      "log.err": "log unreadable (rpc limits getLogs)",

      "prompt.title": "prompt for agents",
      "prompt.note": "paste into any agent that holds an Agent ID wallet",
      "prompt.help":
        "The agent checks hasAgentId and quote first, simulates, then sends. If the free quota is gone the price is 0.0003 BNB and it refuses unless you approve it.",

      "market.title": "Market",
      "market.sub": "2% fee · 2.5% royalty · both sides",
      "market.asks": "Ask",
      "market.bids": "Bid",
      "market.all": "All",
      "market.noAsk": "no asks yet",
      "market.noBid": "no open bids yet",
      "market.mine": "yours",

      "mine.title": "Your pieces",
      "mine.none": "this wallet holds nothing yet",

      "foot.rights": "no owner · no pause · no withdraw",

      "sheet.title": "Connect wallet",
      "sheet.hint":
        "On mobile pick the wallet you have installed so the page opens inside it. WalletConnect is for scanning from desktop.",

      "toast.connecting": "opening wallet…",
      "toast.connected": "connected:",
      "toast.confirm": "confirm in your wallet…",
      "toast.mintOk": "minted ·",
      "toast.mintFail": "mint failed",
      "toast.limit": "5 pieces per wallet reached",
      "toast.needAgent": "this wallet has no .ai Agent ID",
      "toast.approve": "approving piece for the market…",
      "toast.listed": "piece listed",
      "toast.bidOk": "bid active — funds held by the contract",
      "toast.bought": "the piece is yours",
      "toast.sold": "sold into the bid",
      "toast.cancelled": "listing cancelled",
      "toast.txErr": "transaction failed",
      "toast.wcFail": "WalletConnect could not start. Open this page inside your wallet's browser instead.",
      "toast.walletMissing": "No wallet found in this browser. Open the page inside MetaMask / Trust / Bitget / Binance.",
      "toast.choosePrice": "Ask price in BNB:",
      "toast.chooseDays": "Duration in days (1-90):",
      "toast.chooseBid": "Bid amount in BNB:",

      "units.of": "of",
      "units.sold": "sold",
      "units.pieces": "pieces"
    },

    id: {
      "nav.intake": "Intake",
      "nav.agents": "Agent",
      "nav.market": "Market",
      "nav.connect": "Connect",

      "live.label": "bsc mainnet · live",
      "hero.title1": "Lima ribu spesimen.",
      "hero.title2": "Satu per agent.",
      "hero.lede":
        "Setiap keping mencetak nama agent lu langsung dari registry Agent ID di BNB Chain — bukan data yang kami isi sendiri. Keping pertama gratis untuk 1.000 agent pertama, sisanya 0,0003 BNB, maksimal 5 per wallet. Gambarnya hidup di dalam kontrak: tanpa IPFS, tanpa server.",

      "console.title": "specimen intake",
      "console.sealed": "sealed",
      "console.revealed": "revealed",
      "console.price": "Harga wallet lu",
      "console.mine": "Keping lu",
      "console.agent": "Status Agent ID",
      "console.connectFirst": "connect dulu",
      "console.loading": "memuat data chain…",

      "btn.connectWallet": "Connect wallet",
      "btn.free": "Ambil gratis",
      "btn.mint": "Mint",
      "btn.limit": "Batas wallet tercapai",
      "btn.noAgent": "Butuh Agent ID .ai",
      "btn.cancel": "Batal",
      "btn.buy": "Beli",
      "btn.sellBid": "Jual ke bid",
      "btn.list": "Pasang harga",
      "btn.bid": "Bid",
      "btn.copy": "Copy",
      "btn.copyDone": "Prompt disalin — tempel ke agent lu",

      "ticker.minted": "Minted",
      "ticker.free": "Gratis terpakai",
      "ticker.price": "Harga",
      "ticker.floor": "Floor ask",
      "ticker.book": "Ask / Bid",
      "ticker.reveal": "Blok reveal",
      "ticker.empty": "kosong",
      "ticker.done": "sudah",

      "specimen.none": "SPESIMEN",
      "specimen.nofree": "belum ambil keping",
      "specimen.mint": "mint untuk melihat wujudnya",

      "log.title": "Yang baru masuk",
      "log.sub": "dibaca dari event kontrak",
      "log.empty": "belum ada mint di jendela blok ini",
      "log.err": "log tidak terbaca (rpc membatasi getLogs)",

      "prompt.title": "prompt untuk agent",
      "prompt.note": "tempel ke agent mana pun yang punya wallet Agent ID",
      "prompt.help":
        "Agent akan cek hasAgentId dan quote dulu, simulasi, baru kirim. Kalau kuota gratis habis, biayanya 0,0003 BNB dan itu ditolak kalau tidak disetujui.",

      "market.title": "Market",
      "market.sub": "fee 2% · royalty 2,5% · dua arah",
      "market.asks": "Ask",
      "market.bids": "Bid",
      "market.all": "Semua",
      "market.noAsk": "belum ada ask",
      "market.noBid": "belum ada bid terbuka",
      "market.mine": "milik lu",

      "mine.title": "Keping gue",
      "mine.none": "wallet ini belum punya keping",

      "foot.rights": "tanpa owner · tanpa pause · tanpa withdraw",

      "sheet.title": "Connect wallet",
      "sheet.hint":
        "Di HP, pilih wallet yang terpasang supaya halaman terbuka di dalam app-nya. WalletConnect untuk QR dari desktop.",

      "toast.connecting": "membuka wallet…",
      "toast.connected": "tersambung:",
      "toast.confirm": "konfirmasi di wallet…",
      "toast.mintOk": "berhasil ·",
      "toast.mintFail": "gagal mint",
      "toast.limit": "batas 5 keping per wallet tercapai",
      "toast.needAgent": "wallet ini tidak punya Agent ID .ai",
      "toast.approve": "menyetujui keping untuk market…",
      "toast.listed": "keping ter-list",
      "toast.bidOk": "bid aktif — dana ditahan kontrak",
      "toast.bought": "keping jadi milik lu",
      "toast.sold": "terjual ke bid",
      "toast.cancelled": "listing dibatalkan",
      "toast.txErr": "transaksi gagal",
      "toast.wcFail": "WalletConnect tidak bisa jalan. Buka halaman ini di browser wallet lu.",
      "toast.walletMissing": "Tidak ada wallet di browser ini. Buka halaman di MetaMask / Trust / Bitget / Binance.",
      "toast.choosePrice": "Harga ask (BNB):",
      "toast.chooseDays": "Durasi hari (1-90):",
      "toast.chooseBid": "Nilai bid (BNB):",

      "units.of": "dari",
      "units.sold": "terjual",
      "units.pieces": "keping"
    },

    zh: {
      "nav.intake": "铸造",
      "nav.agents": "AI 代理",
      "nav.market": "市场",
      "nav.connect": "连接钱包",

      "live.label": "bsc 主网 · 运行中",
      "hero.title1": "五千个标本。",
      "hero.title2": "每个代理一个。",
      "hero.lede":
        "每一件都会直接从 BNB Chain 的 Agent ID 注册表读取你的代理名字 — 不是我们手写的数据。前 1,000 个代理首件免费，之后每件 0.0003 BNB，每个钱包最多 5 件。图像完全由合约生成：没有 IPFS，没有服务器。",

      "console.title": "标本领取",
      "console.sealed": "未揭晓",
      "console.revealed": "已揭晓",
      "console.price": "你的钱包价格",
      "console.mine": "你的藏品",
      "console.agent": "Agent ID 状态",
      "console.connectFirst": "请先连接",
      "console.loading": "读取链上数据…",

      "btn.connectWallet": "连接钱包",
      "btn.free": "免费领取",
      "btn.mint": "铸造",
      "btn.limit": "已达钱包上限",
      "btn.noAgent": "需要 .ai Agent ID",
      "btn.cancel": "取消",
      "btn.buy": "购买",
      "btn.sellBid": "卖给买单",
      "btn.list": "设置价格",
      "btn.bid": "出价",
      "btn.copy": "复制",
      "btn.copyDone": "提示词已复制 — 粘贴给你的代理",

      "ticker.minted": "已铸造",
      "ticker.free": "免费额度已用",
      "ticker.price": "价格",
      "ticker.floor": "地板价",
      "ticker.book": "卖单 / 买单",
      "ticker.reveal": "揭晓区块",
      "ticker.empty": "空",
      "ticker.done": "已完成",

      "specimen.none": "标本",
      "specimen.nofree": "还没有藏品",
      "specimen.mint": "铸造后可见",

      "log.title": "最新铸造",
      "log.sub": "来自合约事件",
      "log.empty": "此区块范围内没有铸造",
      "log.err": "日志读取失败（RPC 限制 getLogs）",

      "prompt.title": "给 AI 代理的提示词",
      "prompt.note": "粘贴给任何持有 Agent ID 钱包的代理",
      "prompt.help":
        "代理会先检查 hasAgentId 和 quote，模拟后再发送。免费额度用完后价格为 0.0003 BNB，未经同意不会支付。",

      "market.title": "市场",
      "market.sub": "手续费 2% · 版税 2.5% · 买卖双向",
      "market.asks": "卖单",
      "market.bids": "买单",
      "market.all": "全部",
      "market.noAsk": "暂无卖单",
      "market.noBid": "暂无买单",
      "market.mine": "你的",

      "mine.title": "你的藏品",
      "mine.none": "此钱包还没有藏品",

      "foot.rights": "无所有者 · 无暂停 · 无提取",

      "sheet.title": "连接钱包",
      "sheet.hint": "在手机上选择已安装的钱包，页面会在其内置浏览器打开。桌面可用 WalletConnect 扫码。",

      "toast.connecting": "正在打开钱包…",
      "toast.connected": "已连接：",
      "toast.confirm": "请在钱包中确认…",
      "toast.mintOk": "铸造成功 ·",
      "toast.mintFail": "铸造失败",
      "toast.limit": "已达每钱包 5 件上限",
      "toast.needAgent": "此钱包没有 .ai Agent ID",
      "toast.approve": "正在授权市场…",
      "toast.listed": "已上架",
      "toast.bidOk": "出价已生效 — 资金由合约托管",
      "toast.bought": "藏品已归你所有",
      "toast.sold": "已卖给买单",
      "toast.cancelled": "已取消上架",
      "toast.txErr": "交易失败",
      "toast.wcFail": "WalletConnect 无法启动，请在钱包内置浏览器中打开本页。",
      "toast.walletMissing": "此浏览器没有钱包。请在 MetaMask / Trust / Bitget / Binance 中打开本页。",
      "toast.choosePrice": "卖价（BNB）：",
      "toast.chooseDays": "时长（天，1-90）：",
      "toast.chooseBid": "出价金额（BNB）：",

      "units.of": "/",
      "units.sold": "已售",
      "units.pieces": "件"
    }
  };

  const LANGS = ["en", "id", "zh"];
  const KEY = "bestiary.lang";

  const I18N = {
    lang: "en",
    dict: DICT,
    t(key) {
      const d = DICT[this.lang] || DICT.en;
      return d[key] !== undefined ? d[key] : DICT.en[key] !== undefined ? DICT.en[key] : key;
    },
    detect() {
      const q = new URLSearchParams(location.search).get("lang");
      if (q && LANGS.includes(q)) return q;
      const saved = (() => { try { return localStorage.getItem(KEY); } catch (e) { return null; } })();
      if (saved && LANGS.includes(saved)) return saved;
      const nav = (navigator.language || "en").toLowerCase();
      if (nav.startsWith("id")) return "id";
      if (nav.startsWith("zh")) return "zh";
      return "en";
    },
    apply(lang) {
      this.lang = LANGS.includes(lang) ? lang : "en";
      try { localStorage.setItem(KEY, this.lang); } catch (e) {}
      document.documentElement.lang = this.lang;
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const v = this.t(el.dataset.i18n);
        if (v) el.textContent = v;
      });
      document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
        const v = this.t(el.dataset.i18nPh);
        if (v) el.placeholder = v;
      });
      document.querySelectorAll("[data-lang]").forEach((el) => {
        el.classList.toggle("on", el.dataset.lang === this.lang);
      });
      if (typeof window.onLangChange === "function") window.onLangChange(this.lang);
    }
  };

  I18N.lang = I18N.detect();
  window.I18N = I18N;
  document.addEventListener("DOMContentLoaded", () => I18N.apply(I18N.lang));
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]");
    if (b) I18N.apply(b.dataset.lang);
  });
})();
