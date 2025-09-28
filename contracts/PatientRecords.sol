// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PatientRecords {
    struct Record {
        address doctor;
        string description;
        string ipfsHash;
        uint256 timestamp;
        bool encrypted;
    }

    mapping(address => Record[]) private patientRecords;

    event RecordAdded(
        address indexed patient,
        address indexed doctor,
        string description,
        string ipfsHash,
        uint256 timestamp,
        bool encrypted
    );

    function addRecord(
        address patient,
        address doctor,  // Add doctor as parameter
        string memory description,
        string memory ipfsHash,
        bool encrypted
    ) external {
        Record memory newRecord = Record({
            doctor: doctor,  // Use the passed doctor address
            description: description,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            encrypted: encrypted
        });

        patientRecords[patient].push(newRecord);

        emit RecordAdded(
            patient,
            doctor,  // Use the passed doctor address
            description,
            ipfsHash,
            block.timestamp,
            encrypted
        );
    }

    function getRecords(address patient) external view returns (Record[] memory) {
        return patientRecords[patient];
    }
}