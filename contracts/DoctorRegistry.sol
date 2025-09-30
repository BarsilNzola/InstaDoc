// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DoctorRegistry
 * @notice Maintains a verified list of doctors approved by the admin
 */
contract DoctorRegistry {
    address public admin;

    struct Doctor {
        string name;
        string specialization;
        string profileCID; //IPFS CID to off-chain profile
        bool verified;
    }

    mapping(address => Doctor) public doctors;
    address[] public doctorAddresses; // Track all doctor addresses

    event DoctorRegistered(address indexed doctor, string name, string specialization, string profileCID);
    event DoctorRevoked(address indexed doctor);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only Admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerDoctor(
        address doctorAddr,
        string calldata name,
        string calldata specialization,
        string calldata profileCID
    ) external onlyAdmin {
        require(!doctors[doctorAddr].verified, "Doctor already registered");
        doctors[doctorAddr] = Doctor(name, specialization, profileCID, true);
        doctorAddresses.push(doctorAddr);
        emit DoctorRegistered(doctorAddr, name, specialization, profileCID);
    }

    function revokeDoctor(address doctorAddr) external onlyAdmin {
        require(doctors[doctorAddr].verified, "Doctor not registered or already revoked");
        doctors[doctorAddr].verified = false;
        emit DoctorRevoked(doctorAddr);
    }

    function isVerified(address doctorAddr) external view returns (bool) {
        return doctors[doctorAddr].verified;
    }

    // FIXED: Get all verified doctor addresses with proper filtering
    function getAllVerifiedDoctors() external view returns (address[] memory) {
        // First, count how many are actually verified
        uint verifiedCount = 0;
        for (uint i = 0; i < doctorAddresses.length; i++) {
            if (doctors[doctorAddresses[i]].verified) {
                verifiedCount++;
            }
        }
        
        // Create array with exact size
        address[] memory verifiedDoctors = new address[](verifiedCount);
        uint currentIndex = 0;
        
        // Populate the array with only verified doctors
        for (uint i = 0; i < doctorAddresses.length; i++) {
            if (doctors[doctorAddresses[i]].verified) {
                verifiedDoctors[currentIndex] = doctorAddresses[i];
                currentIndex++;
            }
        }
        
        return verifiedDoctors;
    }

    // Get doctor details
    function getDoctorDetails(address doctorAddr) external view returns (
        string memory name,
        string memory specialization,
        string memory profileCID,
        bool verified
    ) {
        Doctor memory doctor = doctors[doctorAddr];
        return (doctor.name, doctor.specialization, doctor.profileCID, doctor.verified);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}