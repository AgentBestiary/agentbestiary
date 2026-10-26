// Render 12 sample pieces from the contract itself into a contact sheet.
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

const OUT = path.join(__dirname, "..", "art", "preview");
const CHROME = path.join(process.env.HOME, ".cache/ms-playwright/chromium-1248/chrome-linux64/chrome");

async function main() {
  const signers = await ethers.getSigners();
  const treasury = signers[1];

  const R = await (await ethers.getContractFactory("MockAgentRegistry")).deploy();
  await R.waitForDeployment();

  const minters = signers.slice(2, 8);
  const handles = ["specimen_one", "agent_alpha", "agent_beta", "agent_gamma", "agent_delta", "agent_epsilon"];
  for (let i = 0; i < minters.length; i++) await R.setAgent(minters[i].address, handles[i]);

  const revealBlock = (await ethers.provider.getBlockNumber()) + 4;
  const secret = ethers.id("bestiary-preview");
  const commitment = ethers.keccak256(ethers.solidityPacked(["bytes32"], [secret]));
  const price = ethers.parseEther("0.0003");

  const B = await (await ethers.getContractFactory("AgentBestiary")).deploy(
    await R.getAddress(), treasury.address, price, revealBlock, commitment
  );
  await B.waitForDeployment();

  // 12 mints across 6 wallets (2 each)
  for (let round = 0; round < 2; round++) {
    for (const m of minters) {
      const q = await B.quote(m.address);
      await (await B.connect(m).mint({ value: q === ethers.MaxUint256 ? 0n : q })).wait();
    }
  }

  for (let i = 0; i < 6; i++) await ethers.provider.send("evm_mine", []);
  await (await B.reveal(secret)).wait();

  const svgs = [];
  for (let id = 1; id <= 12; id++) {
    const uri = await B.tokenURI(id);
    const json = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
    const svg = Buffer.from(json.image.split(",")[1], "base64").toString();
    fs.writeFileSync(path.join(OUT, `t${id}.svg`), svg);
    svgs.push({ id, tier: await B.tierOf(id), traits: await B.traits(id), svg });
  }

  const cells = svgs.map((s) => `
    <div class="cell">
      <div class="art">${s.svg}</div>
      <div class="meta">#${String(s.id).padStart(4, "0")} · ${s.tier} · sp${s.traits[0]} ey${s.traits[1]} hd${s.traits[2]} ex${s.traits[3]} bg${s.traits[4]}</div>
    </div>`).join("");

  const html = `<html><head><style>
    body{margin:0;background:#05060a;font-family:monospace}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:14px}
    .art svg{width:100%;height:auto;display:block;border-radius:10px}
    .meta{color:#8b95a7;font-size:13px;padding:6px 2px;letter-spacing:1px}
  </style></head><body><div class="grid">${cells}</div></body></html>`;
  fs.writeFileSync(path.join(OUT, "sheet.html"), html);

  const { execFileSync } = require("child_process");
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--window-size=1800,1560", `--screenshot=${path.join(OUT, "sheet.png")}`,
    `file://${path.join(OUT, "sheet.html")}`]);

  for (const s of svgs) console.log(`#${s.id}`, s.tier);
  console.log("sheet:", path.join(OUT, "sheet.png"));
}

main().catch((e) => { console.error(e); process.exit(1); });
