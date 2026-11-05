

/**
 * Generates the HTML body for the email, adjusting content based on the recipient type.
 * @param {Array<Object>} currentBookings An array of booking objects.
 * @param {number} netEarnings The calculated net earnings.
 * @param {boolean} isOwner True if the email is for the owner (full details), false otherwise (limited details).
 * @returns {string} The HTML content for the email body.
 */
function getHtmlBody(upcomingBookings, currentBooking, previousBookings, netEarnings, isOwner, ownerName, stugNamn) {
  
  // Set the greeting
  let htmlBody = 'Hej,<br><br><br>Här är en uppdatering av aktuella bokningar.<br><br>';

  htmlBody += createBookingsTable(upcomingBookings, isOwner, "Framtida bokningar", ownerName)
  htmlBody += '<br>'

  if(currentBooking){
    htmlBody += createBookingsTable([currentBooking], isOwner, "Aktuella bokningar", ownerName)
    htmlBody += '<br>'
  }
  
  htmlBody += createBookingsTable(previousBookings, isOwner, "Tidigare bokningar", ownerName)
  htmlBody += '<br>'
  
  // Net Earnings Section - Only included for the owner
  if (isOwner) {
    htmlBody += `Väntande utbetalning från tidigare bokningar: <b>${Math.round(netEarnings).toLocaleString('sv-SE')} kr</b><br>`; // Updated text
  }
  
  // Footer
  htmlBody += `<br><br><br>/Talludden - ${stugNamn}<br>`;
  return htmlBody;
}

function createBookingsTable(bookings, isOwner, title, ownerName) {
  htmlBody = "";
  // Format current bookings for the email body.
  if (bookings.length > 0) {
    htmlBody += `<h4>${title}</h4>`; // Changed from "Aktuella bokningar:"
    htmlBody += `<table border="0" cellpadding="5" cellspacing="0">`;
    bookings.forEach((booking, index) => {
      let displayedName = booking.guestName;
      if (!isOwner) {
        // If not the owner, display only the first name (unless the guest is the owner)
        if (booking.guestName !== ownerName) {
          const parts = booking.guestName.split(' ');
          if (parts.length > 0) {
            displayedName = parts[0];
          }
        }
      }
      if (index > 0) {
        htmlBody += `<tr><td><hr></td></tr>`; // Horizontal line separator
      }
      // Only include the price for the owner 
      let price = "";
      if (isOwner && booking.price !== "0") {
        price +=`, ${Math.round(booking.price).toLocaleString('sv-SE')} kr`;
      }  
      // Booking Details Table Rows
      htmlBody += `<tr><td>${displayedName}${price}</td></tr>`;
      htmlBody += `<tr><td>${formatSwedishDateSlim(booking.arrival)}  →  ${formatSwedishDateSlim(booking.departure)}</td></tr>`;
    });
    htmlBody += `</table><br>`;
  } else {
    htmlBody += 'Inga aktuella bokningar att rapportera.<br>';
  }
  return htmlBody;
}

/**
 * Formats a date string (e.g., "2025-12-01") into the Swedish short format: "mån 1 dec 2025".
 * @param {string} dateStr The date string (YYYY-MM-DD) from your booking data.
 * @returns {string} The formatted Swedish date string.
 */
function formatSwedishDateSlim(dateStr) {
  const dateObject = new Date(dateStr);

  // 1. Get the short weekday (e.g., 'mån', 'tis')
  const shortWeekday = dateObject.toLocaleDateString('sv-SE', { 
      weekday: 'short' 
  }); 

  // 2. Get the day, short month, and year (e.g., '7 okt 2025')
  const datePart = dateObject.toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric' 
  }); 

  // Combine them into the final desired format: "Ons 7 okt 2025"
  return `${shortWeekday} ${datePart}`;
}
