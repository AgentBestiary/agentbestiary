/* Agent Bestiary — mint + market UI. Vanilla JS, ethers v6 UMD. */
(() => {
  const CFG = window.BESTIARY_CONFIG || {};
  const ZERO = "0x0000000000000000000000000000000000000000";

  const NFT_ABI = [
    "function totalMinted() view returns (uint256)",
    "function MAX_SUPPLY() view returns (uint256)",
    "function MAX_PER_WALLET() view returns (uint256)",
    "function FREE_QUOTA() view returns (uint256)",
    "function freeMinted() view returns (uint256)",
    "function price() view returns (uint256)",
    "function quote(address) view returns (uint256)",
    "function mintedBy(address) view returns (uint256)",
    "function revealed() view returns (bool)",
    "function seed() view returns (bytes32)",
    "function revealBlock() view returns (uint256)",
    "function tierOf(uint256) view returns (string)",
    "function traits(uint256) view returns (uint8,uint8,uint8,uint8,uint8)",
    "function tokenURI(uint256) view returns (string)",
    "function balanceOf(address) view returns (uint256)",
    "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
    "function ownerOf(uint256) view returns (address)",
    "function hasAgentId(address) view returns (bool)",
    "function mint() payable returns (uint256)",
    "function approve(address,uint256)",
    "function getApproved(uint256) view returns (address)",
    "function isApprovedForAll(address,address) view returns (bool)",
    "function setApprovalForAll(address,bool)"
  ];

  const MARKET_ABI = [
    "function listedCount() view returns (uint256)",
    "function bidCount() view returns (uint256)",
    "function floor() view returns (uint256)",
    "function listingsPage(uint256,uint256) view returns (uint256[] ids, uint256[] prices, address[] sellers)",
    "function bidsPage(uint256,uint256) view returns (uint256[] ids, uint256[] amounts, address[] bidders)",
    "function listings(uint256) view returns (address seller, uint96 price, uint64 expiry)",
    "function bids(uint256) view returns (address bidder, uint96 amount, uint64 expiry)",
    "function list(uint256,uint256,uint256)",
    "function cancelListing(uint256)",
    "function buy(uint256) payable",
    "function bid(uint256) payable",
    "function cancelBid(uint256)",
    "function acceptBid(uint256)",
    "function FEE_BPS() view returns (uint96)"
  ];

  const state = {
    provider: null,
    signer: null,
    account: null,
    nft: null,
    market: null,
    readNft: null,
    readMarket: null,
    tab: "mint",
    listings: [],
    myPieces: [],
    busy: false
  };

  // ------------------------------------------------------------ helpers
  const $ = (id) => document.getElementById(id);
  const fmt = (wei, d = 5) => {
    if (wei === null || wei === undefined) return "—";
    const v = Number(ethers.formatEther(wei));
    if (v === 0) return "0";
    return v < 0.00001 ? v.toFixed(8) : v.toFixed(d).replace(/0+$/, "").replace(/\.$/, "");
  };
  const short = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "—");

  function toast(msg, bad = false) {
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (bad ? " bad" : "");
    clearTimeout(t._h);
    t._h = setTimeout(() => (t.className = "toast"), 5200);
  }

  function svgFromTokenURI(uri) {
    try {
      const json = JSON.parse(atob(uri.split(",")[1]));
      const svg = atob(json.image.split(",")[1]);
      return { svg, json };
    } catch (e) {
      return { svg: null, json: null };
    }
  }

  // ------------------------------------------------------------ read layer
  async function initRead() {
    state.provider = new ethers.JsonRpcProvider(CFG.rpc, CFG.chainId, { staticNetwork: true });
    state.readNft = new ethers.Contract(CFG.nft, NFT_ABI, state.provider);
    state.readMarket = new ethers.Contract(CFG.market, MARKET_ABI, state.provider);
    await refresh();
    setInterval(refresh, 20000);
  }

  async function refresh() {
    if (!CFG.nft || !CFG.market) {
      $("liveDot").textContent = "belum deploy";
      return;
    }
    try {
      const [minted, maxSup, perWallet, freeQ, freeM, price, revealed, listed, floor, bids] =
        await Promise.all([
          state.readNft.totalMinted(),
          state.readNft.MAX_SUPPLY(),
          state.readNft.MAX_PER_WALLET(),
          state.readNft.FREE_QUOTA(),
          state.readNft.freeMinted(),
          state.readNft.price(),
          state.readNft.revealed(),
          state.readMarket.listedCount(),
          state.readMarket.floor(),
          state.readMarket.bidCount()
        ]);

      $("sMinted").innerHTML = `${minted} <small>/ ${maxSup}</small>`;
      $("sFree").innerHTML = `${freeM} <small>/ ${freeQ} kuota</small>`;
      $("sPrice").innerHTML = `${fmt(price)} <small>BNB</small>`;
      $("sFloor").innerHTML = floor > 0n ? `${fmt(floor)} <small>BNB</small>` : `— <small>no ask</small>`;
      $("revealState").textContent = revealed ? "revealed" : "sealed";

      const pct = Number((minted * 10000n) / maxSup) / 100;
      $("mintBar").style.width = pct + "%";
      $("mintBarLabel").textContent = `${pct.toFixed(1)}% minted`;

      if (state.account) {
        const [q, mine, agent] = await Promise.all([
          state.readNft.quote(state.account),
          state.readNft.mintedBy(state.account),
          state.readNft.hasAgentId(state.account)
        ]);
        const soldOut = q === ethers.MaxUint256;
        $("myQuote").textContent = soldOut ? "batas wallet tercapai" : (q === 0n ? "GRATIS" : fmt(q) + " BNB");
        $("myCount").textContent = `${mine} / ${perWallet}`;
        $("myAgent").textContent = agent ? "terdeteksi .ai ✓" : "tidak ada Agent ID";
        $("mintBtn").disabled = soldOut || !agent || state.busy;
        $("mintBtn").textContent = soldOut
          ? "BATAS TERCAPAI"
          : q === 0n
          ? "MINT GRATIS"
          : `MINT · ${fmt(q)} BNB`;
      } else {
        $("mintBtn").textContent = "CONNECT WALLET";
        $("mintBtn").disabled = false;
      }

      await renderMarket();
    } catch (e) {
      console.error(e);
      $("liveDot").textContent = "rpc error: " + String((e && (e.shortMessage || e.message)) || e).slice(0, 80);
    }
  }

  async function renderMarket() {
    const [ids, prices, sellers] = await state.readMarket.listingsPage(0, 24);
    const [bIds, bAmounts] = await state.readMarket.bidsPage(0, 24);
    $("askCount").textContent = ids.length;
    $("bidListCount").textContent = bIds.length;

    const grid = $("marketGrid");
    if (!ids.length) {
      grid.innerHTML = `<div class="empty">Belum ada ask. Jadilah yang pertama memasang harga.</div>`;
    } else {
      const cards = [];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        let art = "";
        try {
          const uri = await state.readNft.tokenURI(id);
          const { svg } = svgFromTokenURI(uri);
          art = svg ? `<img src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}" alt="">` : "";
        } catch (e) {}
        const mine = state.account && sellers[i].toLowerCase() === state.account.toLowerCase();
        cards.push(`<div class="card">
          <div class="art">${art}</div>
          <div class="body">
            <div class="name">#${String(id).padStart(4, "0")}</div>
            <div class="sub">${short(sellers[i])}${mine ? " · MILIK LU" : ""}</div>
            <div class="price">${fmt(prices[i])} BNB</div>
            <div class="actions">
              ${mine
                ? `<button class="btn sm ghost" data-action="cancel" data-id="${id}">CANCEL</button>`
                : `<button class="btn sm primary" data-action="buy" data-id="${id}" data-price="${prices[i]}">BUY</button>`}
            </div>
          </div>
        </div>`);
      }
      grid.innerHTML = cards.join("");
    }

    const bl = $("bidGrid");
    if (!bIds.length) {
      bl.innerHTML = `<div class="empty">Belum ada bid. Pasang bid supaya pemegang bisa langsung jual ke lu.</div>`;
    } else {
      bl.innerHTML = bIds.map((id, i) => `<div class="card">
        <div class="body">
          <div class="name">#${String(id).padStart(4, "0")}</div>
          <div class="sub">bid dari ${short(
            (window.__bidders && window.__bidders[i]) || ""
          )}</div>
          <div class="price">${fmt(bAmounts[i])} BNB</div>
          <div class="actions">
            <button class="btn sm" data-action="accept" data-id="${id}">SELL INTO BID</button>
          </div>
        </div>
      </div>`).join("");
    }
  }

  async function renderMine() {
    if (!state.account) {
      $("myPieces").innerHTML = `<div class="empty">Connect wallet untuk melihat keping lu.</div>`;
      return;
    }
    const nft = state.readNft;
    const bal = Number(await nft.balanceOf(state.account));
    const rows = [];
    for (let i = 0; i < bal; i++) {
      const id = (await nft.tokenOfOwnerByIndex(state.account, i)).toString();
      const uri = await nft.tokenURI(id);
      const { svg, json } = svgFromTokenURI(uri);
      let tier = "Sealed";
      try { tier = await nft.tierOf(id); } catch (e) {}
      const agent = (json?.attributes || []).find((a) => a.trait_type === "Agent")?.value || "";
      rows.push(`<div class="card">
        <div class="art">${svg ? `<img src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}" alt="">` : ""}</div>
        <div class="body">
          <div class="name">#${String(id).padStart(4, "0")} · ${tier}</div>
          <div class="sub">@${agent || "—"}</div>
          <div class="actions">
            <button class="btn sm" data-action="list" data-id="${id}">LIST</button>
            <button class="btn sm ghost" data-action="bidmine" data-id="${id}">BID</button>
          </div>
        </div>
      </div>`);
    }
    $("myPieces").innerHTML = rows.length
      ? rows.join("")
      : `<div class="empty">Belum ada keping di wallet ini.</div>`;
  }

  // ------------------------------------------------------------ wallet
  async function connectInjected() {
    if (!window.ethereum) throw new Error("Tidak ada wallet di browser ini");
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== Number(CFG.chainId)) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x" + Number(CFG.chainId).toString(16) }]
        });
      } catch (e) {
        toast("Ganti jaringan ke " + CFG.chainName + " dulu", true);
        return;
      }
    }
    const signer = await provider.getSigner();
    setWallet(signer, await signer.getAddress());
  }

  async function connectWalletConnect() {
    const mod = await import("https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.21.0/+esm");
    const EthereumProvider = mod.EthereumProvider || mod.default;
    const wc = await EthereumProvider.init({
      projectId: CFG.wcProjectId,
      chains: [CFG.chainId],
      optionalChains: [CFG.chainId],
      showQrModal: true,
      metadata: {
        name: "Agent Bestiary",
        description: ".ai-gated specimens on BSC",
        url: location.origin,
        icons: []
      }
    });
    await wc.connect();
    const provider = new ethers.BrowserProvider(wc);
    const signer = await provider.getSigner();
    setWallet(signer, await signer.getAddress());
  }

  function setWallet(signer, address) {
    state.signer = signer;
    state.account = address;
    state.nft = new ethers.Contract(CFG.nft, NFT_ABI, signer);
    state.market = new ethers.Contract(CFG.market, MARKET_ABI, signer);
    $("walletBtn").textContent = short(address);
    $("walletBtn").classList.add("primary");
    closeSheet();
    toast("Wallet tersambung: " + short(address));
    refresh();
    if (state.tab === "mine") renderMine();
  }

  const WALLETS = [
    { name: "MetaMask", note: "ekstensi / app", deep: (u) => `https://metamask.app.link/dapp/${u}` },
    { name: "Trust Wallet", note: "app", deep: (u) => `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent("https://" + u)}` },
    { name: "Bitget Wallet", note: "app", deep: (u) => `https://bkcode.vip?action=dapp&url=${encodeURIComponent("https://" + u)}` },
    { name: "Binance Wallet", note: "app", deep: (u) => `https://app.binance.com/cedefi/dapp?url=${encodeURIComponent("https://" + u)}` },
    { name: "WalletConnect", note: "QR / semua wallet", wc: true }
  ];

  function openSheet() {
    const host = location.host + location.pathname + location.search;
    $("sheetList").innerHTML = WALLETS.map(
      (w, i) => `<div class="wrow" data-w="${i}">
        <div class="ico"></div><span>${w.name}</span><small>${w.note}</small>
      </div>`
    ).join("");
    $("walletSheet").classList.add("open");
    $("sheetList").querySelectorAll(".wrow").forEach((el) => {
      el.onclick = async () => {
        const w = WALLETS[Number(el.dataset.w)];
        try {
          if (w.wc) await connectWalletConnect();
          else if (window.ethereum) await connectInjected();
          else location.href = w.deep(host);
        } catch (e) {
          toast(e.message || "Gagal connect", true);
        }
      };
    });
  }
  const closeSheet = () => $("walletSheet").classList.remove("open");

  // ------------------------------------------------------------ actions
  async function mint() {
    if (!state.account) return openSheet();
    if (state.busy) return;
    state.busy = true;
    $("mintBtn").disabled = true;
    try {
      const q = await state.nft.quote(state.account);
      toast("Menunggu konfirmasi di wallet…");
      const tx = await state.nft.mint({ value: q === ethers.MaxUint256 ? 0n : q });
      toast("Tx terkirim: " + short(tx.hash));
      await tx.wait();
      toast("Mint sukses ✓");
      await refresh();
      if (state.tab === "mine") await renderMine();
    } catch (e) {
      toast((e.shortMessage || e.message || "Gagal mint").slice(0, 140), true);
    } finally {
      state.busy = false;
      refresh();
    }
  }

  async function list(id) {
    const priceStr = prompt("Harga ask (BNB):", "0.001");
    if (!priceStr) return;
    const days = prompt("Durasi (hari, 1-90):", "7");
    if (!days) return;
    try {
      const approved = await state.nft.getApproved(id);
      if (approved.toLowerCase() !== CFG.market.toLowerCase()) {
        toast("Approve keping dulu…");
        await (await state.nft.approve(CFG.market, id)).wait();
      }
      const tx = await state.market.list(id, ethers.parseEther(priceStr), Number(days));
      toast("Listing terkirim: " + short(tx.hash));
      await tx.wait();
      toast("Keping ter-list ✓");
      refresh();
      renderMine();
    } catch (e) {
      toast((e.shortMessage || e.message).slice(0, 140), true);
    }
  }

  async function bid(id) {
    const amount = prompt("Nilai bid (BNB):", "0.001");
    if (!amount) return;
    try {
      const tx = await state.market.bid(id, { value: ethers.parseEther(amount) });
      toast("Bid terkirim: " + short(tx.hash));
      await tx.wait();
      toast("Bid aktif ✓ (dana ditahan kontrak)");
      refresh();
    } catch (e) {
      toast((e.shortMessage || e.message).slice(0, 140), true);
    }
  }

  async function buy(id, price) {
    try {
      const tx = await state.market.buy(id, { value: BigInt(price) });
      toast("Membeli… " + short(tx.hash));
      await tx.wait();
      toast("Keping jadi milik lu ✓");
      refresh();
      renderMine();
    } catch (e) {
      toast((e.shortMessage || e.message).slice(0, 140), true);
    }
  }

  async function accept(id) {
    try {
      const approved = await state.nft.getApproved(id);
      if (approved.toLowerCase() !== CFG.market.toLowerCase()) {
        await (await state.nft.approve(CFG.market, id)).wait();
      }
      const tx = await state.market.acceptBid(id);
      toast("Menjual ke bid… " + short(tx.hash));
      await tx.wait();
      toast("Terjual ✓");
      refresh();
      renderMine();
    } catch (e) {
      toast((e.shortMessage || e.message).slice(0, 140), true);
    }
  }

  async function cancel(id) {
    try {
      await (await state.market.cancelListing(id)).wait();
      toast("Listing dibatalkan");
      refresh();
    } catch (e) {
      toast((e.shortMessage || e.message).slice(0, 140), true);
    }
  }

  // ------------------------------------------------------------ wiring
  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
    ["mint", "market", "mine"].forEach((t) => ($("panel-" + t).style.display = t === tab ? "" : "none"));
    if (tab === "mine") renderMine();
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) return setTab(t.dataset.tab);
    if (e.target.id === "walletBtn") return openSheet();
    if (e.target.id === "sheetClose") return closeSheet();
    if (e.target.classList.contains("walletSheet")) return closeSheet();
    if (e.target.id === "mintBtn") return mint();
    const a = e.target.closest("[data-action]");
    if (!a) return;
    const id = Number(a.dataset.id);
    if (a.dataset.action === "buy") return buy(id, a.dataset.price);
    if (a.dataset.action === "list") return list(id);
    if (a.dataset.action === "bidmine") return bid(id);
    if (a.dataset.action === "accept") return accept(id);
    if (a.dataset.action === "cancel") return cancel(id);
  });

  window.addEventListener("load", () => {
    initRead();
    const wanted = new URLSearchParams(location.search).get("tab");
    setTab(["mint", "market", "mine"].includes(wanted) ? wanted : "mint");
  });
})();
