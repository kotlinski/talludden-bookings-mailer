
/**
 * Parses HTML content to find the "Tidigare bokningar" section and calculates the sum of (price - paid) for all bookings.
 * @param {string} htmlContent The HTML string to parse.
 * @returns {number} The total net earnings from previous bookings.
 */
function calculateNetEarningsFromHtml(htmlContent) {
  let totalNetEarnings = 0;
  
  // Use a regular expression to find the entire "Tidigare bokningar" section.
  const sectionRegex = /<!--Tidigare bokningar-->(.*)/gs;
  const sectionMatch = sectionRegex.exec(htmlContent);

  if (!sectionMatch) {
    Logger.log('Could not find the "Tidigare bokningar" section.');
    return 0;
  }
  
  // Extract the HTML content for only the previous bookings section.
  const previousBookingsHtml = sectionMatch[1];

  // Use a regular expression to find the table rows within that section.
  const bookingRegex = /<tr>.*?<\/tr>/gs;
  const matchRows = previousBookingsHtml.match(bookingRegex);
  
  if (matchRows) {
    // Skip the header row.
    for (let i = 1; i < matchRows.length; i++) {
      const row = matchRows[i];
      const cellRegex = /<td.*?>(.*?)<\/td>/gs;
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        cells.push(cellMatch[1].trim());
      }

      if (cells.length >= 10) {
        const price = parseFloat(cells[12]) || 0;
        const paid = parseFloat(cells[14]) || 0;
        totalNetEarnings += (price - paid);
      }
    }
  }
  
  return totalNetEarnings;
}