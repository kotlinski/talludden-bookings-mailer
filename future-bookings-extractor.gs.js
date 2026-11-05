
/**
 * Parses HTML content to extract booking information from the "Aktuella bokningar" section.
 * @param {string} htmlContent The HTML string to parse.
 * @returns {Array<Object>} An array of booking objects.
 */
function extractUpcomingBookingsFromHtml(htmlContent) {
  const bookings = [];
  
  // Use a regular expression to find the entire "Aktuella bokningar" section.
  const sectionRegex = /<!--Aktuella bokningar-->(.*?)<!--Allotment-->/gs;
  const sectionMatch = sectionRegex.exec(htmlContent);

  if (!sectionMatch) {
    Logger.log('Could not find the "Aktuella bokningar" section.');
    return bookings;
  }
  
  // Extract the HTML content for only the current bookings section.
  const upcomingBookingsHtml = sectionMatch[1];
  
  // Use a regular expression to find the table rows with class "row2" within that section.
  //   const bookingRegex = /<tr>.*?<\/tr>/gs;
  const bookingRegex = /<tr.*?<\/tr>/gs; 

  const matchRows = upcomingBookingsHtml.match(bookingRegex);
  
  if (matchRows) {
    dataRows = matchRows.filter(row => {
      // The ! operator negates the result: if "text1bold" IS found, it returns false (removes the row).
      return !row.includes("text1bold");
    });
  
    dataRows.forEach(row => {
      // Use another regex to find all the <td> tags within the matched row.
      const cellRegex = /<td.*?>(.*?)<\/td>/gs;
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        // Now we only trim the content to remove leading/trailing whitespace,
        // which preserves spaces within names and other text.
        cells.push(cellMatch[1].trim());
      }
      
      // Map the extracted cells to a structured object based on the corrected column order.
      if (cells.length >= 10) {
        const booking = {
          objectNumber: cells[0],
          arrival: cells[4],
          departure: cells[6],
          guestName: cells[8],
          invoiceNumber: cells[10],
          price: cells[12],
          paid: cells[14],
          bookingDate: cells[17],
        };
        // To ensure consistency when comparing in isDataChanged, we only include the data used for the email.
        bookings.push({
          arrival: booking.arrival,
          departure: booking.departure,
          guestName: booking.guestName,
          price: booking.price,
        });
      }
    });
  }
  
  return bookings;
}