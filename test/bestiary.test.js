const { expect } = require("chai");
const { ethers } = require("hardhat");

const PRICE = ethers.parseEther("0.0003");
const FREE_QUOTA = 500;

async function deployAll() {
  const [deployer, treasury, alice, bob, carol, dave] = await ethers.getSigners();

  const MockRegistry = await ethers.getContractFactory("MockAgentRegistry");
  const registry = await MockRegistry.deploy();
  await registry.waitForDeployment();

  for (const s of [alice, bob, carol, dave, deployer]) {
    await registry.setAgent(s.address, `agent-${s.address.slice(2, 6)}`);
  }

  const revealBlock = (await ethers.provider.getBlockNumber()) + 5;
  const secret = ethers.id("test-secret-1");
  const commitment = ethers.keccak256(
    ethers.solidityPacked(["bytes32"], [secret])
  );

  const Bestiary = await ethers.getContractFactory("AgentBestiary");
  const nft = await Bestiary.deploy(
    await registry.getAddress(),
    treasury.address,
    PRICE,
    revealBlock,
    commitment
  );
  await nft.waitForDeployment();

  const Market = await ethers.getContractFactory("BestiaryMarket");
  const market = await Market.deploy(await nft.getAddress(), treasury.address);
  await market.waitForDeployment();

  return { deployer, treasury, alice, bob, carol, dave, registry, nft, market, revealBlock, secret };
}

describe("AgentBestiary", function () {
  it("blocks wallets without an Agent ID", async function () {
    const { nft, alice, registry } = await deployAll();
    await registry.setAgent(alice.address, "");
    await expect(nft.connect(alice).mint()).to.be.revertedWith("No Agent ID");
  });

  it("first piece is free, second costs the price", async function () {
    const { nft, treasury, alice } = await deployAll();
    await expect(nft.connect(alice).mint()).to.emit(nft, "Minted");
    expect(await nft.mintedBy(alice.address)).to.equal(1);

    const before = await ethers.provider.getBalance(treasury.address);
    await nft.connect(alice).mint({ value: PRICE });
    expect(await ethers.provider.getBalance(treasury.address)).to.equal(before + PRICE);
  });

  it("enforces max 5 per wallet", async function () {
    const { nft, alice } = await deployAll();
    await nft.connect(alice).mint();
    await nft.connect(alice).mint({ value: PRICE });
    await nft.connect(alice).mint({ value: PRICE });
    await nft.connect(alice).mint({ value: PRICE });
    await nft.connect(alice).mint({ value: PRICE });
    await expect(nft.connect(alice).mint({ value: PRICE })).to.be.revertedWith("Wallet limit");
  });

  it("refunds overpayment", async function () {
    const { nft, alice } = await deployAll();
    await nft.connect(alice).mint();
    const balBefore = await ethers.provider.getBalance(alice.address);
    const tx = await nft.connect(alice).mint({ value: PRICE * 3n });
    const rc = await tx.wait();
    const gas = rc.gasUsed * rc.gasPrice;
    const balAfter = await ethers.provider.getBalance(alice.address);
    expect(balBefore - balAfter).to.equal(PRICE + gas);
    expect(rc.status).to.equal(1);
  });

  it("records the .ai handle on the piece", async function () {
    const { nft, alice, registry } = await deployAll();
    await registry.setAgent(alice.address, "specimen_one");
    await nft.connect(alice).mint();
    const uri = await nft.tokenURI(1);
    const json = JSON.parse(
      Buffer.from(uri.split(",")[1], "base64").toString()
    );
    expect(JSON.stringify(json.attributes)).to.include("specimen_one");
    expect(json.attributes.find((a) => a.trait_type === "State").value).to.equal("Sealed");
  });

  it("reveal only after the target block, only with the right secret", async function () {
    const { nft, secret, revealBlock } = await deployAll();
    const wrong = ethers.id("nope");
    await expect(nft.reveal(wrong)).to.be.revertedWith("Too early");

    for (let i = 0; i < 7; i++) await ethers.provider.send("evm_mine", []);
    await expect(nft.reveal(wrong)).to.be.revertedWith("Bad secret");

    await expect(nft.reveal(secret)).to.emit(nft, "Revealed");
    expect(await nft.revealed()).to.equal(true);
    await expect(nft.reveal(secret)).to.be.revertedWith("Already revealed");
    expect(await ethers.provider.getBlockNumber()).to.be.greaterThan(revealBlock);
  });

  it("traits become readable and stable after reveal", async function () {
    const { nft, alice, secret } = await deployAll();
    await nft.connect(alice).mint();
    for (let i = 0; i < 7; i++) await ethers.provider.send("evm_mine", []);
    await nft.reveal(secret);

    const t1 = await nft.traits(1);
    const t2 = await nft.traits(1);
    expect(t1[0]).to.equal(t2[0]);
    expect(await nft.tierOf(1)).to.be.oneOf([
      "Common", "Uncommon", "Rare", "Epic", "Legendary",
    ]);
  });
});

describe("BestiaryMarket", function () {
  async function withMinted() {
    const ctx = await deployAll();
    const { nft, alice, bob, market } = ctx;
    await nft.connect(alice).mint(); // #1
    await nft.connect(alice).approve(await market.getAddress(), 1);
    return ctx;
  }

  it("lists and sells with 2% fee to treasury", async function () {
    const { nft, market, treasury, alice, bob } = await withMinted();
    const price = ethers.parseEther("0.001");
    await market.connect(alice).list(1, price, 7);

    const tBefore = await ethers.provider.getBalance(treasury.address);
    await market.connect(bob).buy(1, { value: price });

    expect(await nft.ownerOf(1)).to.equal(bob.address);
    const fee = (price * 200n) / 10000n;
    expect(await ethers.provider.getBalance(treasury.address)).to.equal(tBefore + fee);
  });

  it("rejects wrong payment and unapproved listings", async function () {
    const { market, alice, bob } = await withMinted();
    await expect(market.connect(alice).list(1, ethers.parseEther("0.001"), 7)).to.not.be.reverted;
    await expect(market.connect(bob).buy(1, { value: ethers.parseEther("0.0005") }))
      .to.be.revertedWith("Wrong value");
  });

  it("accepts a bid: seller gets paid in the same tx", async function () {
    const { nft, market, alice, bob, treasury } = await withMinted();
    const amount = ethers.parseEther("0.002");
    await market.connect(bob).bid(1, { value: amount });
    expect((await market.bidOf(1))[1]).to.equal(true);

    const tBefore = await ethers.provider.getBalance(treasury.address);
    await market.connect(alice).acceptBid(1);

    expect(await nft.ownerOf(1)).to.equal(bob.address);
    const fee = (amount * 200n) / 10000n;
    expect(await ethers.provider.getBalance(treasury.address)).to.equal(tBefore + fee);
  });

  it("refunds an outbid bidder and a cancelled bid", async function () {
    const { market, alice, bob, carol } = await withMinted();
    await market.connect(bob).bid(1, { value: ethers.parseEther("0.002") });
    await market.connect(carol).bid(1, { value: ethers.parseEther("0.003") });

    const bid = await market.bids(1);
    expect(bid[0]).to.equal(carol.address);
    expect((await market.bidOf(1))[1]).to.equal(true);

    const before = await ethers.provider.getBalance(carol.address);
    await market.connect(carol).cancelBid(1);
    const after = await ethers.provider.getBalance(carol.address);
    expect(after).to.be.greaterThan(before);
  });

  it("blocks a bid from the owner and a second listing after sale", async function () {
    const { nft, market, alice, bob } = await withMinted();
    await expect(market.connect(alice).bid(1, { value: ethers.parseEther("0.002") }))
      .to.be.revertedWith("Owner cannot bid");

    await market.connect(alice).list(1, ethers.parseEther("0.001"), 7);
    await market.connect(bob).buy(1, { value: ethers.parseEther("0.001") });
    await expect(market.connect(bob).buy(1, { value: ethers.parseEther("0.001") }))
      .to.be.revertedWith("Not listed");
  });
});
