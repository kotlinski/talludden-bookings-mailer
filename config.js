/**
 * Reads a required value from Script Properties
 * (Project Settings → Script Properties in the Apps Script editor).
 * See secrets.example.json for the keys that must be set.
 * @param {string} key The property name.
 * @returns {string} The property value.
 */
function getConfig(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (value === null || value === '') {
    throw new Error(`Missing Script Property "${key}". Set it in Project Settings → Script Properties.`);
  }
  return value;
}

/**
 * Loads all configuration needed by the script.
 * Called at runtime (not at top level) so file load order doesn't matter.
 */
function loadConfig() {
  return {
    username: getConfig('USERNAME'),
    password: getConfig('PASSWORD'),
    ownerRecipientEmails: getConfig('OWNER_RECIPIENT_EMAILS'),
    otherRecipientEmails: getConfig('OTHER_RECIPIENT_EMAILS'),
    stugNamn: getConfig('STUG_NAMN'),
    ownerName: getConfig('OWNER_NAME'),
  };
}
