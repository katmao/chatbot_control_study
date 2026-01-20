const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');
const fs = require('fs');

// Firebase configuration (same as your .env.local)
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

async function exportChatData() {
  try {
    console.log('Starting export...');
    
    // Get all chat interactions
    const q = query(collection(db, 'chat_interactions'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.size} chat interactions`);
    
    // Create CSV header
    const csvHeader = 'Timestamp,User Message,Assistant Message,Turn Number,Session ID,Prolific PID\n';
    
    // Create CSV rows
    const csvRows = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp.toDate().toISOString();
      const userMessage = `"${data.userMessage.replace(/"/g, '""')}"`;
      const assistantMessage = `"${data.assistantMessage.replace(/"/g, '""')}"`;
      const row = `${timestamp},${userMessage},${assistantMessage},${data.turnNumber},${data.sessionId},${data.prolificPid}`;
      csvRows.push(row);
    });
    
    const csvContent = csvHeader + csvRows.join('\n');
    
    // Save to file
    const filename = `chat_interactions_${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(filename, csvContent);
    
    console.log(`✅ Export completed! File saved as: ${filename}`);
    console.log(`📊 Total interactions exported: ${querySnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

// Run the export
exportChatData(); 