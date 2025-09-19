import { expect } from "chai";
import { ethers } from "hardhat";

describe("ConsentRegistry", function () {
	it("should create and revoke consent", async () => {
		const [patient, doctor] = await ethers.getSigners();
		const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
		const registry = await ConsentRegistry.deploy();
		await registry.deployed();

		const tx = await registry.connect(patient).createConsent(doctor.address, "cidEncrypted");
		const receipt = await tx.wait();
		const event = receipt.events?.find((e: any) => e.event === "ConsentCreated");
		const consentId = event?.args?.id;

		const consent = await registry.getConsent(consentId);
		expect(consent.patient).to.equal(patient.address);
		expect(consent.active).to.be.true;

		await registry.connect(patient).revokeConsent(consentId);
		const revoked = await registry.getConsent(consentId);
		expect(revoked.active).to.be.false;
	});
});