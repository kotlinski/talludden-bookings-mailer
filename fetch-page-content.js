function fetchPageContent(username, password) {
  // -------------------
  // STEP 1: LOG IN
  // -------------------
  // The login URL has been corrected to point directly to the login form within the frameset.
  const loginUrl = 'https://talludden.dlbookit.se/levingang/bmLeverantor/login.asp';
  
  // The payload for the POST request must match the form fields on the login page.
  // The names for username and password fields are typically 'Användarnamn' and 'Lösenord'.
  const payload = {
    'Användarnamn': username,
    'Lösenord': password
  };
  
  const loginOptions = {
    'method': 'post',
    'payload': payload,
    // It's crucial to follow redirects so UrlFetchApp can handle the session creation.
    'followRedirects': true,
    'muteHttpExceptions': true
  };
  
  Logger.log('Attempting to log in to: ' + loginUrl);
  const loginResponse = UrlFetchApp.fetch(loginUrl, loginOptions);
  
  // Log the response code and headers to help with debugging.
  Logger.log('Login response code: ' + loginResponse.getResponseCode());
  // Check if the login was successful by looking for the session cookie.
  const cookie = loginResponse.getAllHeaders()['Set-Cookie'];
  if (!cookie) {
    Logger.log('Login failed. No session cookie received.');
    Logger.log('Please verify the username, password, and form field names.');
    return;
  }
  
  // -------------------
  // STEP 2: FETCH PROTECTED PAGE
  // -------------------
  // This is the URL of the page you want to access after logging in.
  const protectedPageUrl = 'https://talludden.dlbookit.se/levingang/bmLeverantor/leverantorstep1.asp'
    + '?lev=' + encodeURIComponent(username.toLowerCase())
    + '&uid=' + encodeURIComponent(username)
    + '&pwd=' + encodeURIComponent(password)
    + '&login=1';
  
  const fetchOptions = {
    'method': 'get',
    'headers': {
      // Use the session cookie obtained from the login response.
      'Cookie': cookie
    },
    'muteHttpExceptions': true
  };
  
  Logger.log('Login successful. Attempting to fetch protected page...');
  const protectedPageResponse = UrlFetchApp.fetch(protectedPageUrl, fetchOptions);
  
if (protectedPageResponse.getResponseCode() === 200) {
    return protectedPageResponse.getContentText('ISO-8859-1'); 
  } else {
    Logger.log('Failed to fetch protected page. Response code: ' + protectedPageResponse.getResponseCode());
    Logger.log('Response body: ' + protectedPageResponse.getContentText());
    Logger.log('Failed to fetch the protected page. The cookie may be incorrect or expired.');
  }
}
