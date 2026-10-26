// Local end-to-end: deploy to a running hardhat node, seed data, write web/config.js
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

const WEB_CONFIG = path.join(__dirname, "..", "web", "config.js");

async function main() {
  const [deployer, treasury, a, b, c, d] = await ethers.getSigners();
  const R = await (await ethers.getContractFactory("MockAgentRegistry")).deploy();
  await R.waitForDeployment();
  const handles = { [a.address]: "specimen_one", [b.address]: "agent_alpha", [c.address]: "agent_beta", [d.address]: "agent_delta" };
  for (const [addr, h] of Object.entries(handles)) await R.setAgent(addr, h);

  const revealBlock = (await ethers.provider.getBlockNumber()) + 12;
  const secret = ethers.id("local-preview-secret");
  const commitment = ethers.keccak256(ethers.solidityPacked(["bytes32"], [secret]));
  const price = ethers.parseEther("0.0003");

  const B = await (await ethers.getContractFactory("AgentBestiary")).deploy(
    await R.getAddress(), treasury.address, price, revealBlock, commitment
  );
  await B.waitForDeployment();
  const M = await (await ethers.getContractFactory("BestiaryMarket")).deploy(await B.getAddress(), treasury.address);
  await M.waitForDeployment();

  const minters = [a, b, c, d];
  for (let round = 0; round < 3; round++) {
    for (const m of minters) {
      const q = await B.quote(m.address);
      await (await B.connect(m).mint({ value: q === ethers.MaxUint256 ? 0n : q })).wait();
    }
  }

  for (let i = 0; i < 15; i++) await ethers.provider.send("evm_mine", []);
  await (await B.reveal(secret)).wait();

  // seed the book: 4 asks, 3 bids
  const owners = [];
  for (let id = 1; id <= 12; id++) owners.push((await B.ownerOf(id)));
  const listPrices = ["0.0012", "0.0015", "0.002", "0.0009"];
  for (let i = 0; i < 4; i++) {
    const id = i + 1;
    const signerFor = minters.find((m) => m.address.toLowerCase() === owners[id - 1].toLowerCase());
    await (await B.connect(signerFor).approve(await M.getAddress(), id)).wait();
    await (await M.connect(signerFor).list(id, ethers.parseEther(listPrices[i]), 7)).wait();
  }
  await (await M.connect(b).bid(7, { value: ethers.parseEther("0.0008") })).wait();
  await (await M.connect(c).bid(9, { value: ethers.parseEther("0.0011") })).wait();
  await (await M.connect(d).bid(11, { value: ethers.parseEther("0.0006") })).wait();

  const nftAddr = await B.getAddress();
  const mkAddr = await M.getAddress();
  console.log("NFT   ", nftAddr);
  console.log("MARKET", mkAddr);
  console.log("minted", (await B.totalMinted()).toString(), "| listed", (await M.listedCount()).toString(), "| bids", (await M.bidCount()).toString());

  const cfg = `// DEV build (localhost hardhat node). Production values are written by scripts/deploy.js.
window.BESTIARY_CONFIG = {
  chainId: 31337,
  chainName: "Hardhat",
  rpc: "http://127.0.0.1:8545",
  explorer: "",
  registry: "${await R.getAddress()}",
  nft: "${nftAddr}",
  market: "${mkAddr}",
  wcProjectId: "5e2f89a9606073fc5f4e3713925259c7",
  launched: false
};`;
  fs.writeFileSync(WEB_CONFIG, cfg);

  const llmsPath = path.join(__dirname, "..", "web", "llms.txt");
  let llms = fs.readFileSync(llmsPath, "utf8");
  llms = llms.split("__NFT__").join(nftAddr).split("__MARKET__").join(mkAddr);
  fs.writeFileSync(llmsPath, llms);
  console.log("wrote", WEB_CONFIG);
}

main().catch((e) => { console.error(e); process.exit(1); });
