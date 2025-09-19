import { expect } from "chai";
import { ethers } from "hardhat";

describe("InstaDocHub Integration", function () {
  it("should allow patient registration, consent, and doctor record writing", async () => {
    const [admin, doctor, patient] = await ethers.getSigners();

    const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
    const doctorRegistry = await DoctorRegistry.deploy();
    await doctorRegistry.deployed();

    const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
    const consentRegistry = await ConsentRegistry.deploy();
    await consentRegistry.deployed();

    const EscrowPayments = await ethers.getContractFactory("EscrowPayments");
    const escrow = await EscrowPayments.deploy();
    await escrow.deployed();

    const PatientRecords = await ethers.getContractFactory("PatientRecords");
    const records = await PatientRecords.deploy();
    await records.deployed();

    const InstaDocHub = await ethers.getContractFactory("InstaDocHub");
    const hub = await InstaDocHub.deploy(
      doctorRegistry.address,
      consentRegistry.address,
      escrow.address,
      records.address
    );
    await hub.deployed();

    // Register doctor
    await doctorRegistry.registerDoctor(doctor.address, "Dr. Smith", "General", "cid1");

    // Register patient
    await hub.connect(patient).registerPatient();

    // Patient gives consent
    await consentRegistry.connect(patient).createConsent(doctor.address, "encryptedCid");

    // Doctor adds record
    await hub.connect(doctor).addRecordForPatient(patient.address, "Checkup", "ipfsCheckup");

    // Patient retrieves records
    const patientRecords = await hub.connect(patient).viewMyRecords();
    expect(patientRecords.length).to.equal(1);
    expect(patientRecords[0].description).to.equal("Checkup");
    expect(patientRecords[0].doctor).to.equal(doctor.address);
  });

  it("should fail if doctor tries to add record without consent", async () => {
    const [admin, doctor, patient] = await ethers.getSigners();

    const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
    const doctorRegistry = await DoctorRegistry.deploy();
    await doctorRegistry.deployed();

    const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
    const consentRegistry = await ConsentRegistry.deploy();
    await consentRegistry.deployed();

    const EscrowPayments = await ethers.getContractFactory("EscrowPayments");
    const escrow = await EscrowPayments.deploy();
    await escrow.deployed();

    const PatientRecords = await ethers.getContractFactory("PatientRecords");
    const records = await PatientRecords.deploy();
    await records.deployed();

    const InstaDocHub = await ethers.getContractFactory("InstaDocHub");
    const hub = await InstaDocHub.deploy(
      doctorRegistry.address,
      consentRegistry.address,
      escrow.address,
      records.address
    );
    await hub.deployed();

    // Register doctor and patient
    await doctorRegistry.registerDoctor(doctor.address, "Dr. Smith", "General", "cid1");
    await hub.connect(patient).registerPatient();

    // Doctor tries without consent → should revert
    await expect(
      hub.connect(doctor).addRecordForPatient(patient.address, "Checkup", "ipfsCheckup")
    ).to.be.revertedWith("No active consent");
  });
});
