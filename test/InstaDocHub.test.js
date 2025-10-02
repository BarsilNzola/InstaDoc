const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InstaDocHub - Enhanced Admin Functions", function () {
  let hub, doctorRegistry, consentRegistry, escrow, records;
  let admin, doctor1, doctor2, patient1, patient2;

  beforeEach(async function () {
    [admin, doctor1, doctor2, patient1, patient2] = await ethers.getSigners();
    
    // Deploy all contracts
    const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
    doctorRegistry = await DoctorRegistry.deploy();
    await doctorRegistry.waitForDeployment();

    const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
    consentRegistry = await ConsentRegistry.deploy();
    await consentRegistry.waitForDeployment();

    const EscrowPayments = await ethers.getContractFactory("EscrowPayments");
    escrow = await EscrowPayments.deploy();
    await escrow.waitForDeployment();

    const PatientRecords = await ethers.getContractFactory("PatientRecords");
    records = await PatientRecords.deploy();
    await records.waitForDeployment();

    const InstaDocHub = await ethers.getContractFactory("InstaDocHub");
    hub = await InstaDocHub.deploy(
      await doctorRegistry.getAddress(),
      await consentRegistry.getAddress(),
      await escrow.getAddress(),
      await records.getAddress()
    );
    await hub.waitForDeployment();

    // TRANSFER DOCTOR REGISTRY ADMIN TO HUB CONTRACT
    // This allows InstaDocHub to manage doctors through its admin functions
    await doctorRegistry.connect(admin).transferAdmin(await hub.getAddress());
  });

  it("should deploy all contracts and work together", async function () {
    // Register doctor through hub (admin calls hub, hub calls doctorRegistry)
    await hub.connect(admin).approveDoctor(doctor1.address, "Dr. Smith", "General", "cid1");
    await hub.connect(patient1).registerPatient();

    // Give consent
    await consentRegistry.connect(patient1).createConsent(doctor1.address, "encryptedCid");

    // Doctor adds record through hub
    await hub.connect(doctor1).addRecordForPatient(patient1.address, "Checkup", "ipfsCheckup", false);

    // Patient retrieves records
    const patientRecords = await hub.connect(patient1).viewMyRecords();
    
    expect(patientRecords.length).to.equal(1);
    expect(patientRecords[0].description).to.equal("Checkup");
    expect(patientRecords[0].doctor).to.equal(doctor1.address);

    expect(await doctorRegistry.isVerified(doctor1.address)).to.be.true;
  });

  it("should get all registered patients", async function () {
    // Register multiple patients
    await hub.connect(patient1).registerPatient();
    await hub.connect(patient2).registerPatient();

    const allPatients = await hub.getAllPatients();
    expect(allPatients).to.have.lengthOf(2);
    expect(allPatients).to.include(patient1.address);
    expect(allPatients).to.include(patient2.address);
  });

  it("should remove a patient", async function () {
    await hub.connect(patient1).registerPatient();
    
    // Verify patient is registered
    let allPatients = await hub.getAllPatients();
    expect(allPatients).to.include(patient1.address);

    // Remove patient (admin can do this)
    await hub.connect(admin).removePatient(patient1.address);

    // Verify patient is removed
    allPatients = await hub.getAllPatients();
    expect(allPatients).to.not.include(patient1.address);
    expect(await hub.registeredPatients(patient1.address)).to.be.false;
  });

  it("should get all records", async function () {
    // Setup: doctor, patient, consent
    await hub.connect(admin).approveDoctor(doctor1.address, "Dr. Smith", "General", "cid1");
    await hub.connect(patient1).registerPatient();
    await hub.connect(patient2).registerPatient();
    await consentRegistry.connect(patient1).createConsent(doctor1.address, "encryptedCid");
    await consentRegistry.connect(patient2).createConsent(doctor1.address, "encryptedCid");

    // Add records
    await hub.connect(doctor1).addRecordForPatient(patient1.address, "Checkup 1", "ipfs1", false);
    await hub.connect(doctor1).addRecordForPatient(patient2.address, "Checkup 2", "ipfs2", true);

    // Get all records
    const allRecords = await hub.getAllRecords();
    expect(allRecords).to.have.lengthOf(2);
    
    expect(allRecords[0].patient).to.equal(patient1.address);
    expect(allRecords[0].doctor).to.equal(doctor1.address);
    expect(allRecords[0].description).to.equal("Checkup 1");
    expect(allRecords[0].recordCID).to.equal("ipfs1");
    expect(allRecords[0].encrypted).to.be.false;

    expect(allRecords[1].patient).to.equal(patient2.address);
    expect(allRecords[1].description).to.equal("Checkup 2");
    expect(allRecords[1].encrypted).to.be.true;
  });

  it("should only allow admin to remove patients", async function () {
    await hub.connect(patient1).registerPatient();
    
    // Non-admin should not be able to remove patients
    await expect(
      hub.connect(doctor1).removePatient(patient1.address)
    ).to.be.revertedWith("Only Admin");
  });

  it("should only allow admin to approve doctors", async function () {
    await expect(
      hub.connect(doctor1).approveDoctor(doctor2.address, "Dr. Two", "Pediatrics", "cid2")
    ).to.be.revertedWith("Only Admin");
  });

  it("should only allow admin to revoke doctors", async function () {
    await hub.connect(admin).approveDoctor(doctor1.address, "Dr. One", "Cardiology", "cid1");
    
    await expect(
      hub.connect(doctor1).revokeDoctor(doctor1.address)
    ).to.be.revertedWith("Only Admin");
  });

  it("should handle empty patient and record lists", async function () {
    const emptyPatients = await hub.getAllPatients();
    const emptyRecords = await hub.getAllRecords();
    
    expect(emptyPatients).to.have.lengthOf(0);
    expect(emptyRecords).to.have.lengthOf(0);
  });

  it("should not include removed patients in getAllPatients", async function () {
    await hub.connect(patient1).registerPatient();
    await hub.connect(patient2).registerPatient();

    // Remove one patient
    await hub.connect(admin).removePatient(patient1.address);

    const activePatients = await hub.getAllPatients();
    expect(activePatients).to.have.lengthOf(1);
    expect(activePatients).to.include(patient2.address);
    expect(activePatients).to.not.include(patient1.address);
  });

  it("should not include records of removed patients in getAllRecords", async function () {
    // Setup
    await hub.connect(admin).approveDoctor(doctor1.address, "Dr. Smith", "General", "cid1");
    await hub.connect(patient1).registerPatient();
    await hub.connect(patient2).registerPatient();
    await consentRegistry.connect(patient1).createConsent(doctor1.address, "encryptedCid");
    await consentRegistry.connect(patient2).createConsent(doctor1.address, "encryptedCid");

    // Add records
    await hub.connect(doctor1).addRecordForPatient(patient1.address, "Record 1", "ipfs1", false);
    await hub.connect(doctor1).addRecordForPatient(patient2.address, "Record 2", "ipfs2", false);

    // Remove one patient
    await hub.connect(admin).removePatient(patient1.address);

    // Only records for active patients should be returned
    const activeRecords = await hub.getAllRecords();
    expect(activeRecords).to.have.lengthOf(1);
    expect(activeRecords[0].patient).to.equal(patient2.address);
  });

  it("should transfer admin rights", async function () {
    // Current admin should be able to transfer
    await hub.connect(admin).transferAdmin(doctor1.address);
    
    // New admin should be able to perform admin functions
    await hub.connect(doctor1).approveDoctor(doctor2.address, "Dr. Two", "Pediatrics", "cid2");
    
    // Old admin should no longer have admin rights
    await expect(
      hub.connect(admin).approveDoctor(doctor1.address, "Dr. One", "Cardiology", "cid1")
    ).to.be.revertedWith("Only Admin");
  });

  // NEW TEST: Verify deployer is the admin of InstaDocHub
  it("should have deployer as InstaDocHub admin", async function () {
    const hubAdmin = await hub.admin();
    expect(hubAdmin).to.equal(admin.address);
  });

  // NEW TEST: Verify isAdmin function works correctly
  it("should correctly identify admin addresses", async function () {
    expect(await hub.isAdmin(admin.address)).to.be.true;
    expect(await hub.isAdmin(doctor1.address)).to.be.false;
    expect(await hub.isAdmin(patient1.address)).to.be.false;
  });

  // Verify DoctorRegistry admin was transferred correctly
  it("should have Hub as DoctorRegistry admin", async function () {
    const doctorRegistryAdmin = await doctorRegistry.admin();
    expect(doctorRegistryAdmin).to.equal(await hub.getAddress());
  });

  // NEW TEST: Verify admin can call all admin functions
  it("should allow admin to perform all admin operations", async function () {
    // Approve doctor
    await hub.connect(admin).approveDoctor(doctor1.address, "Dr. Test", "Neurology", "cid_test");
    expect(await hub.isDoctorVerified(doctor1.address)).to.be.true;

    // Register patient
    await hub.connect(patient1).registerPatient();
    expect(await hub.registeredPatients(patient1.address)).to.be.true;

    // Remove patient
    await hub.connect(admin).removePatient(patient1.address);
    expect(await hub.registeredPatients(patient1.address)).to.be.false;

    // Revoke doctor
    await hub.connect(admin).revokeDoctor(doctor1.address);
    expect(await hub.isDoctorVerified(doctor1.address)).to.be.false;
  });
});