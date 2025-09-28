const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DoctorRegistry", function () {
  it("should register and revoke a doctor", async function () {
    const [admin, doctor] = await ethers.getSigners();
    const doctorAddr = await doctor.getAddress();

    const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
    const registry = await DoctorRegistry.deploy();
    await registry.waitForDeployment();

    await registry.registerDoctor(doctorAddr, "Alice", "Cardiology", "cid123");
    expect(await registry.isVerified(doctorAddr)).to.be.true;

    await registry.revokeDoctor(doctorAddr);
    expect(await registry.isVerified(doctorAddr)).to.be.false;
  });

  it("should not allow duplicate registration", async function () {
    const [admin, doctor] = await ethers.getSigners();
    const doctorAddr = await doctor.getAddress();

    const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
    const registry = await DoctorRegistry.deploy();
    await registry.waitForDeployment();

    await registry.registerDoctor(doctorAddr, "Dr. Duplicate", "Pediatrics", "cidDup");
    await expect(
      registry.registerDoctor(doctorAddr, "Dr. Duplicate", "Pediatrics", "cidDup")
    ).to.be.revertedWith("Doctor already registered");
  });
});