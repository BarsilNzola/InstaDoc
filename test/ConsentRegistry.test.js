const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ConsentRegistry", function () {
  it("should create and revoke consent", async function () {
    const [patient, doctor] = await ethers.getSigners();
    const patientAddr = await patient.getAddress();
    const doctorAddr = await doctor.getAddress();

    const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
    const registry = await ConsentRegistry.deploy();
    await registry.waitForDeployment();

    const tx = await registry.createConsent(doctorAddr, "cidEncrypted");
    const receipt = await tx.wait();
    
    const event = receipt.logs.map((log) => {
      try {
        return registry.interface.parseLog(log);
      } catch {
        return null;
      }
    }).find((e) => e && e.name === "ConsentCreated");

    expect(event).to.not.be.undefined;
    const consentId = event.args.id;

    const consent = await registry.getConsent(consentId);
    expect(consent.patient).to.equal(patientAddr);
    expect(consent.active).to.be.true;

    await registry.revokeConsent(consentId);
    const revoked = await registry.getConsent(consentId);
    expect(revoked.active).to.be.false;
  });

  it("should not allow revoking consent twice", async function () {
    const [patient, doctor] = await ethers.getSigners();
    const doctorAddr = await doctor.getAddress();

    const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
    const registry = await ConsentRegistry.deploy();
    await registry.waitForDeployment();

    const tx = await registry.createConsent(doctorAddr, "cid123");
    const receipt = await tx.wait();
    
    const event = receipt.logs.map((log) => {
      try {
        return registry.interface.parseLog(log);
      } catch {
        return null;
      }
    }).find((e) => e && e.name === "ConsentCreated");

    const consentId = event.args.id;

    await registry.revokeConsent(consentId);
    await expect(registry.revokeConsent(consentId)).to.be.revertedWith("Consent already revoked");
  });
});