/* Agent Bestiary — mint + market UI.
   Everything reads from chain. Wallet connect: injected wallets first, WalletConnect as fallback,
   each path wrapped with timeouts and human-readable failures. */
(() => {
  const CFG = window.BESTIARY_CONFIG || {};
  const T = (k) => (window.I18N ? window.I18N.t(k) : k);

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
    "function revealBlock() view returns (uint256)",
    "function tierOf(uint256) view returns (string)",
    "function tokenURI(uint256) view returns (string)",
    "function balanceOf(address) view returns (uint256)",
    "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
    "function hasAgentId(address) view returns (bool)",
    "function mint() payable returns (uint256)",
    "function approve(address,uint256)",
    "function getApproved(uint256) view returns (address)",
    "event Minted(address indexed minter, uint256 indexed tokenId, uint256 paid, string handle)"
  ];

  const MARKET_ABI = [
    "function listedCount() view returns (uint256)",
    "function bidCount() view returns (uint256)",
    "function floor() view returns (uint256)",
    "function listingsPage(uint256,uint256) view returns (uint256[] ids, uint256[] prices, address[] sellers)",
    "function bidsPage(uint256,uint256) view returns (uint256[] ids, uint256[] amounts, address[] bidders)",
    "function list(uint256,uint256,uint256)",
    "function cancelListing(uint256)",
    "function buy(uint256) payable",
    "function bid(uint256) payable",
    "function cancelBid(uint256)",
    "function acceptBid(uint256)"
  ];

  const S = {
    provider: null, signer: null, account: null, eip1193: null,
    nft: null, market: null, readNft: null, readMarket: null,
    filter: "asks", busy: false, deployed: false
  };

  const $ = (id) => document.getElementById(id);
  const short = (a) => (a ? a.slice(0, 5) + "…" + a.slice(-3) : "—");
  const pad = (n) => String(n).padStart(4, "0");

  function fmtEther(v, d = 5) {
    if (v === null || v === undefined) return "—";
    const n = Number(ethers.formatEther(v));
    if (n === 0) return "0";
    if (n < 0.00001) return n.toFixed(8).replace(/0+$/, "");
    return n.toFixed(d).replace(/0+$/, "").replace(/\.$/, "");
  }

  function toast(msg, bad = false) {
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (bad ? " bad" : "");
    clearTimeout(t._h);
    t._h = setTimeout(() => (t.className = "toast"), 6000);
  }

  const errText = (e, fallback) => {
    const m = (e && (e.shortMessage || e.reason || e.message)) || fallback;
    return String(m).slice(0, 140);
  };

  const withTimeout = (promise, ms, label) =>
    Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error(label + " (timeout)")), ms))
    ]);

  function decodeToken(uri) {
    try {
      const json = JSON.parse(atob(uri.split(",")[1]));
      const svg = atob(json.image.split(",")[1]);
      return { svg, json };
    } catch (e) {
      return { svg: null, json: null };
    }
  }
  const svgImg = (svg) =>
    `<img loading="lazy" alt="" src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}">`;

  function timeAgo(ts) {
    const s = Math.max(1, Math.floor(Date.now() / 1000 - Number(ts)));
    if (s < 60) return s + "s";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  }

  // ------------------------------------------------------------------ read
  async function boot() {
    S.deployed = Boolean(CFG.nft && CFG.market);
    $("nftLink").href = CFG.explorer && CFG.nft ? `${CFG.explorer}/address/${CFG.nft}` : "#";
    $("mkLink").href = CFG.explorer && CFG.market ? `${CFG.explorer}/address/${CFG.market}` : "#";
    const pc = $("promptChain");
    if (pc) pc.textContent = `${CFG.chainName || "bsc"} · ${CFG.chainId}`;
    $("liveLabel").textContent = `${(CFG.chainName || "bsc").toLowerCase()} · live`;
    buildPrompt();

    if (!S.deployed) {
      $("liveLabel").textContent = "not deployed";
      $("mintBarLabel").textContent = "contract not deployed on this network";
      $("agentPrompt").textContent = "Contract not deployed yet.";
      $("intakeLog").innerHTML = `<div class="empty">no on-chain data</div>`;
      $("book").innerHTML = `<div class="empty">market offline</div>`;
      return;
    }

    S.provider = new ethers.JsonRpcProvider(CFG.rpc, CFG.chainId, { staticNetwork: true });
    S.readNft = new ethers.Contract(CFG.nft, NFT_ABI, S.provider);
    S.readMarket = new ethers.Contract(CFG.market, MARKET_ABI, S.provider);

    await refresh();
    await loadIntakeLog();
    setInterval(refresh, 20000);
    setInterval(loadIntakeLog, 45000);
  }

  async function refresh() {
    if (!S.deployed) return;
    try {
      const [minted, maxSup, perWallet, freeQ, freeM, price, revealed, revealBlock, listed, floor, bids] =
        await Promise.all([
          S.readNft.totalMinted(), S.readNft.MAX_SUPPLY(), S.readNft.MAX_PER_WALLET(),
          S.readNft.FREE_QUOTA(), S.readNft.freeMinted(), S.readNft.price(),
          S.readNft.revealed(), S.readNft.revealBlock(),
          S.readMarket.listedCount(), S.readMarket.floor(), S.readMarket.bidCount()
        ]);

      $("sMinted").innerHTML = `${minted} <small>/ ${maxSup}</small>`;
      $("sFree").innerHTML = `${freeM} <small>/ ${freeQ}</small>`;
      $("sPrice").innerHTML = `${fmtEther(price)} <small>BNB</small>`;
      $("sFloor").innerHTML = floor > 0n ? `${fmtEther(floor)} <small>BNB</small>` : `— <small>${T("ticker.empty")}</small>`;
      $("sBook").innerHTML = `${listed} <small>/ ${bids}</small>`;
      $("sReveal").textContent = revealed ? T("ticker.done") : revealBlock.toString();
      $("revealState").textContent = revealed ? T("console.revealed") : T("console.sealed");

      const pct = Number((minted * 10000n) / maxSup) / 100;
      $("mintBar").style.width = pct + "%";
      $("mintBarLabel").textContent = `${pct.toFixed(2)}% ${T("units.sold")} · ${minted} ${T("units.of")} ${maxSup}`;

      if (S.account) {
        const [q, mine, agent] = await Promise.all([
          S.readNft.quote(S.account), S.readNft.mintedBy(S.account), S.readNft.hasAgentId(S.account)
        ]);
        const maxed = q === ethers.MaxUint256;
        $("myQuote").textContent = maxed ? T("btn.limit") : q === 0n ? T("btn.free").toUpperCase() : fmtEther(q) + " BNB";
        $("myCount").textContent = `${mine} / ${perWallet}`;
        $("myAgent").textContent = agent ? "✓" : "—";
        const btn = $("mintBtn");
        btn.disabled = maxed || !agent || S.busy;
        btn.textContent = maxed
          ? T("btn.limit")
          : !agent
          ? T("btn.noAgent")
          : q === 0n
          ? T("btn.free")
          : `${T("btn.mint")} · ${fmtEther(q)} BNB`;
      } else {
        $("myQuote").textContent = T("console.connectFirst");
        $("myCount").textContent = "—";
        $("myAgent").textContent = "—";
        $("mintBtn").textContent = T("btn.connectWallet");
        $("mintBtn").disabled = false;
      }

      await renderBook();
      await renderLatest();
    } catch (e) {
      console.error(e);
      $("liveLabel").textContent = "rpc · retry";
    }
  }

  async function renderLatest() {
    try {
      const total = Number(await S.readNft.totalMinted());
      if (!total) return;
      const id = total;
      const uri = await S.readNft.tokenURI(id);
      const { svg, json } = decodeToken(uri);
      if (svg) $("specimenFrame").innerHTML = svgImg(svg).replace('loading="lazy"', "");
      $("specimenId").textContent = `#${pad(id)}`;
      let tier = T("console.sealed");
      try { tier = await S.readNft.tierOf(id); } catch (e) {}
      $("specimenTier").textContent = tier;
      const agent = (json?.attributes || []).find((a) => a.trait_type === "Agent")?.value || "—";
      $("specimenAgent").textContent = "@" + agent;
    } catch (e) {}
  }

  async function loadIntakeLog() {
    const box = $("intakeLog");
    try {
      const latest = await S.provider.getBlockNumber();
      const from = Math.max(0, latest - 6000);
      const evs = await S.readNft.queryFilter("Minted", from, latest);
      const last = evs.slice(-9).reverse();
      if (!last.length) {
        box.innerHTML = `<div class="empty">${T("log.empty")}</div>`;
        return;
      }
      const rows = [];
      for (const e of last) {
        const blk = await S.provider.getBlock(e.blockNumber);
        rows.push(`<div class="line">
          <span class="id">#${pad(e.args.tokenId)}</span>
          <span class="who">@${e.args.handle || "unknown"}</span>
          <span class="when">${timeAgo(blk.timestamp)}</span>
        </div>`);
      }
      box.innerHTML = rows.join("");
    } catch (e) {
      box.innerHTML = `<div class="empty">${T("log.err")}</div>`;
    }
  }

  async function renderBook() {
    const [ids, prices, sellers] = await S.readMarket.listingsPage(0, 32);
    const [bIds, bAmounts, bidders] = await S.readMarket.bidsPage(0, 32);

    const tiles = [];
    if (S.filter === "asks" || S.filter === "all") {
      for (let i = 0; i < ids.length; i++) tiles.push({ kind: "ask", id: ids[i], price: prices[i], who: sellers[i] });
    }
    if (S.filter === "bids" || S.filter === "all") {
      for (let i = 0; i < bIds.length; i++) tiles.push({ kind: "bid", id: bIds[i], price: bAmounts[i], who: bidders[i] });
    }

    if (!tiles.length) {
      $("book").innerHTML = `<div class="empty">${S.filter === "bids" ? T("market.noBid") : T("market.noAsk")}</div>`;
      return;
    }

    const html = [];
    for (const t of tiles) {
      let art = "";
      try {
        const uri = await S.readNft.tokenURI(t.id);
        const { svg } = decodeToken(uri);
        if (svg) art = svgImg(svg);
      } catch (e) {}
      const mine = S.account && t.who.toLowerCase() === S.account.toLowerCase();
      const action =
        t.kind === "ask"
          ? mine
            ? `<button class="btn tiny" data-act="cancel" data-id="${t.id}">${T("btn.cancel")}</button>`
            : `<button class="btn tiny solid" data-act="buy" data-id="${t.id}" data-price="${t.price}">${T("btn.buy")}</button>`
          : `<button class="btn tiny solid" data-act="accept" data-id="${t.id}">${T("btn.sellBid")}</button>`;
      html.push(`<div class="tile">
        <div class="art">${art}<span class="tag">${t.kind}</span></div>
        <div class="meta">
          <div class="row1"><span class="id">#${pad(t.id)}</span><span class="price">${fmtEther(t.price)} BNB</span></div>
          <div class="who">${short(t.who)}${mine ? " · " + T("market.mine") : ""}</div>
          <div class="acts">${action}</div>
        </div>
      </div>`);
    }
    $("book").innerHTML = html.join("");
  }

  async function renderMine() {
    const sec = $("mine");
    if (!S.account || !S.deployed) {
      sec.classList.add("hidden");
      return;
    }
    sec.classList.remove("hidden");
    const bal = Number(await S.readNft.balanceOf(S.account));
    $("mineSub").textContent = `${bal} ${T("units.pieces")} · ${short(S.account)}`;
    if (!bal) {
      $("myBook").innerHTML = `<div class="empty">${T("mine.none")}</div>`;
      return;
    }
    const html = [];
    for (let i = 0; i < bal; i++) {
      const id = (await S.readNft.tokenOfOwnerByIndex(S.account, i)).toString();
      const uri = await S.readNft.tokenURI(id);
      const { svg, json } = decodeToken(uri);
      let tier = T("console.sealed");
      try { tier = await S.readNft.tierOf(id); } catch (e) {}
      const agent = (json?.attributes || []).find((a) => a.trait_type === "Agent")?.value || "—";
      html.push(`<div class="tile">
        <div class="art">${svg ? svgImg(svg) : ""}<span class="tag">${tier}</span></div>
        <div class="meta">
          <div class="row1"><span class="id">#${pad(id)}</span><span class="price">@${agent}</span></div>
          <div class="acts">
            <button class="btn tiny" data-act="list" data-id="${id}">${T("btn.list")}</button>
            <button class="btn tiny" data-act="bid" data-id="${id}">${T("btn.bid")}</button>
          </div>
        </div>
      </div>`);
    }
    $("myBook").innerHTML = html.join("");
  }

  // -------------------------------------------------------------- prompt
  function buildPrompt() {
    const nft = CFG.nft || "0x<NFT>";
    const p = [
      `Task: mint exactly 1 Agent Bestiary NFT for the wallet you control.`,
      ``,
      `Network: BNB Smart Chain, chain id 56.`,
      `NFT contract: ${nft}`,
      `Agent ID registry: ${CFG.registry || "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F"}`,
      ``,
      `Definitions:`,
      `- "your wallet" = the address your runtime signs with. Print it before doing anything.`,
      `- quote(address) returns the exact wei to send. 0 = free piece. 300000000000000 = paid piece (0.0003 BNB). Max uint256 = this wallet already holds 5 pieces.`,
      ``,
      `Pre-flight, all reads, no cost:`,
      `1. Print the wallet address you will use. If you cannot sign with it, stop.`,
      `2. registry.balanceOf(yourWallet) must be > 0. If 0, stop and report "no .ai Agent ID".`,
      `3. mintedBy(yourWallet) must be < 5. If 5, stop and report "wallet limit reached".`,
      `4. Read quote(yourWallet) and print the number.`,
      `   - 0: the piece is free, send 0.`,
      `   - 300000000000000: the free quota is gone, this piece costs 0.0003 BNB.`,
      `   - max uint256: stop, do not mint.`,
      `5. eth_call mint() with value = quote. If it reverts, stop and report the revert reason.`,
      `6. Check the wallet balance covers quote + 0.00005 BNB for gas. If not, stop and report the shortfall.`,
      ``,
      `Execute, one transaction only:`,
      `7. Send mint() with value exactly equal to quote. Never round up, never send extra.`,
      `8. Wait for the receipt. Require status 1. If 0, report the hash and stop.`,
      ``,
      `Report, short and plain:`,
      `- wallet address, free or paid, exact BNB spent, tokenId from the Minted event, tx hash, new balance.`,
      ``,
      `Hard rules:`,
      `- never ask for, print or store a private key or seed phrase.`,
      `- never spend more than 0.0003 BNB for this mint.`,
      `- never approve allowances, never call setApprovalForAll, never touch any contract other than the NFT and the registry.`,
      `- this task is mint only: do not buy, bid, list, sell or transfer.`,
      `- if any check fails, stop and name the check. Do not guess and do not retry with different values.`,
      ``,
      `Full guide: ${location.origin}/llms.txt`
    ].join("\n");
    $("agentPrompt").textContent = p;
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText($("agentPrompt").textContent);
      toast(T("btn.copyDone"));
    } catch (e) {
      const r = document.createRange();
      r.selectNodeContents($("agentPrompt"));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      toast(T("btn.copyDone"));
    }
  }

  // -------------------------------------------------------------- wallet
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  function openSheet() {
    const url = location.href.split("#")[0];
    const hasInjected = Boolean(window.ethereum);
    const opts = [
      {
        nm: T("sheet.browser"),
        nt: hasInjected ? "ready" : "—",
        fn: async () => {
          if (hasInjected) return connectInjected();
          await copyText(url);
          toast(T("sheet.noWallet"), true);
        }
      },
      {
        nm: T("sheet.wc"),
        nt: T("sheet.wcNote"),
        fn: () => connectWalletConnect()
      },
      {
        nm: T("sheet.copyLink"),
        nt: "—",
        fn: async () => {
          await copyText(url);
          toast(T("sheet.copied"));
        }
      }
    ];
    $("sheetList").innerHTML = opts
      .map((o, i) => `<div class="wrow" data-i="${i}"><span class="dot"></span><span class="nm">${o.nm}</span><span class="nt">${o.nt}</span></div>`)
      .join("");
    $("walletSheet").classList.add("open");
    $("sheetList").querySelectorAll(".wrow").forEach((el) => {
      el.onclick = async () => {
        try {
          await opts[Number(el.dataset.i)].fn();
        } catch (e) {
          const msg = String((e && (e.message || e.reason)) || "");
          if (/user rejected|rejected by user/i.test(msg)) return;
          if (/reset|closed|session/i.test(msg)) {
            toast(T("toast.wcReset"));
            return;
          }
          toast(errText(e, "connect failed"), true);
        }
      };
    });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (err) {}
      document.body.removeChild(ta);
      return true;
    }
  }

  const closeSheet = () => $("walletSheet").classList.remove("open");

  async function connectInjected() {
    if (!window.ethereum) throw new Error(T("toast.walletMissing"));
    toast(T("toast.connecting"));
    const accounts = await withTimeout(window.ethereum.request({ method: "eth_requestAccounts" }), 120000, "wallet");
    if (!accounts || !accounts.length) throw new Error(T("toast.walletMissing"));

    const provider = new ethers.BrowserProvider(window.ethereum);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== Number(CFG.chainId)) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x" + Number(CFG.chainId).toString(16) }]
        });
      } catch (e) {
        throw new Error(`switch network to ${CFG.chainName} (${CFG.chainId}) first`);
      }
    }
    const signer = await provider.getSigner();
    attach(provider, signer, accounts[0]);
    window.ethereum.on?.("accountsChanged", (accs) => {
      if (!accs || !accs.length) return detach();
      provider.getSigner().then((s) => attach(provider, s, accs[0]));
    });
    window.ethereum.on?.("chainChanged", () => location.reload());
    window.ethereum.on?.("disconnect", () => detach());
  }

  async function connectWalletConnect() {
    toast(T("toast.connecting"));
    let mod;
    try {
      mod = await withTimeout(
        import("https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.21.0/+esm"),
        20000,
        "walletconnect"
      );
    } catch (e) {
      throw new Error(T("toast.wcFail"));
    }
    const EthProvider = mod.EthereumProvider || mod.default;
    const wc = await withTimeout(
      EthProvider.init({
        projectId: CFG.wcProjectId,
        chains: [CFG.chainId],
        optionalChains: [CFG.chainId],
        showQrModal: true,
        metadata: {
          name: "Agent Bestiary",
          description: ".ai-gated specimens on BSC",
          url: location.origin,
          icons: [location.origin + "/favicon.png"]
        }
      }),
      25000,
      "walletconnect init"
    );
    wc.on("accountsChanged", (accs) => {
      const provider = new ethers.BrowserProvider(wc);
      provider.getSigner().then((s) => attach(provider, s, accs[0]));
    });
    wc.on("disconnect", () => detach());
    await wc.connect();
    const provider = new ethers.BrowserProvider(wc);
    const signer = await provider.getSigner();
    attach(provider, signer, await signer.getAddress());
  }

  function attach(provider, signer, address) {
    S.eip1193Provider = provider;
    S.signer = signer;
    S.account = ethers.getAddress(address);
    S.nft = new ethers.Contract(CFG.nft, NFT_ABI, signer);
    S.market = new ethers.Contract(CFG.market, MARKET_ABI, signer);
    const b = $("walletBtn");
    b.textContent = short(S.account);
    b.classList.add("solid");
    closeSheet();
    toast(T("toast.connected") + " " + short(S.account));
    refresh();
    renderMine();
  }

  function detach() {
    S.account = null;
    S.signer = null;
    const b = $("walletBtn");
    b.textContent = T("nav.connect");
    b.classList.remove("solid");
    $("mine").classList.add("hidden");
    refresh();
  }

  // -------------------------------------------------------------- actions
  async function mint() {
    if (!S.account) return openSheet();
    if (S.busy) return;
    S.busy = true;
    $("mintBtn").disabled = true;
    try {
      const q = await S.nft.quote(S.account);
      if (q === ethers.MaxUint256) throw new Error(T("toast.limit"));
      const agent = await S.readNft.hasAgentId(S.account);
      if (!agent) throw new Error(T("toast.needAgent"));

      // simulate first so the user never pays gas on a revert
      await S.provider.call({
        to: CFG.nft,
        from: S.account,
        data: S.nft.interface.encodeFunctionData("mint"),
        value: q
      });

      toast(T("toast.confirm"));
      const tx = await S.nft.mint({ value: q });
      await tx.wait();
      toast(T("toast.mintOk") + " " + short(tx.hash));
      await refresh();
      await loadIntakeLog();
      await renderMine();
    } catch (e) {
      toast(errText(e, T("toast.mintFail")), true);
    } finally {
      S.busy = false;
      refresh();
    }
  }

  async function ensureApproval(id) {
    const approved = await S.nft.getApproved(id);
    if (approved.toLowerCase() !== CFG.market.toLowerCase()) {
      toast(T("toast.approve"));
      await (await S.nft.approve(CFG.market, id)).wait();
    }
  }

  async function doList(id) {
    const price = prompt(T("toast.choosePrice"), "0.001");
    if (!price) return;
    const days = prompt(T("toast.chooseDays"), "7");
    if (!days) return;
    try {
      await ensureApproval(id);
      const tx = await S.market.list(id, ethers.parseEther(price), Number(days));
      await tx.wait();
      toast(T("toast.listed"));
      refresh();
    } catch (e) {
      toast(errText(e, T("toast.txErr")), true);
    }
  }

  async function doBid(id) {
    const amt = prompt(T("toast.chooseBid"), "0.001");
    if (!amt) return;
    try {
      const tx = await S.market.bid(id, { value: ethers.parseEther(amt) });
      await tx.wait();
      toast(T("toast.bidOk"));
      refresh();
    } catch (e) {
      toast(errText(e, T("toast.txErr")), true);
    }
  }

  async function doBuy(id, price) {
    try {
      const tx = await S.market.buy(id, { value: BigInt(price) });
      await tx.wait();
      toast(T("toast.bought"));
      refresh();
      renderMine();
    } catch (e) {
      toast(errText(e, T("toast.txErr")), true);
    }
  }

  async function doAccept(id) {
    try {
      await ensureApproval(id);
      const tx = await S.market.acceptBid(id);
      await tx.wait();
      toast(T("toast.sold"));
      refresh();
      renderMine();
    } catch (e) {
      toast(errText(e, T("toast.txErr")), true);
    }
  }

  async function doCancel(id) {
    try {
      await (await S.market.cancelListing(id)).wait();
      toast(T("toast.cancelled"));
      refresh();
    } catch (e) {
      toast(errText(e, T("toast.txErr")), true);
    }
  }

  // ---------------------------------------------------------------- wiring
  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return false;
    if (id === "mine") el.classList.remove("hidden");
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", "#" + id);
    return true;
  }

  function markActive(id) {
    document.querySelectorAll(".navlink").forEach((l) => l.classList.toggle("active", l.dataset.scroll === id));
  }

  const onScroll = () => {
    const anchors = ["intake", "agents", "market"];
    let current = "intake";
    for (const id of anchors) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 140) current = id;
    }
    markActive(current);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("scroll", onScroll, { passive: true, capture: true });

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-scroll]");
    if (link) {
      e.preventDefault();
      scrollToSection(link.dataset.scroll);
      markActive(link.dataset.scroll);
      return;
    }
    if (e.target.id === "walletBtn") return openSheet();
    if (e.target.id === "sheetClose" || e.target.id === "walletSheet") return closeSheet();
    if (e.target.id === "mintBtn") return mint();
    if (e.target.id === "copyPrompt") return copyPrompt();
    const chip = e.target.closest("[data-filter]");
    if (chip) {
      S.filter = chip.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((c) => c.classList.toggle("on", c === chip));
      return renderBook();
    }
    const a = e.target.closest("[data-act]");
    if (!a) return;
    const id = Number(a.dataset.id);
    const act = a.dataset.act;
    if (act === "buy") return doBuy(id, a.dataset.price);
    if (act === "list") return doList(id);
    if (act === "bid") return doBid(id);
    if (act === "accept") return doAccept(id);
    if (act === "cancel") return doCancel(id);
  });

  window.onLangChange = () => {
    buildPrompt();
    if (S.account) {
      const b = $("walletBtn");
      b.textContent = short(S.account);
    } else {
      $("walletBtn").textContent = T("nav.connect");
    }
    refresh();
    renderMine();
    loadIntakeLog();
  };

  window.addEventListener("load", boot);
})();
