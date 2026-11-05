# talludden-bookings-mailer
Google script mailing if a new booking is made for the talludden booking system. 

## Local secrets

Keep sensitive configuration in a local `secrets.gs` file in the project root.
Define the values there as top-level variables, then reference those variables
from the other Apps Script files. `secrets.gs` is ignored by Git; do not force-add
it or commit its contents.

The `lastBookings` user property is separate from this configuration and can
continue to be initialized with `PropertiesService.getUserProperties()`.
