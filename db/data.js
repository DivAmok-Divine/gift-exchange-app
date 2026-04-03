/**
 * data.js — Live data layer
 * Fetches users and admins live from Google data CSVs.
 *
 * Users sheet columns:
 *   Timestamp | First Name | Last Name | Other Names | Phone Number | Date Of Birth | Email address | Password
 *
 * Admins sheet columns:
 *   Timestamp | Admin User Name | Password | Email address
 */

const USERS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/15e_BhdW-KoVZddXTd9slftkMSpJidaiVOtv5sCQX9LQ/export?format=csv&gid=1941737377';

const ADMINS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/1PQqjAfo7fjBjLMFHTj4vCATTzmQEdlqLTWGHsLXDWi8/export?format=csv&gid=1710283116';

const PAIRINGS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/1PQqjAfo7fjBjLMFHTj4vCATTzmQEdlqLTWGHsLXDWi8/export?format=csv&gid=2105774191';

const EVENTS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/1PQqjAfo7fjBjLMFHTj4vCATTzmQEdlqLTWGHsLXDWi8/export?format=csv&gid=2022170814';

const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbySiXsSvNxtiipb7gf1lklblg8xxCRqnMmsH0yzQIS1y4-nu0_wk0xvN1Idb3tj0uCk/exec';

/**
 * Saves a new user or updates an existing one on the 'Form Responses 1' sheet.
 */
export async function saveNewUser(userData) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ ...userData, action: 'add_user' }),
            headers: { 'Content-Type': 'text/plain' }
        });
        return true;
    } catch (err) {
        console.error('Failed to save user to sheet:', err);
        return false;
    }
}

/**
 * Updates an existing user on the 'Form Responses 1' sheet.
 */
export async function updateUserOnSheet(userData) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ ...userData, action: 'update_user' }),
            headers: { 'Content-Type': 'text/plain' }
        });
        return true;
    } catch (err) {
        console.error('Failed to update user on sheet:', err);
        return false;
    }
}

/**
 * Saves a new password back to the Google Sheet via the Apps Script proxy.
 * phone: The unique identifier (from Column E)
 * newPassword: The value to write into Column H
 */
export async function saveUserPassword(phone, newPassword) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Essential for Google Apps Script cross-origin
            body: JSON.stringify({ phone, newPassword, action: 'password' }),
            headers: { 'Content-Type': 'text/plain' } // Use text/plain to avoid CORS preflight
        });
        return true;
    } catch (err) {
        console.error('Failed to save password to sheet:', err);
        return false;
    }
}

export async function saveUserPairing(phone, pairedPhone, giftType = '') {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ phone, pairedPhone, giftType, action: pairedPhone ? 'pair' : 'reset' }),
            headers: { 'Content-Type': 'text/plain' }
        });
        return true;
    } catch (err) {
        console.error('Failed to sync pairing to sheet:', err);
        return false;
    }
}

/**
 * Syncs an event back to the master sheet.
 */
export async function saveEventToSheet(eventData) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ ...eventData, action: 'save_event' }),
            headers: { 'Content-Type': 'text/plain' }
        });
        return true;
    } catch (err) {
        console.error('Failed to save event to sheet:', err);
        return false;
    }
}

/**
 * Deletes an event from the master sheet.
 */
export async function deleteEventFromSheet(eventName) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ name: eventName, action: 'delete_event' }),
            headers: { 'Content-Type': 'text/plain' }
        });
        return true;
    } catch (err) {
        console.error('Failed to delete event from sheet:', err);
        return false;
    }
}

/**
 * Fetch with a 10-second timeout so the app never hangs indefinitely.
 */
async function fetchWithTimeout(url, ms = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

/**
 * Parses a single CSV line, correctly handling quoted fields.
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

/**
 * Converts raw CSV text into an array of plain objects keyed by header row.
 */
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]);
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        return Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]));
    });
}

/**
 * Fetches and returns users from the Google Sheet.
 * fullName = First Name + Other Names (if set) + Last Name
 * Falls back to [] if the sheet is unreachable.
 */
export async function fetchUsers() {
    try {
        const text = await fetchWithTimeout(USERS_CSV_URL);
        const rows = parseCSV(text);

        let pairingsMap = {};
        try {
            const pairingsText = await fetchWithTimeout(PAIRINGS_CSV_URL);
            const pairingsRows = parseCSV(pairingsText);
            pairingsRows.forEach(r => {
                let sp = r['Spinner Phone'] ? String(r['Spinner Phone']).trim().replace(/^0+/, '').replace(/\s+/g, '') : '';
                let rp = r['Paired Phone'] ? String(r['Paired Phone']).trim().replace(/^0+/, '').replace(/\s+/g, '') : '';
                let gt = r['Gift Type'] ? String(r['Gift Type']).trim() : '';
                if (sp) pairingsMap[sp] = { pairedPhone: rp, giftType: gt };
            });
        } catch (e) {
            console.warn('⚠️ Could not fetch pairings (maybe the sheet doesn\'t exist yet)');
        }

        return rows
            .filter(r => r['First Name'])
            .map(r => {
                const nameParts = [r['First Name'], r['Other Names'], r['Last Name']]
                    .filter(p => p && p.trim() !== '');
                const userPhone = r['Phone Number'] || '';
                const cleanPhone = userPhone.replace(/^0+/, '').replace(/\s+/g, '');
                const pairingData = pairingsMap[cleanPhone] || { pairedPhone: '', giftType: '' };
                return {
                    fullName: nameParts.join(' '),
                    phone: userPhone,
                    cleanPhone: cleanPhone,
                    email: r['Email address'] || '',
                    dob: r['Date Of Birth'] || '',
                    password: r['Password'] || '',  // optional; falls back to phone if empty
                    pairedWith: pairingData.pairedPhone,
                    giftType: pairingData.giftType
                };
            });
    } catch (err) {
        console.warn('⚠️ fetchUsers failed:', err.message);
        return [];
    }
}

/**
 * Fetches and returns admins from the Google Sheet.
 * Column: "Admin User Name" (not "Name").
 * Falls back to [] if the sheet is unreachable.
 */
export async function fetchAdmins() {
    try {
        const text = await fetchWithTimeout(ADMINS_CSV_URL);
        const rows = parseCSV(text);
        return rows
            .filter(r => r['Admin User Name'])
            .map(r => ({
                username: r['Admin User Name'] || '',
                password: r['Password'] || '',
                email: r['Email address'] || '',
            }));
    } catch (err) {
        console.warn('⚠️ fetchAdmins failed:', err.message);
        return [];
    }
}

/**
 * Fetches events from the Google Sheet.
 */
export async function fetchEvents() {
    try {
        const text = await fetchWithTimeout(EVENTS_CSV_URL);
        const rows = parseCSV(text);
        return rows.map(r => ({
            name: r['Event Name'],
            startDate: r['Start Date'],
            endDate: r['End Date'],
            isActive: String(r['Is Active']).toUpperCase() === 'TRUE'
        }));
    } catch (err) {
        console.warn('⚠️ fetchEvents failed:', err.message);
        return [];
    }
}
