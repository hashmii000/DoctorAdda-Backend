// import moment from "moment";

// export const generateAvailability = (
//   startTime,
//   endTime,
//   duration,
//   days = 2
// ) => {
//   const availability = [];

//   for (let i = 0; i < days; i++) {
//     const date = moment().add(i, "days").startOf("day"); // e.g., 2025-05-13
//     const slots = [];

//     let slotStart = moment(
//       `${date.format("YYYY-MM-DD")} ${startTime}`,
//       "YYYY-MM-DD HH:mm"
//     );
//     const slotEnd = moment(
//       `${date.format("YYYY-MM-DD")} ${endTime}`,
//       "YYYY-MM-DD HH:mm"
//     );

//     while (slotStart < slotEnd) {
//       const slotFinish = slotStart.clone().add(duration, "minutes");
//       if (slotFinish > slotEnd) break;

//       slots.push({
//         startTime: slotStart.format("hh:mm A"), // e.g., 01:00 PM
//         endTime: slotFinish.format("hh:mm A"),

//         isBooked: false,
//       });

//       slotStart = slotFinish;
//     }

//     // Push the date and its slots to the availability array
//     availability.push({
//       date: date.format("YYYY-MM-DD"), // e.g., "2025-05-13"
//       slots,
//     });
//   }

//   return availability;
// };

// export const generateAvailabilityafterDate = (
//   startTime,
//   endTime,
//   lastDate,
//   duration,
//   days = 2
// ) => {
//   const availability = [];

//   const startDate = moment(lastDate, "YYYY-MM-DD").add(1, "day").startOf("day");

//   for (let i = 0; i < days; i++) {
//     const date = startDate.clone().add(i, "days");
//     const slots = [];

//     // Set the slot start and end times for the current day
//     let slotStart = moment(
//       `${date.format("YYYY-MM-DD")} ${startTime}`,
//       "YYYY-MM-DD HH:mm"
//     );
//     const slotEnd = moment(
//       `${date.format("YYYY-MM-DD")} ${endTime}`,
//       "YYYY-MM-DD HH:mm"
//     );

//     // Create 30-minute time slots
//     while (slotStart < slotEnd) {
//       const slotFinish = slotStart.clone().add(duration, "minutes");
//       if (slotFinish > slotEnd) break;

//       slots.push({
//         startTime: slotStart.format("hh:mm A"), // e.g., 01:00 PM
//         endTime: slotFinish.format("hh:mm A"),

//         isBooked: false,
//       });

//       slotStart = slotFinish;
//     }

//     // Push the date and its slots to the availability array
//     availability.push({
//       date: date.format("YYYY-MM-DD"), // e.g., "2025-05-13"
//       slots,
//     });
//   }

//   return availability;
// };


import moment from "moment";

// 🟢 Helper to get day name from a date
const getDayName = (date) => moment(date).format("dddd"); // e.g., "Monday"

export const generateAvailability = (
  startTime,
  endTime,
  duration,
  validDays = [],
  days
) => {
  const availability = [];
  let i = 0;
  let daysGenerated = 0;

 

  while (daysGenerated < days) { // Limit to avoid infinite loop
    const date = moment().add(i, "days").startOf("day");
    const dayName = getDayName(date);

    if (validDays.includes(dayName)) {
      const slots = [];

      let slotStart = moment(
        `${date.format("YYYY-MM-DD")} ${startTime}`,
        "YYYY-MM-DD HH:mm"
      );
      const slotEnd = moment(
        `${date.format("YYYY-MM-DD")} ${endTime}`,
        "YYYY-MM-DD HH:mm"
      );

      while (slotStart < slotEnd) {
        const slotFinish = slotStart.clone().add(duration, "minutes");
        if (slotFinish > slotEnd) break;

        slots.push({
          startTime: slotStart.format("hh:mm A"),
          endTime: slotFinish.format("hh:mm A"),
          isBooked: false,
        });

        slotStart = slotFinish;
      }

      availability.push({
        date: date.format("YYYY-MM-DD"),
        slots,
      });

      daysGenerated++; // Only increment on valid day
    }

    i++;
  }

  return availability;
};

export const generateAvailabilityafterDate = (
  startTime,
  endTime,
  lastDate,
  duration,
  validDays = [],
  days
) => {
  const availability = [];
  const startDate = moment(lastDate, "YYYY-MM-DD").add(1, "day").startOf("day");

  let i = 0;
  let daysGenerated = 0;

  while (daysGenerated < days) {
    const date = startDate.clone().add(i, "days");
    const dayName = getDayName(date);

    if (validDays.includes(dayName)) {
      const slots = [];

      let slotStart = moment(
        `${date.format("YYYY-MM-DD")} ${startTime}`,
        "YYYY-MM-DD HH:mm"
      );
      const slotEnd = moment(
        `${date.format("YYYY-MM-DD")} ${endTime}`,
        "YYYY-MM-DD HH:mm"
      );

      while (slotStart < slotEnd) {
        const slotFinish = slotStart.clone().add(duration, "minutes");
        if (slotFinish > slotEnd) break;

        slots.push({
          startTime: slotStart.format("hh:mm A"),
          endTime: slotFinish.format("hh:mm A"),
          isBooked: false,
        });

        slotStart = slotFinish;
      }

      availability.push({
        date: date.format("YYYY-MM-DD"),
        slots,
      });

      daysGenerated++;
    }

    i++;
  }

  return availability;
};
