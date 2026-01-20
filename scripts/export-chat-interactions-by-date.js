const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  query,
  orderBy,
  where,
  getDocs,
  Timestamp,
} = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = {
  apiKey: 'AIzaSyBkkGt1qlQK62dGzxi4AK1aZC5H2A7DPxY',
  authDomain: 'chatroom-66981.firebaseapp.com',
  projectId: 'chatroom-66981',
  storageBucket: 'chatroom-66981.firebasestorage.app',
  messagingSenderId: '919496165622',
  appId: '1:919496165622:web:2557bcce7f1bbfab6ec4d7',
};

const startDateArg = process.argv[2];
const endDateArg = process.argv[3];

if (!startDateArg) {
  console.error('Usage: node scripts/export-chat-interactions-by-date.js <START_YYYY-MM-DD> [END_YYYY-MM-DD]');
  process.exit(1);
}

const startDate = new Date(`${startDateArg}T00:00:00Z`);
if (Number.isNaN(startDate.getTime())) {
  console.error('Invalid start date. Expected format YYYY-MM-DD');
  process.exit(1);
}

const endDate = endDateArg ? new Date(`${endDateArg}T00:00:00Z`) : startDate;
if (Number.isNaN(endDate.getTime())) {
  console.error('Invalid end date. Expected format YYYY-MM-DD');
  process.exit(1);
}

if (endDate < startDate) {
  console.error('End date must be on or after start date.');
  process.exit(1);
}

const startOfRange = startDate;
const endOfRange = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function exportChatInteractionsForDate() {
  try {
    const endLabel = endDateArg || startDateArg;
    console.log(
      `Fetching chat interactions from ${startDateArg}${endDateArg ? ` to ${endLabel}` : ''}...`,
    );

    const q = query(
      collection(db, 'chat_interactions'),
      where('timestamp', '>=', Timestamp.fromDate(startOfRange)),
      where('timestamp', '<', Timestamp.fromDate(endOfRange)),
      orderBy('timestamp', 'asc'),
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('No chat interactions found for that date range.');
      return;
    }

    const csvHeader = 'Timestamp,User Message,Assistant Message,Turn Number,Session ID,Prolific PID\n';
    const rows = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const timestampIso = data.timestamp.toDate().toISOString();
      const userMessage = data.userMessage ? data.userMessage.replace(/"/g, '""') : '';
      const assistantMessage = data.assistantMessage ? data.assistantMessage.replace(/"/g, '""') : '';
      rows.push(
        `${timestampIso},"${userMessage}","${assistantMessage}",${data.turnNumber ?? ''},${data.sessionId ?? ''},${data.prolificPid ?? ''}`,
      );
    });

    const csvContent = csvHeader + rows.join('\n');
    const filename =
      startDateArg === endLabel
        ? `chat_interactions_${startDateArg}.csv`
        : `chat_interactions_${startDateArg}_to_${endLabel}.csv`;
    fs.writeFileSync(filename, csvContent);

    console.log(`Export complete. Wrote ${rows.length} rows to ${filename}`);
  } catch (error) {
    console.error('Failed to export chat interactions:', error);
    process.exit(1);
  }
}

exportChatInteractionsForDate();
