const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EscrowPayments", function () {
  let escrow;
  let admin, patient, doctor, otherDoctor;

  beforeEach(async function () {
    [admin, patient, doctor, otherDoctor] = await ethers.getSigners();
    const EscrowFactory = await ethers.getContractFactory("EscrowPayments");
    escrow = await EscrowFactory.deploy();
    await escrow.waitForDeployment();
  });

  it("should handle complete appointment workflow: book -> confirm -> complete", async function () {
    const doctorAddr = await doctor.getAddress();

    // Patient books appointment
    const bookTx = await escrow.connect(patient).bookAppointment(doctorAddr, {
      value: ethers.parseEther("1")
    });
    const bookReceipt = await bookTx.wait();

    const bookedEvent = bookReceipt.logs.map((log) => {
      try {
        return escrow.interface.parseLog(log);
      } catch {
        return null;
      }
    }).find((parsed) => parsed && parsed.name === "AppointmentBooked");

    expect(bookedEvent).to.not.be.undefined;
    const appointmentId = bookedEvent.args.appointmentId || bookedEvent.args[0];

    // Check initial status is Pending (0)
    let appointment = await escrow.appointments(appointmentId);
    expect(appointment.status).to.equal(0); // Pending

    // Doctor confirms appointment
    await escrow.connect(doctor).confirmAppointment(appointmentId);
    
    // Check status is Confirmed (1)
    appointment = await escrow.appointments(appointmentId);
    expect(appointment.status).to.equal(1); // Confirmed

    // Either party can complete the appointment
    await escrow.connect(patient).completeAppointment(appointmentId);
    
    // Check status is Completed (2)
    appointment = await escrow.appointments(appointmentId);
    expect(appointment.status).to.equal(2); // Completed
  });

  it("should allow doctor to confirm their own appointments only", async function () {
    const doctorAddr = await doctor.getAddress();

    // Patient books appointment
    const bookTx = await escrow.connect(patient).bookAppointment(doctorAddr, {
      value: ethers.parseEther("1")
    });
    const bookReceipt = await bookTx.wait();

    const bookedEvent = bookReceipt.logs.find(log => 
      escrow.interface.parseLog(log)?.name === "AppointmentBooked"
    );
    const appointmentId = escrow.interface.parseLog(bookedEvent).args.appointmentId;

    // Other doctor cannot confirm
    await expect(
      escrow.connect(otherDoctor).confirmAppointment(appointmentId)
    ).to.be.revertedWith("Only doctor can confirm");

    // Correct doctor can confirm
    await expect(escrow.connect(doctor).confirmAppointment(appointmentId))
      .to.emit(escrow, "AppointmentConfirmed")
      .withArgs(appointmentId);
  });

  it("should allow patient to cancel pending appointment", async function () {
    const doctorAddr = await doctor.getAddress();

    const bookTx = await escrow.connect(patient).bookAppointment(doctorAddr, {
      value: ethers.parseEther("1")
    });
    const bookReceipt = await bookTx.wait();

    const bookedEvent = bookReceipt.logs.find(log => 
      escrow.interface.parseLog(log)?.name === "AppointmentBooked"
    );
    const appointmentId = escrow.interface.parseLog(bookedEvent).args.appointmentId;

    // Patient cancels
    await expect(escrow.connect(patient).cancelByPatient(appointmentId))
      .to.emit(escrow, "AppointmentCancelledByPatient")
      .withArgs(appointmentId);

    const appointment = await escrow.appointments(appointmentId);
    expect(appointment.status).to.equal(3); // CancelledByPatient
  });

  it("should allow doctor to decline pending appointment", async function () {
    const doctorAddr = await doctor.getAddress();

    const bookTx = await escrow.connect(patient).bookAppointment(doctorAddr, {
      value: ethers.parseEther("1")
    });
    const bookReceipt = await bookTx.wait();

    const bookedEvent = bookReceipt.logs.find(log => 
      escrow.interface.parseLog(log)?.name === "AppointmentBooked"
    );
    const appointmentId = escrow.interface.parseLog(bookedEvent).args.appointmentId;

    // Doctor declines
    await expect(escrow.connect(doctor).cancelByDoctor(appointmentId))
      .to.emit(escrow, "AppointmentCancelledByDoctor")
      .withArgs(appointmentId);

    const appointment = await escrow.appointments(appointmentId);
    expect(appointment.status).to.equal(4); // CancelledByDoctor
  });

  it("should not allow completion of unconfirmed appointment", async function () {
    const doctorAddr = await doctor.getAddress();

    const bookTx = await escrow.connect(patient).bookAppointment(doctorAddr, {
      value: ethers.parseEther("1")
    });
    const bookReceipt = await bookTx.wait();

    const bookedEvent = bookReceipt.logs.find(log => 
      escrow.interface.parseLog(log)?.name === "AppointmentBooked"
    );
    const appointmentId = escrow.interface.parseLog(bookedEvent).args.appointmentId;

    // Cannot complete without confirmation
    await expect(
      escrow.connect(patient).completeAppointment(appointmentId)
    ).to.be.revertedWith("Appointment must be confirmed first");
  });

  it("should transfer funds to doctor upon completion", async function () {
    const doctorAddr = await doctor.getAddress();
    const initialBalance = await ethers.provider.getBalance(doctorAddr);

    const bookTx = await escrow.connect(patient).bookAppointment(doctorAddr, {
      value: ethers.parseEther("1")
    });
    const bookReceipt = await bookTx.wait();

    const bookedEvent = bookReceipt.logs.find(log => 
      escrow.interface.parseLog(log)?.name === "AppointmentBooked"
    );
    const appointmentId = escrow.interface.parseLog(bookedEvent).args.appointmentId;

    // Complete workflow
    await escrow.connect(doctor).confirmAppointment(appointmentId);
    await escrow.connect(patient).completeAppointment(appointmentId);

    const finalBalance = await ethers.provider.getBalance(doctorAddr);
    expect(finalBalance).to.be.gt(initialBalance);
  });
});