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

    address public admin;

    mapping(address => bool) public registeredPatients;
    address[] public patientAddresses;

    struct HubRecord {
        address patient;
        address doctor;
        string description;
        string recordCID;
        bool encrypted;
        uint256 timestamp;
    }
    
    HubRecord[] public allRecords;
    mapping(address => uint256[]) public patientRecordIds;
    mapping(address => uint256[]) public doctorRecordIds;

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
        // Set the deployer (your wallet) as admin
        admin = msg.sender;
        
        // Initialize contract references
        doctorRegistry = DoctorRegistry(doctorRegistryAddr);
        consentRegistry = ConsentRegistry(consentRegistryAddr);
        escrow = EscrowPayments(escrowAddr);
        patientRecords = PatientRecords(patientRecordsAddr);
        
        // No need to transfer admin - deployer wallet remains admin of everything
    }

    /// --- Patients ---
    function registerPatient() external {
        require(!registeredPatients[msg.sender], "Already Registered");
        registeredPatients[msg.sender] = true;
        patientAddresses.push(msg.sender);
        emit PatientRegistered(msg.sender);
    }

    function removePatient(address patientAddr) external onlyAdmin {
        require(registeredPatients[patientAddr], "Patient not registered");
        registeredPatients[patientAddr] = false;
        emit PatientRemoved(patientAddr);
    }

    function getAllPatients() external view returns (address[] memory) {
        address[] memory activePatients = new address[](patientAddresses.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < patientAddresses.length; i++) {
            if (registeredPatients[patientAddresses[i]]) {
                activePatients[activeCount] = patientAddresses[i];
                activeCount++;
            }
        }
        
        address[] memory result = new address[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activePatients[i];
        }
        
        return result;
    }

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
    ) external onlyAdmin {
        // Since DoctorRegistry admin is now InstaDocHub, we need to call it directly
        // But we'll handle this in the deployment script
        doctorRegistry.registerDoctor(doctorAddr, name, specialization, profileCID);
        emit DoctorApproved(doctorAddr);
    }

    function revokeDoctor(address doctorAddr) external onlyAdmin {
        doctorRegistry.revokeDoctor(doctorAddr);
        emit DoctorRevoked(doctorAddr);
    }

    function isDoctorVerified(address doctor) external view returns (bool) {
        return doctorRegistry.isVerified(doctor);
    }

    function getAllVerifiedDoctors() external view returns (address[] memory) {
        return doctorRegistry.getAllVerifiedDoctors();
    }

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

        bool hasConsent = false;
        for (uint256 i = 0; i < consentRegistry.consentsLength(); i++) {
            ConsentRegistry.Consent memory c = consentRegistry.getConsent(i);
            if (c.patient == patient && c.doctor == msg.sender && c.active) {
                hasConsent = true;
                break;
            }
        }
        require(hasConsent, "No Active Consent");

        patientRecords.addRecord(patient, msg.sender, description, recordCID, encrypted);
        
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

    function getAllRecords() external view returns (HubRecord[] memory) {
        HubRecord[] memory activeRecords = new HubRecord[](allRecords.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (registeredPatients[allRecords[i].patient]) {
                activeRecords[activeCount] = allRecords[i];
                activeCount++;
            }
        }
        
        HubRecord[] memory result = new HubRecord[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeRecords[i];
        }
        
        return result;
    }

    function getRecordsCount() external view returns (uint256) {
        return allRecords.length;
    }

    function getRecordsRange(uint256 start, uint256 end) external view returns (HubRecord[] memory) {
        require(start < end && end <= allRecords.length, "Invalid range");
        HubRecord[] memory result = new HubRecord[](end - start);
        
        for (uint256 i = start; i < end; i++) {
            result[i - start] = allRecords[i];
        }
        
        return result;
    }
    
    // Check if address is admin
    function isAdmin(address addr) external view returns (bool) {
        return addr == admin;
    }
}