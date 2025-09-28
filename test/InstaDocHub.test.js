const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InstaDocHub Integration", function () {
  it("should deploy all contracts and work together", async function () {
    const [admin, doctor, patient] = await ethers.getSigners();
    
    console.log("Admin address:", await admin.getAddress());
    console.log("Doctor address:", await doctor.getAddress()); 
    console.log("Patient address:", await patient.getAddress());

    // Deploy DoctorRegistry first (admin will be the deployer)
    const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
    const doctorRegistry = await DoctorRegistry.deploy();
    await doctorRegistry.waitForDeployment();

    const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
    const consentRegistry = await ConsentRegistry.deploy();
    await consentRegistry.waitForDeployment();

    const EscrowPayments = await ethers.getContractFactory("EscrowPayments");
    const escrow = await EscrowPayments.deploy();
    await escrow.waitForDeployment();

    const PatientRecords = await ethers.getContractFactory("PatientRecords");
    const records = await PatientRecords.deploy();
    await records.waitForDeployment();

    const InstaDocHub = await ethers.getContractFactory("InstaDocHub");
    const hub = await InstaDocHub.deploy(
      await doctorRegistry.getAddress(),
      await consentRegistry.getAddress(),
      await escrow.getAddress(),
      await records.getAddress()
    );
    await hub.waitForDeployment();

    // Transfer admin rights from deployer to InstaDocHub
    await doctorRegistry.connect(admin).transferAdmin(await hub.getAddress());
    
    // Now hub can call approveDoctor
    await hub.connect(admin).approveDoctor(doctor.address, "Dr. Smith", "General", "cid1");
    await hub.connect(patient).registerPatient();

    // Give consent
    await consentRegistry.connect(patient).createConsent(doctor.address, "encryptedCid");

    // Doctor adds record through hub
    await hub.connect(doctor).addRecordForPatient(patient.address, "Checkup", "ipfsCheckup", false);

    // Patient retrieves records
    const patientRecords = await hub.connect(patient).viewMyRecords();
    console.log("Records retrieved:", patientRecords.length);
    if (patientRecords.length > 0) {
      console.log("First record doctor:", patientRecords[0].doctor);
      console.log("Expected doctor:", doctor.address);
    }
    
    expect(patientRecords.length).to.equal(1);
    expect(patientRecords[0].description).to.equal("Checkup");
    expect(patientRecords[0].doctor).to.equal(doctor.address);

    expect(await doctorRegistry.isVerified(doctor.address)).to.be.true;
  });

  it("should fail if doctor tries to add record without consent", async function () {
    const [admin, doctor, patient] = await ethers.getSigners();

    const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
    const doctorRegistry = await DoctorRegistry.deploy();
    await doctorRegistry.waitForDeployment();

    const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
    const consentRegistry = await ConsentRegistry.deploy();
    await consentRegistry.waitForDeployment();

    const EscrowPayments = await ethers.getContractFactory("EscrowPayments");
    const escrow = await EscrowPayments.deploy();
    await escrow.waitForDeployment();

    const PatientRecords = await ethers.getContractFactory("PatientRecords");
    const records = await PatientRecords.deploy();
    await records.waitForDeployment();

    const InstaDocHub = await ethers.getContractFactory("InstaDocHub");
    const hub = await InstaDocHub.deploy(
      await doctorRegistry.getAddress(),
      await consentRegistry.getAddress(),
      await escrow.getAddress(),
      await records.getAddress()
    );
    await hub.waitForDeployment();

    // Transfer admin rights from deployer to InstaDocHub
    await doctorRegistry.connect(admin).transferAdmin(await hub.getAddress());
    
    // Register doctor through hub
    await hub.connect(admin).approveDoctor(doctor.address, "Dr. Smith", "General", "cid1");
    await hub.connect(patient).registerPatient();

    // Don't give consent - this should make the next call fail
    await expect(
      hub.connect(doctor).addRecordForPatient(patient.address, "Checkup", "ipfsCheckup", false)
    ).to.be.revertedWith("No Active Consent");
  });
});