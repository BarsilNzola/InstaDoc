import { expect } from "chai";
import { ethers } from "hardhat";

describe("PatientRecords", function () {
	it("should allow a doctor to add records for a patient", async () => {
		const [doctor, patient] = await ethers.getSigners();
		const PatientRecords = await ethers.getContractFactory("PatientRecords");
		const records = await PatientRecords.deploy();
		await records.deployed();

		await records.connect(doctor).addRecord(patient.address, "Flu diagnosis", "ipfs123");
		const stored = await records.getRecords(patient.address);

		expect(stored.length).to.equal(1);
		expect(stored[0].doctor).to.equal(doctor.address);
		expect(stored[0].description).to.equal("Flu diagnosis");
	});
});