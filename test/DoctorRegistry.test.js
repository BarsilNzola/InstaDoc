const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DoctorRegistry", function () {
  let registry, admin, doctor1, doctor2;

  beforeEach(async function () {
    [admin, doctor1, doctor2] = await ethers.getSigners();
    const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
    registry = await DoctorRegistry.deploy();
    await registry.waitForDeployment();
  });

  it("should register and revoke a doctor", async function () {
    const doctorAddr = await doctor1.getAddress();

    await registry.registerDoctor(doctorAddr, "Alice", "Cardiology", "cid123");
    expect(await registry.isVerified(doctorAddr)).to.be.true;

    await registry.revokeDoctor(doctorAddr);
    expect(await registry.isVerified(doctorAddr)).to.be.false;
  });

  it("should not allow duplicate registration", async function () {
    const doctorAddr = await doctor1.getAddress();

    await registry.registerDoctor(doctorAddr, "Dr. Duplicate", "Pediatrics", "cidDup");
    await expect(
      registry.registerDoctor(doctorAddr, "Dr. Duplicate", "Pediatrics", "cidDup")
    ).to.be.revertedWith("Doctor already registered");
  });

  it("should return all verified doctors", async function () {
    const doctor1Addr = await doctor1.getAddress();
    const doctor2Addr = await doctor2.getAddress();

    // Register two doctors
    await registry.registerDoctor(doctor1Addr, "Dr. One", "Cardiology", "cid1");
    await registry.registerDoctor(doctor2Addr, "Dr. Two", "Pediatrics", "cid2");

    const verifiedDoctors = await registry.getAllVerifiedDoctors();
    expect(verifiedDoctors).to.have.lengthOf(2);
    expect(verifiedDoctors).to.include(doctor1Addr);
    expect(verifiedDoctors).to.include(doctor2Addr);
  });

  it("should only return verified doctors after revocation", async function () {
    const doctor1Addr = await doctor1.getAddress();
    const doctor2Addr = await doctor2.getAddress();

    // Register two doctors
    await registry.registerDoctor(doctor1Addr, "Dr. One", "Cardiology", "cid1");
    await registry.registerDoctor(doctor2Addr, "Dr. Two", "Pediatrics", "cid2");

    // Verify both are in the list initially
    let verifiedDoctors = await registry.getAllVerifiedDoctors();
    expect(verifiedDoctors).to.have.lengthOf(2);

    // Revoke one doctor
    await registry.revokeDoctor(doctor1Addr);

    // Check that only the verified doctor remains
    verifiedDoctors = await registry.getAllVerifiedDoctors();
    expect(verifiedDoctors).to.have.lengthOf(1);
    expect(verifiedDoctors).to.include(doctor2Addr);
    expect(verifiedDoctors).to.not.include(doctor1Addr);

    // Double-check individual verification status
    expect(await registry.isVerified(doctor1Addr)).to.be.false;
    expect(await registry.isVerified(doctor2Addr)).to.be.true;
  });

  it("should return empty array when no verified doctors", async function () {
    const verifiedDoctors = await registry.getAllVerifiedDoctors();
    expect(verifiedDoctors).to.have.lengthOf(0);
  });

  it("should get doctor details", async function () {
    const doctorAddr = await doctor1.getAddress();

    await registry.registerDoctor(doctorAddr, "Dr. Test", "Neurology", "testCid");

    const details = await registry.getDoctorDetails(doctorAddr);
    expect(details.name).to.equal("Dr. Test");
    expect(details.specialization).to.equal("Neurology");
    expect(details.profileCID).to.equal("testCid");
    expect(details.verified).to.be.true;
  });

  it("should return empty details for non-existent doctor", async function () {
    const doctorAddr = await doctor1.getAddress();

    const details = await registry.getDoctorDetails(doctorAddr);
    expect(details.name).to.equal("");
    expect(details.specialization).to.equal("");
    expect(details.profileCID).to.equal("");
    expect(details.verified).to.be.false;
  });

  // Verify revocation prevents re-revocation
  it("should not allow revoking already revoked doctor", async function () {
    const doctorAddr = await doctor1.getAddress();

    await registry.registerDoctor(doctorAddr, "Dr. Revoke", "Dermatology", "cidRev");
    await registry.revokeDoctor(doctorAddr);
    
    await expect(registry.revokeDoctor(doctorAddr)).to.be.revertedWith("Doctor not registered or already revoked");
  });
});