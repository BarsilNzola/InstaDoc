import { expect } from "chai";
import { ethers } from "hardhat";

describe("DoctorRegistry", function () {
	it("should register and revoke a doctor", async () => {
		const [admin, doctor] = await ethers.getSigners();
		const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
		const registry = await DoctorRegistry.deploy();
		await registry.deployed();

		await registry.registerDoctor(doctor.address, "Alice", "Cardiology", "cid123");
		expect(await registry.isVerified(doctor.address)).to.be.true;

		await registry.revokeDoctor(doctor.address);
		expect(await registry.isVerified(doctor.address)).to.be.false;
	});
});