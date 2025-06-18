import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { keccak256, encodePacked } from "viem";
import { getBalance, getBlockTimestamp, impersonate, increaseTime, paramsDefault } from "./utils";

describe("ERC4908", function () {
  async function deployERC4908ExampleFixture() {

    const [wallet, ...wallets] = await hre.viem.getWalletClients();
    const erc4908Example = await hre.viem.deployContract("Example", []);
    
    return {
      wallet,
      wallets,
      erc4908Example
    };
  }

  describe("Author actions", function () {
    it("Should set access", async function () {

      /* Arrange */

      const { erc4908Example, wallet, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const [Alice] = wallets;
      const coOwner = Alice.account.address;
      const { resourceId, price, expirationDuration, splitFee } = paramsDefault;

      const expectedHash = keccak256(encodePacked(
        ['address', 'string'],
        [wallet.account.address, resourceId]
      ));

      /* Act */

      await erc4908Example.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);
      const access = await erc4908Example.read.accessControl([expectedHash]);

      /* Assert */

      expect(access[0]).to.equal(resourceId);
      expect(access[1]).to.equal(price);
      expect(access[2]).to.equal(expirationDuration);
      expect(access[3].toLowerCase()).to.equal(coOwner.toLowerCase());

    });

    it("Should check if access exists using hash", async function () {

      /* Arrange */

      const { erc4908Example, wallet, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const [Alice] = wallets;
      const coOwner = Alice.account.address;
      const { resourceId, price, expirationDuration, splitFee } = paramsDefault;

      const expectedHash = keccak256(encodePacked(
        ['address', 'string'],
        [wallet.account.address, resourceId]
      ));

      /* Act */

      const before = await erc4908Example.read.existAccess([expectedHash]);
      await erc4908Example.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);
      const after = await erc4908Example.read.existAccess([expectedHash]);

      /* Assert */

      expect(before).to.equal(false);
      expect(after).to.equal(true);
    });

    it("Should check if access exists using author + resourceId", async function () {

      /* Arrange */

      const { erc4908Example, wallet, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const [Alice] = wallets;
      const coOwner = Alice.account.address;
      const { resourceId, price, expirationDuration, splitFee } = paramsDefault;

      /* Act */

      const before = await erc4908Example.read.existAccess([wallet.account.address, resourceId]);
      await erc4908Example.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);
      const after = await erc4908Example.read.existAccess([wallet.account.address, resourceId]);

      /* Assert */

      expect(before).to.equal(false);
      expect(after).to.equal(true);
    });

    it("Should delete access", async function () {

      /* Arrange */
      
      const { erc4908Example, wallet, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const [Alice] = wallets;
      const coOwner = Alice.account.address;
      const { resourceId, price, expirationDuration, splitFee } = paramsDefault;
      
      const expectedHash = keccak256(encodePacked(
        ['address', 'string'],
        [wallet.account.address, resourceId]
      ));

      await erc4908Example.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);

      /* Act */

      const before = {
        exists: await erc4908Example.read.existAccess([expectedHash]),
        settings: await erc4908Example.read.accessControl([expectedHash])
      };
      await erc4908Example.write.delAccess([resourceId]);
      const after = { 
        exists: await erc4908Example.read.existAccess([expectedHash]),
        settings: await erc4908Example.read.accessControl([expectedHash])
      };

      /* Assert */

      expect(before.exists).to.equal(true);
      expect(after.exists).to.equal(false);
      // Check if all settings are reset
      expect(before.settings[0]).to.equal(resourceId);
      expect(before.settings[1]).to.equal(price);
      expect(before.settings[2]).to.equal(expirationDuration);
      expect(before.settings[3].toLowerCase()).to.equal(coOwner.toLowerCase());
      expect(before.settings[4]).to.equal(splitFee);
      expect(after.settings[0]).to.equal("");
      expect(after.settings[1]).to.equal(0n);
      expect(after.settings[2]).to.equal(0);
      expect(after.settings[3]).to.equal("0x0000000000000000000000000000000000000000");
      expect(after.settings[4]).to.equal(0);
    });
  });

  describe("Access minting", function () {
    it("Should get access control values", async function () {

      /* Arrange */

      const { erc4908Example, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const { resourceId, price, expirationDuration, splitFee } = paramsDefault;
      const [Alice, Bob, Ana ] = wallets;
      const coOwner = Ana.account.address;
      let alice = await impersonate(erc4908Example, Alice);
      let bob = await impersonate(erc4908Example, Bob);

      await alice.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);

      /* Act */

      const accessControl = await bob.read.getAccessControl([Alice.account.address ,resourceId]);

      /* Assert */

      expect(accessControl[0]).to.equal(price);
      expect(accessControl[1]).to.equal(expirationDuration);
    });

    it("Should test if NFT minting is available", async function () {

      /* Arrange */

      const { erc4908Example, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const { resourceId, price, expirationDuration, splitFee } = paramsDefault;
      const [Alice, Bob, Ana] = wallets;
      const coOwner = Ana.account.address;

      let alice = await impersonate(erc4908Example, Alice);
      let bob = await impersonate(erc4908Example, Bob);

      await alice.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);

      /* Act */

      const mintUnavailableContent = alice.write.mint([
        Bob.account.address, 
        resourceId, 
        Alice.account.address
      ], { value: price })

      const mintAvailableContent = bob.write.mint([
        Alice.account.address,
        resourceId,
        Bob.account.address
      ], { value: price })

      /* Assert */
      
      await expect(mintUnavailableContent).to.be.rejectedWith(
        'MintUnavailable("0x64b7b2d2900f927ae778f84917c8327d63cbb08f59126c14ead77f45b28ab7dd")'
      );  
      await expect(mintAvailableContent).to.be.fulfilled; 
    });

    // it("Should check if the expected NFT price is met", async function () {
      
    //   /* Arrange */

    //   const { erc4908Example, wallets } = await loadFixture(deployERC4908ExampleFixture);
    //   const { resourceId, price, expirationDuration, splitFee } = paramsDefault;
    //   const [Alice, Bob, Ana] = wallets;
    //   const coOwner = Ana.account.address;

    //   let alice = await impersonate(erc4908Example, Alice);
    //   let bob = await impersonate(erc4908Example, Bob);

    //   await alice.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);

    //   /* Act */
      
    //   const mintInsufficientFunds = bob.write.mint([
    //     Alice.account.address,
    //     resourceId,
    //     Bob.account.address
    //   ], { value: price - 1n })

    //   const mintSufficientFunds = bob.write.mint([
    //     Alice.account.address,
    //     resourceId,
    //     Bob.account.address
    //   ], { value: price })


    //   /* Assert */

    //   await expect(mintInsufficientFunds).to.be.rejectedWith(
    //     'InsufficientFunds(2)'
    //   );
    //   await expect(mintSufficientFunds).to.be.fulfilled;
    // });

    // it("Should transfer the mint price to the author", async function () {

    //   /* Arrange */

    //   const { erc4908Example, wallets } = await loadFixture(deployERC4908ExampleFixture);
    //   const { resourceId, price, expirationDuration, splitFee } = paramsDefault;
    //   const [Alice, Bob, Ana] = wallets;
    //   const coOwner = Ana.account.address;

    //   let alice = await impersonate(erc4908Example, Alice);
    //   let bob = await impersonate(erc4908Example, Bob);

    //   /* Act */
      
    //   await alice.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);
    //   const balanceAliceBefore = await getBalance(Alice.account.address);
    //   const balanceBobBefore = await getBalance(Bob.account.address);
    //   await bob.write.mint([Alice.account.address, resourceId, Bob.account.address], { value: price });
    //   const balanceAliceAfter = await getBalance(Alice.account.address);
    //   const balanceBobAfter = await getBalance(Bob.account.address);

    //   /* Assert */
      
    //   expect(balanceAliceAfter).to.equal(balanceAliceBefore + price);
    //   expect(Number(balanceBobAfter)).to.lessThanOrEqual(Number(balanceBobBefore - price));
    // });
  });

  describe("Resources access check", function () {
    it("Should have access", async function () {
      
      /* Arrange */
      
      const { erc4908Example, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const { resourceId, price, expirationDuration, splitFee } = paramsDefault;
      const [Alice, Bob, Ana] = wallets;
      const coOwner = Ana.account.address;

      let alice = await impersonate(erc4908Example, Alice);
      let bob = await impersonate(erc4908Example, Bob);

      await alice.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);

      /* Act */
      
      const [hasAccessBeforeMint, messageBeforeMint, expirationTimeBeforeMint] = await erc4908Example.read.hasAccess([Alice.account.address, resourceId, Bob.account.address]);
      
      await bob.write.mint([Alice.account.address, resourceId, Bob.account.address], { value: price });
      const mintTime = await getBlockTimestamp();

      const [hasAccessAfterMint, messageAfterMint, expirationTimeAfterMint] = await erc4908Example.read.hasAccess([Alice.account.address, resourceId, Bob.account.address]);

      /* Assert */
      
      expect(hasAccessBeforeMint).to.equal(false);
      expect(messageBeforeMint).to.equal("user doesn't own the NFT");
      expect(expirationTimeBeforeMint).to.equal(-1);

      expect(hasAccessAfterMint).to.equal(true);
      expect(messageAfterMint).to.equal("access granted");
      expect(expirationTimeAfterMint).to.equal(mintTime + expirationDuration);
    });

    it("Should not have access", async function () {
      /* Arrange */
      const { erc4908Example, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const [Alice, Bob, Charlie, Ana] = wallets;
      const { resourceId, price, expirationDuration, splitFee } = paramsDefault;
      const coOwner = Ana.account.address;

      let alice = await impersonate(erc4908Example, Alice);
      let bob = await impersonate(erc4908Example, Bob);

      await alice.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);

      /* Act */
      await bob.write.mint([Alice.account.address, resourceId, Bob.account.address], { value: price });
      const [hasAccessCharlie, messageCharlie] = await erc4908Example.read.hasAccess([Alice.account.address, resourceId, Charlie.account.address]);

      /* Assert */
      expect(hasAccessCharlie).to.equal(false);
      expect(messageCharlie).to.equal("user doesn't own the NFT");
    });

    it("Should detect expired access", async function () {
      /* Arrange */
      const { erc4908Example, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const [Alice, Bob, Ana] = wallets;
      const { resourceId, price, expirationDuration, splitFee } = paramsDefault;
      const coOwner = Ana.account.address;

      let alice = await impersonate(erc4908Example, Alice);
      let bob = await impersonate(erc4908Example, Bob);
      await alice.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);

      /* Act */
      await bob.write.mint([Alice.account.address, resourceId, Bob.account.address], { value: price });
      await increaseTime(1)
      const [hasAccessBeforeExpiration, messageBeforeExpiration] = await erc4908Example.read.hasAccess([Alice.account.address, resourceId, Bob.account.address])
      await increaseTime(3)
      const [hasAccessAfterExpiration, messageAfterExpiration] = await erc4908Example.read.hasAccess([Alice.account.address, resourceId, Bob.account.address]);

      /* Assert */
      expect(hasAccessBeforeExpiration).to.equal(true);
      expect(messageBeforeExpiration).to.equal("access granted");
      expect(hasAccessAfterExpiration).to.equal(false);
      expect(messageAfterExpiration).to.equal("access is expired");
    });

    it("Should allow access if at least one NFT is not expired", async function () {
      /* Arrange */
      const { erc4908Example, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const [Alice, Bob, Ana] = wallets;
      const { resourceId, price, expirationDuration, splitFee } = paramsDefault;
      const coOwner = Ana.account.address;

      let alice = await impersonate(erc4908Example, Alice);
      let bob = await impersonate(erc4908Example, Bob);
      await alice.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);

      /* Act */
      await bob.write.mint([Alice.account.address, resourceId, Bob.account.address], { value: price });
      await increaseTime(1)
      await bob.write.mint([Alice.account.address, resourceId, Bob.account.address], { value: price });
      await increaseTime(3)
      const [hasAccess, _] = await erc4908Example.read.hasAccess([Alice.account.address, resourceId, Bob.account.address]);

      expect(hasAccess).to.equal(true);
    });
  });

  describe("Interface support", function () {
    it("Should support ERC4908 interface", async function () {
      /* Arrange */
      const { erc4908Example } = await loadFixture(deployERC4908ExampleFixture);
      
      // Calculate interface ID from function selectors
      const functionSelectors = [
        "setAccess(string,uint256,uint32,address,uint32)",
        "delAccess(string)",
        "hasAccess(address,string,address)",
        "existAccess(bytes32)",
        "existAccess(address,string)",
        "getAccessControl(address,string)",
        "mint(address,string,address)"
      ].map(sig => keccak256(encodePacked(['string'], [sig])).slice(0, 10));

      // XOR all function selectors to get interface ID
      let interfaceIdBN = BigInt(functionSelectors[0]);
      for (let i = 1; i < functionSelectors.length; i++) {
        interfaceIdBN ^= BigInt(functionSelectors[i]);
      }
      const INTERFACE_ID_ERC4908 = `0x${interfaceIdBN.toString(16).padStart(8, '0')}` as `0x${string}`;

      /* Act */
      const supportsERC4908 = await erc4908Example.read.supportsInterface([INTERFACE_ID_ERC4908]);

      /* Assert */
      expect(supportsERC4908).to.equal(true);
    });

    it("Should support ERC721 and ERC721Enumerable interfaces", async function () {
      /* Arrange */
      const { erc4908Example } = await loadFixture(deployERC4908ExampleFixture);
      const INTERFACE_ID_ERC721 = "0x80ac58cd";
      const INTERFACE_ID_ERC721_ENUMERABLE = "0x780e9d63";

      /* Act */
      const supportsERC721 = await erc4908Example.read.supportsInterface([INTERFACE_ID_ERC721]);
      const supportsERC721Enumerable = await erc4908Example.read.supportsInterface([INTERFACE_ID_ERC721_ENUMERABLE]);

      /* Assert */
      expect(supportsERC721).to.equal(true);
      expect(supportsERC721Enumerable).to.equal(true);
    });

    it("Should not support unsupported interfaces", async function () {
      /* Arrange */
      const { erc4908Example } = await loadFixture(deployERC4908ExampleFixture);
      const UNSUPPORTED_INTERFACE = "0x12345678";

      /* Act */
      const supportsUnsupported = await erc4908Example.read.supportsInterface([UNSUPPORTED_INTERFACE]);

      /* Assert */
      expect(supportsUnsupported).to.equal(false);
    });
  });

  describe("Edge cases", function () {
    it("Should handle zero price minting", async function () {
      /* Arrange */
      const { erc4908Example, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const [Alice, Bob, Ana] = wallets;
      const resourceId = "test-resource";
      const price = 0n;
      const expirationDuration = 3600;
      const splitFee = 0;
      const coOwner = Ana.account.address;

      let alice = await impersonate(erc4908Example, Alice);
      let bob = await impersonate(erc4908Example, Bob);

      /* Act */
      await alice.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);
      await bob.write.mint([Alice.account.address, resourceId, Bob.account.address], { value: price });

      /* Assert */
      const [hasAccess] = await erc4908Example.read.hasAccess([Alice.account.address, resourceId, Bob.account.address]);
      expect(hasAccess).to.equal(true);
    });

    it("Should not allow empty resourceId", async function () {
      /* Arrange */
      const { erc4908Example, wallet, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const [Ana] = wallets;
      const resourceId = "";
      const price = 1n;
      const expirationDuration = 3600;
      const splitFee = 0;
      const coOwner = Ana.account.address;

      /* Act */
      await erc4908Example.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);

      /* Assert */
      const exists = await erc4908Example.read.existAccess([wallet.account.address, resourceId]);
      expect(exists).to.equal(false);
    });

    it("Should handle large expiration duration", async function () {
      /* Arrange */
      const { erc4908Example, wallets } = await loadFixture(deployERC4908ExampleFixture);
      const [Alice, Bob, Ana] = wallets;
      const resourceId = "test-resource";
      const price = 1n;
      const expirationDuration = 0x7FFFFFFF; // Large but safe uint32 value
      const splitFee = 0;
      const coOwner = Ana.account.address;

      let alice = await impersonate(erc4908Example, Alice);
      let bob = await impersonate(erc4908Example, Bob);

      /* Act */
      await alice.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee]);
      await bob.write.mint([Alice.account.address, resourceId, Bob.account.address], { value: price });

      /* Assert */
      const [hasAccess] = await erc4908Example.read.hasAccess([Alice.account.address, resourceId, Bob.account.address]);
      expect(hasAccess).to.equal(true);
    });
  });
});
