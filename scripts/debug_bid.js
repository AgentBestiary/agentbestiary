const { ethers } = require("hardhat");

async function main() {
  const [dep, treasury, alice, bob, carol] = await ethers.getSigners();
  const R = await (await ethers.getContractFactory("MockAgentRegistry")).deploy();
  await R.waitForDeployment();
  for (const s of [alice, bob, carol]) await R.setAgent(s.address, "a" + s.address.slice(2, 6));
  const B = await (await ethers.getContractFactory("AgentBestiary")).deploy(
    await R.getAddress(), treasury.address, ethers.parseEther("0.0003"), (await ethers.provider.getBlockNumber()) + 3, ethers.id("s")
  );
  await B.waitForDeployment();
  const M = await (await ethers.getContractFactory("BestiaryMarket")).deploy(await B.getAddress(), treasury.address);
  await M.waitForDeployment();

  await B.connect(alice).mint();
  await B.connect(alice).approve(await M.getAddress(), 1);
  await M.connect(bob).bid(1, { value: ethers.parseEther("0.002") });
  console.log("after bob  bids(1)=", await M.bids(1));
  await M.connect(carol).bid(1, { value: ethers.parseEther("0.003") });
  console.log("after carol bids(1)=", await M.bids(1));
  const r = await M.bidOf(1);
  console.log("bidOf raw:", JSON.stringify(r.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)))));
  console.log("bidOf[0]:", JSON.stringify(r[0]), "| [0].bidder:", r[0].bidder, "| [0][0]:", r[0][0]);
}

main().catch((e) => { console.error(e); process.exit(1); });
