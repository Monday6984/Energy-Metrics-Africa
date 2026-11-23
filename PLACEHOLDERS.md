# Placeholders and things to confirm with the client

Items on the site that are assumptions or need the client's OK.

## Free energy assessment tool (`/energy-audit/`)

| Item | Where | Status |
|---|---|---|
| System price of ₦850,000 per kWp | `js/energy-audit.js` (`COST_PER_KWP`) | Rate from the client's original tool. Never shown to visitors; used for the payback range and sent to the team with site-visit requests. Client to confirm or update. |
| Savings assume solar replaces about 70% of grid and fuel spend | `js/energy-audit.js` (`SAVINGS_SHARE`), note under the savings figures | From the original tool. Client to confirm. |
| Sizing rules: 5.5 peak sun hours, 80% system efficiency, battery = 60% of daily load, inverter = 1.5 × peak load | `js/energy-audit.js` | From the original tool. Client's engineers to confirm. |
| "COREN Registered", "COREN-registered team", "EMA-certified engineer" | Removed from the tool | The About page says "COREN Aligned", not "registered". Add back only if the client confirms registration. |
| "Binding cost proposal", "remote monitoring setup on handover" | Removed from the tool's next steps | Add back only if the client confirms they offer these. |
| Site-visit requests go to Formspree form `maeyboaq` | `energy-audit/index.html` | From the client's original tool. Confirm it is on the client's Formspree account and which inbox receives it. |
| "Our team will call you within 24 hours" | Site-visit success message | Matches the contact page promise. Client to confirm. |
