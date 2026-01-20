const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, where, Timestamp } = require('firebase/firestore');
const fs = require('fs');

// Firebase configuration (aligned with export-voice-interactions.js)
const firebaseConfig = {
  apiKey: "AIzaSyBkkGt1qlQK62dGzxi4AK1aZC5H2A7DPxY",
  authDomain: "chatroom-66981.firebaseapp.com",
  projectId: "chatroom-66981",
  storageBucket: "chatroom-66981.firebasestorage.app",
  messagingSenderId: "919496165622",
  appId: "1:919496165622:web:2557bcce7f1bbfab6ec4d7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function getYesterdayRangeUTC() {
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();

  // Start of today UTC
  const startOfTodayUTC = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0, 0));
  // Start of yesterday UTC
  const startOfYesterdayUTC = new Date(startOfTodayUTC.getTime() - 24 * 60 * 60 * 1000);
  // End of yesterday UTC
  const endOfYesterdayUTC = new Date(startOfTodayUTC.getTime() - 1);

  return { start: startOfYesterdayUTC, end: endOfYesterdayUTC };
}

async function exportYesterdayChatInteractions() {
  try {
    console.log('Starting chat export for yesterday (UTC)...');

    const { start, end } = getYesterdayRangeUTC();
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
    console.log(`Found ${querySnapshot.size} chat interactions for ${start.toISOString().slice(0, 10)} (UTC)`);

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
    const datePart = getYesterdayRangeUTC().start.toISOString().slice(0, 10);
    const filename = `chat_interactions_${datePart}.csv`;
    fs.writeFileSync(filename, csvContent);

    console.log(`✅ Export completed! File saved as: ${filename}`);
    console.log(`📊 Total interactions exported: ${interactions.length}`);
  } catch (error) {
    console.error('❌ Chat export failed:', error);
  }
}

exportYesterdayChatInteractions();


