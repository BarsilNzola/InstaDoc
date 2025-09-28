// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DoctorRegistry.sol";
import "./ConsentRegistry.sol";
import "./EscrowPayments.sol";
import "./PatientRecords.sol";

contract InstaDocHub {
    DoctorRegistry public doctorRegistry;
    ConsentRegistry public consentRegistry;
    EscrowPayments public escrow;
    PatientRecords public patientRecords;

    mapping(address => bool) public registeredPatients;

    event PatientRegistered(address indexed patient);
    event DoctorApproved(address indexed doctor);
    event DoctorRevoked(address indexed doctor);

    constructor(
        address doctorRegistryAddr,
        address consentRegistryAddr,
        address escrowAddr,
        address patientRecordsAddr
    ) {
        doctorRegistry = DoctorRegistry(doctorRegistryAddr);
        consentRegistry = ConsentRegistry(consentRegistryAddr);
        escrow = EscrowPayments(escrowAddr);
        patientRecords = PatientRecords(patientRecordsAddr);
    }

    /// --- Patients ---
    function registerPatient() external {
        require(!registeredPatients[msg.sender], "Already Registered");
        registeredPatients[msg.sender] = true;
        emit PatientRegistered(msg.sender);
    }

    /// --- Doctors (admin-controlled) ---
    function approveDoctor(
        address doctorAddr,
        string calldata name,
        string calldata specialization,
        string calldata profileCID
    ) external {
        doctorRegistry.registerDoctor(doctorAddr, name, specialization, profileCID);
        emit DoctorApproved(doctorAddr);
    }

    function revokeDoctor(address doctorAddr) external {
        doctorRegistry.revokeDoctor(doctorAddr);
        emit DoctorRevoked(doctorAddr);
    }

    function isDoctorVerified(address doctor) external view returns (bool) {
        return doctorRegistry.isVerified(doctor);
    }

    /// --- Records ---
	function addRecordForPatient(
        address patient,
        string calldata description,
        string calldata recordCID,
        bool encrypted
    ) external {
        require(doctorRegistry.isVerified(msg.sender), "Doctor not verified");
        require(registeredPatients[patient], "Patient not registered");

        // verify consent
        bool hasConsent = false;
        for (uint256 i = 0; i < consentRegistry.consentsLength(); i++) {
            ConsentRegistry.Consent memory c = consentRegistry.getConsent(i);
            if (c.patient == patient && c.doctor == msg.sender && c.active) {
                hasConsent = true;
                break;
            }
        }
        require(hasConsent, "No Active Consent");

        // pass the doctor address and the 'encrypted' flag
        patientRecords.addRecord(patient, msg.sender, description, recordCID, encrypted);
    }

    function viewMyRecords() external view returns (PatientRecords.Record[] memory) {
        require(registeredPatients[msg.sender], "Not Registered");
        return patientRecords.getRecords(msg.sender);
    }
}
