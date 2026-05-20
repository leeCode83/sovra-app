import {expect} from "chai";
import {ethers} from "hardhat";
import {SovraConsentEnforcer} from "../typechain-types";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";

describe("SovraConsentEnforcer", function () {
  let enforcer: SovraConsentEnforcer;
  let owner: SignerWithAddress;
  let redeemer: SignerWithAddress;
  let stranger: SignerWithAddress;

  const consentId = ethers.keccak256(ethers.toUtf8Bytes("consent-001"));
  const dataScope = "blood_pressure,heart_rate";
  const maxUses = 3;
  const futureExpiry = 2_000_000_000n; // far future
  const pastExpiry = 1_000_000n; // already expired

  let institution: string;

  function encodeTerms(
    cId: string,
    scope: string,
    expiry: bigint,
    uses: number,
    institutions: string[] = []
  ): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "string", "uint48", "uint32", "address[]"],
      [cId, scope, expiry, uses, institutions]
    );
  }

  beforeEach(async function () {
    [owner, redeemer, stranger] = await ethers.getSigners();
    institution = stranger.address; // use stranger as institution address for tests
    const Factory = await ethers.getContractFactory("SovraConsentEnforcer");
    enforcer = await Factory.deploy(owner.address);
    await enforcer.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the owner correctly", async function () {
      expect(await enforcer.owner()).to.equal(owner.address);
    });

    it("should start with no revoked consents", async function () {
      expect(await enforcer.revoked(consentId)).to.be.false;
    });
  });

  describe("revokeConsent", function () {
    it("should allow owner to revoke a consent", async function () {
      await enforcer.revokeConsent(consentId);
      expect(await enforcer.revoked(consentId)).to.be.true;
    });

    it("should emit ConsentRevoked event", async function () {
      await expect(enforcer.revokeConsent(consentId))
        .to.emit(enforcer, "ConsentRevoked")
        .withArgs(consentId);
    });

    it("should reject revocation from unauthorized address", async function () {
      await expect(
        enforcer.connect(stranger).revokeConsent(consentId)
      ).to.be.revertedWithCustomError(enforcer, "NotAuthorizedToRevoke");
    });

    it("should allow patient (consent owner) to revoke their consent", async function () {
      await enforcer.setConsentOwner(consentId, redeemer.address);
      await enforcer.connect(redeemer).revokeConsent(consentId);
      expect(await enforcer.revoked(consentId)).to.be.true;
    });

    it("should still allow owner to revoke after setting consent owner", async function () {
      await enforcer.setConsentOwner(consentId, redeemer.address);
      await enforcer.revokeConsent(consentId);
      expect(await enforcer.revoked(consentId)).to.be.true;
    });
  });

  describe("isValid", function () {
    it("should return true for a valid consent", async function () {
      expect(await enforcer.isValid(consentId)).to.be.true;
    });

    it("should return false for a revoked consent", async function () {
      await enforcer.revokeConsent(consentId);
      expect(await enforcer.isValid(consentId)).to.be.false;
    });
  });

  describe("beforeAllHook", function () {
    it("should pass for a valid consent", async function () {
      const terms = encodeTerms(consentId, dataScope, futureExpiry, maxUses);
      const result = await enforcer.beforeAllHook(terms, "0x");
      expect(result).to.equal(terms);
    });

    it("should revert for a revoked consent", async function () {
      await enforcer.revokeConsent(consentId);
      const terms = encodeTerms(consentId, dataScope, futureExpiry, maxUses);
      await expect(
        enforcer.beforeAllHook(terms, "0x")
      ).to.be.revertedWithCustomError(enforcer, "ConsentAlreadyRevoked");
    });

    it("should revert for an expired consent", async function () {
      const terms = encodeTerms(consentId, dataScope, pastExpiry, maxUses);
      await expect(
        enforcer.beforeAllHook(terms, "0x")
      ).to.be.revertedWithCustomError(enforcer, "ConsentExpired");
    });

    it("should pass for a consent with no expiry", async function () {
      const terms = encodeTerms(consentId, dataScope, 0n, maxUses);
      const result = await enforcer.beforeAllHook(terms, "0x");
      expect(result).to.equal(terms);
    });

    it("should revert for invalid terms length", async function () {
      await expect(
        enforcer.beforeAllHook("0x01", "0x")
      ).to.be.revertedWithCustomError(enforcer, "InvalidTermsLength");
    });

    it("should revert for unauthorized institution", async function () {
      const terms = encodeTerms(consentId, dataScope, futureExpiry, maxUses, [institution]);
      await expect(
        enforcer.beforeAllHook(terms, "0x")
      ).to.be.revertedWithCustomError(enforcer, "UnauthorizedInstitution");
    });

    it("should pass when institution is authorized", async function () {
      await enforcer.addInstitution(institution);
      const terms = encodeTerms(consentId, dataScope, futureExpiry, maxUses, [institution]);
      const result = await enforcer.beforeAllHook(terms, "0x");
      expect(result).to.equal(terms);
    });

    it("should pass with multiple authorized institutions", async function () {
      await enforcer.addInstitution(institution);
      await enforcer.addInstitution(owner.address);
      const terms = encodeTerms(consentId, dataScope, futureExpiry, maxUses, [
        institution,
        owner.address,
      ]);
      const result = await enforcer.beforeAllHook(terms, "0x");
      expect(result).to.equal(terms);
    });

    it("should revert if any institution in the list is unauthorized", async function () {
      await enforcer.addInstitution(institution);
      const terms = encodeTerms(consentId, dataScope, futureExpiry, maxUses, [
        institution,
        redeemer.address, // not authorized
      ]);
      await expect(
        enforcer.beforeAllHook(terms, "0x")
      ).to.be.revertedWithCustomError(enforcer, "UnauthorizedInstitution");
    });
  });

  describe("beforeHook", function () {
    it("should pass for a valid redeemer", async function () {
      const terms = encodeTerms(consentId, dataScope, futureExpiry, maxUses);
      const result = await enforcer.beforeHook(redeemer.address, terms, "0x");
      expect(ethers.AbiCoder.defaultAbiCoder().decode(["address"], result)[0]).to.equal(
        redeemer.address
      );
    });

    it("should revert for zero address redeemer", async function () {
      const terms = encodeTerms(consentId, dataScope, futureExpiry, maxUses);
      await expect(
        enforcer.beforeHook(ethers.ZeroAddress, terms, "0x")
      ).to.be.revertedWithCustomError(enforcer, "InvalidRedeemer");
    });
  });

  describe("afterHook", function () {
    it("should track usage when maxUses is set", async function () {
      const terms = encodeTerms(consentId, dataScope, futureExpiry, maxUses);
      const delegationHash = ethers.keccak256(terms);

      await enforcer.afterHook(terms, "0x");
      expect(await enforcer.usageCount(delegationHash)).to.equal(1);
    });

    it("should not track usage when maxUses is 0 (unlimited)", async function () {
      const terms = encodeTerms(consentId, dataScope, futureExpiry, 0);
      const delegationHash = ethers.keccak256(terms);

      await enforcer.afterHook(terms, "0x");
      expect(await enforcer.usageCount(delegationHash)).to.equal(0);
    });

    it("should revert when exceeding maxUses", async function () {
      const terms = encodeTerms(consentId, dataScope, futureExpiry, 1);
      await enforcer.afterHook(terms, "0x");
      await expect(
        enforcer.afterHook(terms, "0x")
      ).to.be.revertedWithCustomError(enforcer, "MaxUsesExceeded");
    });

    it("should emit DelegationUsed event", async function () {
      const terms = encodeTerms(consentId, dataScope, futureExpiry, maxUses);
      await expect(enforcer.afterHook(terms, "0x"))
        .to.emit(enforcer, "DelegationUsed")
        .withArgs(ethers.keccak256(terms), maxUses - 1);
    });
  });

  describe("afterAllHook", function () {
    it("should return empty bytes", async function () {
      const result = await enforcer.afterAllHook("0x", "0x");
      expect(result).to.equal("0x");
    });
  });

  describe("setConsentOwner", function () {
    it("should allow owner to set consent owner", async function () {
      await enforcer.setConsentOwner(consentId, redeemer.address);
      expect(await enforcer.consentOwners(consentId)).to.equal(redeemer.address);
    });

    it("should reject setConsentOwner from non-owner", async function () {
      await expect(
        enforcer.connect(stranger).setConsentOwner(consentId, redeemer.address)
      ).to.be.revertedWithCustomError(enforcer, "OwnableUnauthorizedAccount");
    });
  });

  describe("Institution Management", function () {
    it("should allow owner to add an institution", async function () {
      await enforcer.addInstitution(institution);
      expect(await enforcer.authorizedInstitutions(institution)).to.be.true;
    });

    it("should emit InstitutionAdded event", async function () {
      await expect(enforcer.addInstitution(institution))
        .to.emit(enforcer, "InstitutionAdded")
        .withArgs(institution);
    });

    it("should reject addInstitution from non-owner", async function () {
      await expect(
        enforcer.connect(stranger).addInstitution(institution)
      ).to.be.revertedWithCustomError(enforcer, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to remove an institution", async function () {
      await enforcer.addInstitution(institution);
      await enforcer.removeInstitution(institution);
      expect(await enforcer.authorizedInstitutions(institution)).to.be.false;
    });

    it("should emit InstitutionRemoved event", async function () {
      await enforcer.addInstitution(institution);
      await expect(enforcer.removeInstitution(institution))
        .to.emit(enforcer, "InstitutionRemoved")
        .withArgs(institution);
    });

    it("should reject removeInstitution from non-owner", async function () {
      await expect(
        enforcer.connect(stranger).removeInstitution(institution)
      ).to.be.revertedWithCustomError(enforcer, "OwnableUnauthorizedAccount");
    });
  });
});
