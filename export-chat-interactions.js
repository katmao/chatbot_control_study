const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, where, Timestamp } = require('firebase/firestore');
const fs = require('fs');

// Firebase configuration (aligned with export-voice-interactions.js)
const firebaseConfig = {
  apiKey: "AIzaSyCHCc1l3IPVNy2amUg6DrxVf1Kf-4pY1lU",
  authDomain: "chatbot-control-study.firebaseapp.com",
  projectId: "chatbot-control-study",
  storageBucket: "chatbot-control-study.firebasestorage.app",
  messagingSenderId: "172602855362",
  appId: "1:172602855362:web:ac3fabdc1be6c80bcc105b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_TIME_ZONE = 'America/New_York';

function getTimeZoneOffset(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return asUTC - date.getTime();
}

function getDatePartsInZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function addDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function startOfDayInZone(parts, timeZone) {
  const localMidnightAsUTC = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0),
  );
  const offsetMs = getTimeZoneOffset(localMidnightAsUTC, timeZone);
  return new Date(localMidnightAsUTC.getTime() - offsetMs);
}

function getDateRangeInZone(dateArg, timeZone) {
  const arg = (dateArg || '').toLowerCase();
  let targetParts;

  if (!arg || arg === 'yesterday' || arg === 'today') {
    const todayParts = getDatePartsInZone(new Date(), timeZone);
    targetParts = arg === 'today' ? todayParts : addDays(todayParts, -1);
  } else if (arg === 'today') {
    targetParts = getDatePartsInZone(new Date(), timeZone);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
    const [year, month, day] = arg.split('-').map(Number);
    targetParts = { year, month, day };
  } else {
    throw new Error('Invalid date. Use "today", "yesterday", or YYYY-MM-DD.');
  }

  const start = startOfDayInZone(targetParts, timeZone);
  const nextDayParts = addDays(targetParts, 1);
  const nextStart = startOfDayInZone(nextDayParts, timeZone);
  const end = new Date(nextStart.getTime() - 1);

  return { start, end, datePart: `${targetParts.year}-${String(targetParts.month).padStart(2, '0')}-${String(targetParts.day).padStart(2, '0')}` };
}

async function exportChatInteractionsForDate() {
  try {
    const dateArg = process.argv[2];
    const rangeLabel = dateArg || 'yesterday';
    const timeZone = process.env.EXPORT_TZ || DEFAULT_TIME_ZONE;
    console.log(`Starting chat export for ${rangeLabel} (${timeZone})...`);

    const { start, end, datePart } = getDateRangeInZone(dateArg, timeZone);
    const startTs = Timestamp.fromDate(start);
    const endTs = Timestamp.fromDate(end);

    // Query only yesterday's docs, ordered by timestamp desc for efficient retrieval
    const q = query(
      collection(db, 'chat_interactions'),
      where('timestamp', '>=', startTs),
      where('timestamp', '<=', endTs),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} chat interactions for ${datePart} (${timeZone})`);

    // Prepare CSV
    const csvHeader = 'Timestamp,User Message,Assistant Message,Turn Number,Session ID,Prolific PID\n';

    const interactions = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      interactions.push({
        timestamp: data.timestamp,
        userMessage: data.userMessage || '',
        assistantMessage: data.assistantMessage || '',
        turnNumber: data.turnNumber ?? null,
        sessionId: data.sessionId || '',
        prolificPid: data.prolificPid || ''
      });
    });

    // Sort for readability: by sessionId asc, then timestamp asc
    interactions.sort((a, b) => {
      if (a.sessionId < b.sessionId) return -1;
      if (a.sessionId > b.sessionId) return 1;
      return a.timestamp.toMillis() - b.timestamp.toMillis();
    });

    const csvRows = interactions.map((item) => {
      const timestampIso = item.timestamp.toDate().toISOString();
      const userMessage = `"${String(item.userMessage).replace(/"/g, '""')}"`;
      const assistantMessage = `"${String(item.assistantMessage).replace(/"/g, '""')}"`;
      const turnNumberOut = item.turnNumber ?? '';
      return `${timestampIso},${userMessage},${assistantMessage},${turnNumberOut},${item.sessionId},${item.prolificPid}`;
    });

    const csvContent = csvHeader + csvRows.join('\n');

    // Save file using yesterday's date in filename (UTC)
    const filename = `chat_interactions_${datePart}.csv`;
    fs.writeFileSync(filename, csvContent);

    console.log(`✅ Export completed! File saved as: ${filename}`);
    console.log(`📊 Total interactions exported: ${interactions.length}`);
  } catch (error) {
    console.error('❌ Chat export failed:', error);
  }
}

exportChatInteractionsForDate();
