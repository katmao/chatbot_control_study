import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

// Your Firebase configuration
// You'll need to replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('Firebase config:', {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'NOT SET',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'SET' : 'NOT SET',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'SET' : 'NOT SET',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'SET' : 'NOT SET'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('Firebase initialized successfully');

// Chat interaction interface
export interface ChatInteraction {
  timestamp: Timestamp;
  userMessage: string;
  assistantMessage: string;
  turnNumber: number;
  sessionId: string;
  prolificPid: string; // Add Prolific participant ID
}

// Log a chat interaction
export const logChatInteraction = async (interaction: Omit<ChatInteraction, 'timestamp'>) => {
  try {
    console.log('Attempting to log chat interaction:', interaction);
    const docRef = await addDoc(collection(db, 'chat_interactions'), {
      ...interaction,
      timestamp: Timestamp.now()
    });
    console.log('Chat interaction logged with ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error logging chat interaction: ', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error && 'code' in error ? (error as any).code : 'Unknown code',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw error;
  }
};

// Get all chat interactions
export const getChatInteractions = async () => {
  try {
    const q = query(collection(db, 'chat_interactions'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const interactions: ChatInteraction[] = [];
    querySnapshot.forEach((doc) => {
      interactions.push(doc.data() as ChatInteraction);
    });
    return interactions;
  } catch (error) {
    console.error('Error getting chat interactions: ', error);
    throw error;
  }
};

// Get chat interactions by Prolific PID
export const getChatInteractionsByPid = async (prolificPid: string) => {
  try {
    const q = query(
      collection(db, 'chat_interactions'), 
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const interactions: ChatInteraction[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as ChatInteraction;
      if (data.prolificPid === prolificPid) {
        interactions.push(data);
      }
    });
    return interactions;
  } catch (error) {
    console.error('Error getting chat interactions by PID: ', error);
    throw error;
  }
};

// Export chat interactions as CSV
export const exportChatInteractionsAsCSV = async () => {
  try {
    const interactions = await getChatInteractions();
    
    // Create CSV header
    const csvHeader = 'Timestamp,User Message,Assistant Message,Turn Number,Session ID,Prolific PID\n';
    
    // Create CSV rows
    const csvRows = interactions.map(interaction => {
      const timestamp = interaction.timestamp.toDate().toISOString();
      const userMessage = `"${interaction.userMessage.replace(/"/g, '""')}"`;
      const assistantMessage = `"${interaction.assistantMessage.replace(/"/g, '""')}"`;
      return `${timestamp},${userMessage},${assistantMessage},${interaction.turnNumber},${interaction.sessionId},${interaction.prolificPid}`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `chat_interactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return csvContent;
  } catch (error) {
    console.error('Error exporting chat interactions: ', error);
    throw error;
  }
};

// Export chat interactions for specific Prolific PID as CSV
export const exportChatInteractionsByPidAsCSV = async (prolificPid: string) => {
  try {
    const interactions = await getChatInteractionsByPid(prolificPid);
    
    // Create CSV header
    const csvHeader = 'Timestamp,User Message,Assistant Message,Turn Number,Session ID,Prolific PID\n';
    
    // Create CSV rows
    const csvRows = interactions.map(interaction => {
      const timestamp = interaction.timestamp.toDate().toISOString();
      const userMessage = `"${interaction.userMessage.replace(/"/g, '""')}"`;
      const assistantMessage = `"${interaction.assistantMessage.replace(/"/g, '""')}"`;
      return `${timestamp},${userMessage},${assistantMessage},${interaction.turnNumber},${interaction.sessionId},${interaction.prolificPid}`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `chat_interactions_${prolificPid}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return csvContent;
  } catch (error) {
    console.error('Error exporting chat interactions by PID: ', error);
    throw error;
  }
};

export { db }; 