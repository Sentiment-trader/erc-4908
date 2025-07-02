import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { keccak256, encodePacked } from "viem";
import { paramsDefault } from "./utils";

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

      const { erc4908Example, wallet } = await loadFixture(deployERC4908ExampleFixture);
      const { resourceId, price, expirationDuration, coOwner, splitFee } = paramsDefault;

      const expectedHash = keccak256(encodePacked(
        ['address', 'string'],
        [wallet.account.address, resourceId]
      ));

      /* Act */

      await erc4908Example.write.setAccess([resourceId, price, expirationDuration, coOwner, splitFee])
      const access = await erc4908Example.read.accessControl([expectedHash]);

      /* Assert */

      expect(access[0]).to.equal(resourceId);
      expect(access[1]).to.equal(price);
      expect(access[2]).to.equal(expirationDuration);
      expect(access[3]).to.equal(coOwner);
      expect(access[4]).to.equal(splitFee)
    });

    it("Should check if access exists using hash", async function () {

      /* Arrange */

      const { erc4908Example, wallet } = await loadFixture(deployERC4908ExampleFixture);
      const { resourceId, price, expirationDuration, coOwner, splitFee } = paramsDefault;

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

      const { erc4908Example, wallet } = await loadFixture(deployERC4908ExampleFixture);
      const { resourceId, price, expirationDuration, coOwner, splitFee } = paramsDefault;

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
      
      const { erc4908Example, wallet } = await loadFixture(deployERC4908ExampleFixture);
      const { resourceId, price, expirationDuration, coOwner, splitFee } = paramsDefault;
      
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
      expect(after.settings[0]).to.equal("");
      expect(after.settings[1]).to.equal(0n);
      expect(after.settings[2]).to.equal(0);
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
        "getAccessControl(address,string)"
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
    it("Should not allow empty resourceId", async function () {
      /* Arrange */
      const { erc4908Example, wallet } = await loadFixture(deployERC4908ExampleFixture);
      const resourceId = "";
      const price = 1n;
      const expirationDuration = 3600;

      /* Act */
      await erc4908Example.write.setAccess([resourceId, price, expirationDuration, wallet.account.address, 0]);

      /* Assert */
      const exists = await erc4908Example.read.existAccess([wallet.account.address, resourceId]);
      expect(exists).to.equal(false);
    });
  });
});
