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

    address public admin; // Track hub admin separately

    mapping(address => bool) public registeredPatients;
    address[] public patientAddresses; // Track all patient addresses

    // Track all records in the hub
    struct HubRecord {
        address patient;
        address doctor;
        string description;
        string recordCID;
        bool encrypted;
        uint256 timestamp;
    }
    
    HubRecord[] public allRecords;
    mapping(address => uint256[]) public patientRecordIds; // patient -> record IDs
    mapping(address => uint256[]) public doctorRecordIds;  // doctor -> record IDs

    event PatientRegistered(address indexed patient);
    event PatientRemoved(address indexed patient);
    event DoctorApproved(address indexed doctor);
    event DoctorRevoked(address indexed doctor);
    event RecordAdded(address indexed patient, address indexed doctor, string recordCID);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only Admin");
        _;
    }

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
        admin = msg.sender; // Set deployer as admin
    }

    /// --- Patients ---
    function registerPatient() external {
        require(!registeredPatients[msg.sender], "Already Registered");
        registeredPatients[msg.sender] = true;
        patientAddresses.push(msg.sender);
        emit PatientRegistered(msg.sender);
    }

    // Remove patient (admin function)
    function removePatient(address patientAddr) external onlyAdmin { // Use onlyAdmin modifier
        require(registeredPatients[patientAddr], "Patient not registered");
        registeredPatients[patientAddr] = false;
        emit PatientRemoved(patientAddr);
    }

    // Get all registered patients
    function getAllPatients() external view returns (address[] memory) {
        address[] memory activePatients = new address[](patientAddresses.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < patientAddresses.length; i++) {
            if (registeredPatients[patientAddresses[i]]) {
                activePatients[activeCount] = patientAddresses[i];
                activeCount++;
            }
        }
        
        // Resize array to remove empty slots
        address[] memory result = new address[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activePatients[i];
        }
        
        return result;
    }

    // Transfer hub admin
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin is zero address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    /// --- Doctors (admin-controlled) ---
    function approveDoctor(
        address doctorAddr,
        string calldata name,
        string calldata specialization,
        string calldata profileCID
    ) external onlyAdmin { // Use onlyAdmin modifier
        doctorRegistry.registerDoctor(doctorAddr, name, specialization, profileCID);
        emit DoctorApproved(doctorAddr);
    }

    function revokeDoctor(address doctorAddr) external onlyAdmin { // Use onlyAdmin modifier
        doctorRegistry.revokeDoctor(doctorAddr);
        emit DoctorRevoked(doctorAddr);
    }

    function isDoctorVerified(address doctor) external view returns (bool) {
        return doctorRegistry.isVerified(doctor);
    }

    // Get all verified doctors through Hub
    function getAllVerifiedDoctors() external view returns (address[] memory) {
        return doctorRegistry.getAllVerifiedDoctors();
    }

    // Get doctor details through Hub
    function getDoctorDetails(address doctorAddr) external view returns (
        string memory name,
        string memory specialization,
        string memory profileCID,
        bool verified
    ) {
        return doctorRegistry.getDoctorDetails(doctorAddr);
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
        
        // Track record in hub
        uint256 recordId = allRecords.length;
        allRecords.push(HubRecord({
            patient: patient,
            doctor: msg.sender,
            description: description,
            recordCID: recordCID,
            encrypted: encrypted,
            timestamp: block.timestamp
        }));
        
        patientRecordIds[patient].push(recordId);
        doctorRecordIds[msg.sender].push(recordId);
        
        emit RecordAdded(patient, msg.sender, recordCID);
    }

    function viewMyRecords() external view returns (PatientRecords.Record[] memory) {
        require(registeredPatients[msg.sender], "Not Registered");
        return patientRecords.getRecords(msg.sender);
    }

    // Get all records (admin function)
    function getAllRecords() external view returns (HubRecord[] memory) {
        HubRecord[] memory activeRecords = new HubRecord[](allRecords.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (registeredPatients[allRecords[i].patient]) { // Only include records for active patients
                activeRecords[activeCount] = allRecords[i];
                activeCount++;
            }
        }
        
        // Resize array to remove empty slots
        HubRecord[] memory result = new HubRecord[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeRecords[i];
        }
        
        return result;
    }

    // Get records count for pagination
    function getRecordsCount() external view returns (uint256) {
        return allRecords.length;
    }

    // Get records by range for pagination
    function getRecordsRange(uint256 start, uint256 end) external view returns (HubRecord[] memory) {
        require(start < end && end <= allRecords.length, "Invalid range");
        HubRecord[] memory result = new HubRecord[](end - start);
        
        for (uint256 i = start; i < end; i++) {
            result[i - start] = allRecords[i];
        }
        
        return result;
    }
}