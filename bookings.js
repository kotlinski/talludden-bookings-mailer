/**
 * Logs in to a website with a username and password and then fetches a protected page.
 * This script is designed to run independently and does not require a Google Sheet.
 * Results and messages will be printed to the Apps Script logs.
 */

// Credentials and recipients are stored in Script Properties – see config.js and secrets.example.json.

function test() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('upcomingBookings', '');
  scriptProperties.setProperty('lastPreviousBooking', '');
  const testRecipients = getConfig('TEST_RECIPIENT_EMAILS');
  main({
    ownerRecipientEmails: testRecipients,
    otherRecipientEmails: testRecipients
  });
}

function main(options = {}) {
  try {
    const config = loadConfig();
    // Use provided options or fall back to configured recipients
    const currentOwnerRecipients = options.ownerRecipientEmails || config.ownerRecipientEmails;
    const currentOtherRecipients = options.otherRecipientEmails || config.otherRecipientEmails;

    const content = fetchPageContent(config.username, config.password);
    // Call the function to parse the HTML and extract the bookings.
    const upcomingBookings = extractUpcomingBookingsFromHtml(content);
    if (upcomingBookings.length > 0) {
      Logger.log('Extracted Current Bookings:');
      Logger.log(JSON.stringify(upcomingBookings, null, 2));
    } else {
      Logger.log('No current bookings found in the HTML content.');
    }
    const allPreviousBookings = extractPreviousBookingsFromHtml(content);

    // Check if the booking data has changed before sending the email.
    // Both sections are compared, since new bookings sometimes appear directly in "Tidigare bokningar".
    if (isDataChanged(upcomingBookings, allPreviousBookings)) {

      const previousBookings = allPreviousBookings.slice(0,2);
      let currentBooking;
      if (previousBookings.length > 0) {
        Logger.log('Extracted Previous Bookings:');
        Logger.log(JSON.stringify(previousBookings, null, 2));
        const now = (new Date()).getTime()
        const departure = (new Date(previousBookings[0].departure)).getTime();
        const arrival = (new Date(previousBookings[0].arrival)).getTime();
        if(now<=departure && now>=arrival){
           currentBooking = previousBookings.shift()
           Logger.log(`Current booking ${currentBooking}`)
        }
      } else {
        Logger.log('No previous bookings found in the HTML content.');
      }

      // Call the new function to calculate net earnings from previous bookings.
      const netEarnings = calculateNetEarningsFromHtml(content);
      Logger.log('Calculated net earnings from previous bookings: ' + netEarnings.toFixed(2));
      
      // -------------------
      // STEP 3: SEND EMAIL
      // -------------------
      // Pass all data needed to format both emails to the sending function, along with resolved recipients
      sendEmailWithBookings(upcomingBookings, currentBooking, previousBookings, netEarnings, currentOwnerRecipients, currentOtherRecipients, config);
      Logger.log('Booking data has changed. Emails sent successfully!');
    } else {
      Logger.log('Booking data has not changed. Email not sent.');
    }
    
  } catch (error) {
    Logger.log('An error occurred: ' + error.toString());
    Logger.log('An unexpected error occurred. Check the logs.');
  }
}

/**
 * Checks if the bookings have changed since the last run.
 * Two values are compared and stored in Script Properties:
 *  - upcomingBookings: all bookings in "Aktuella bokningar"
 *  - lastPreviousBooking: the most recent booking in "Tidigare bokningar",
 *    since new bookings sometimes appear directly in that section.
 * @param {Array<Object>} upcomingBookings Bookings from "Aktuella bokningar".
 * @param {Array<Object>} previousBookings Bookings from "Tidigare bokningar", most recent first.
 * @returns {boolean} True if either has changed, false otherwise.
 */
function isDataChanged(upcomingBookings, previousBookings) {
  const scriptProperties = PropertiesService.getScriptProperties();

  const newBookingsString = JSON.stringify(upcomingBookings);
  const newPreviousString = JSON.stringify(previousBookings[0] || null);

  const bookingsChanged = scriptProperties.getProperty('upcomingBookings') !== newBookingsString;
  const previousChanged = scriptProperties.getProperty('lastPreviousBooking') !== newPreviousString;

  if (bookingsChanged) {
    Logger.log('"Aktuella bokningar" has changed.');
    scriptProperties.setProperty('upcomingBookings', newBookingsString);
  }
  if (previousChanged) {
    Logger.log('Most recent "Tidigare bokningar" has changed.');
    scriptProperties.setProperty('lastPreviousBooking', newPreviousString);
  }
  return bookingsChanged || previousChanged;
}


/**
 * Sends an email with the extracted booking information and net earnings.
 * @param {Array<Object>} upcomingBookings An array of booking objects.
 * @param {number} netEarnings The calculated net earnings.
 * @param {string} ownerRecipients Email addresses for owners (comma-separated).
 * @param {string} otherRecipients Email addresses for others (comma-separated).
 * @param {Object} config The config from loadConfig().
 */
function sendEmailWithBookings(upcomingBookings, currentBooking, previousBookings, netEarnings, ownerRecipients, otherRecipients, config) {
  const { stugNamn, ownerName } = config;
  const subject = `${stugNamn}, Bokningsuppdatering`;
  upcomingBookings.reverse()
  
  // Send to Owners (Full details)
  try {
    MailApp.sendEmail({
      to: ownerRecipients, // Use parameter
      subject: subject,
      htmlBody: getHtmlBody(upcomingBookings, currentBooking, previousBookings, netEarnings, true, ownerName, stugNamn) // Inlined call
    });
    Logger.log('Email successfully sent to Owners.');
  } catch (e) {
    Logger.log('Error sending email to owners: ' + e.toString());
    Logger.log('Please ensure the script has the necessary permissions to send email.');
  }

  // Send to Others (Limited details)
  try {
    MailApp.sendEmail({
      to: otherRecipients, // Use parameter
      subject: subject,
      htmlBody: getHtmlBody(upcomingBookings, currentBooking, previousBookings, netEarnings, false, ownerName, stugNamn) // Inlined call
    });
    Logger.log('Email successfully sent to Others.');
  } catch (e) {
    Logger.log('Error sending email to others: ' + e.toString());
    Logger.log('Please ensure the script has the necessary permissions to send email.');
  }
}
