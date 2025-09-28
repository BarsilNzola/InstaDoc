const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PatientRecords", function () {
  it("should allow a doctor to add records for a patient", async function () {
    const [doctor, patient] = await ethers.getSigners();

    const PatientRecordsFactory = await ethers.getContractFactory("PatientRecords");
    const records = await PatientRecordsFactory.deploy();
    await records.waitForDeployment();

    // Updated: Pass the doctor address as the first parameter
    await records.addRecord(patient.address, doctor.address, "Flu diagnosis", "ipfs123", false);

    const stored = await records.getRecords(patient.address);
    expect(stored.length).to.equal(1);
    expect(stored[0].doctor).to.equal(doctor.address);
    expect(stored[0].description).to.equal("Flu diagnosis");
  });
});