"use client"

import { useState, useEffect } from 'react';
import { useDatabase, useUser, useObject, useMemoFirebase, deleteDocumentNonBlocking, useList } from '@/firebase';
import { ref, query, onValue, orderByChild, equalTo, get } from 'firebase/database';
import { MessageSquare, ShieldAlert, Trash2 } from 'lucide-react';

export default function ChatMonitoring() {
  const { user } = useUser();
  const database = useDatabase();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Admin Check
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null;
    return ref(database, `roles_admin/${user.uid}`);
  }, [user, database]);
  const { data: adminRole } = useObject(adminRef);

  // Get users for name lookup
  const usersQuery = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'system_users'));
  }, [database]);
  const { data: allUsers } = useList(usersQuery);

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id');

  const handleDeleteSession = async (chatId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat percakapan ini secara permanen?')) return;
    
    if (!database) return;

    try {
      // Get all messages in chat
      const messagesQuery = query(ref(database, 'chat_messages'), orderByChild('chatId'), equalTo(chatId));
      const snapshot = await get(messagesQuery);
      
      // Delete each message
      snapshot.forEach(child => {
        deleteDocumentNonBlocking(child.ref);
      });

      // Clear related unread triggers just in case
      const parts = chatId.split('_');
      parts.forEach(uid => {
        deleteDocumentNonBlocking(ref(database, `chat_unread/${uid}_${chatId}`));
      });

      setSelectedSessionId(null);
      alert('Percakapan telah dihapus.');
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus percakapan.');
    }
  };

  useEffect(() => {
    if (!database || !isAdmin) return;

    const messagesQuery = query(ref(database, 'chat_messages'), orderByChild('timestamp'));
    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const messagesByChatId: Record<string, any[]> = {};
      
      snapshot.forEach(child => {
        const data = { id: child.key, ...child.val() };
        if (!data.timestamp) data.timestamp = Date.now();
        if (!messagesByChatId[data.chatId]) {
          messagesByChatId[data.chatId] = [];
        }
        messagesByChatId[data.chatId].push(data);
      });

      const sessionList = Object.keys(messagesByChatId).map(chatId => {
        const msgs = messagesByChatId[chatId];
        const lastMsg = msgs[msgs.length - 1];
        
        // Try to decode participant names
        const participants = chatId.split('_');
        const user1Obj = allUsers?.find((u: any) => u.uid === participants[0]);
        const user2Obj = allUsers?.find((u: any) => u.uid === participants[1]);
        
        const user1 = user1Obj?.fullName || participants[0];
        const user2 = user2Obj?.fullName || participants[1];

        return {
          id: chatId,
          user1,
          user2,
          lastMessage: lastMsg.text,
          timestamp: lastMsg.timestamp,
          messages: msgs
        };
      }).sort((a, b) => b.timestamp - a.timestamp);
      
      setSessions(sessionList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [database, isAdmin, allUsers]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
        <ShieldAlert size={64} className="text-destructive mb-4" />
        <h2 className="text-3xl font-black mb-2">Akses Ditolak</h2>
        <p className="text-muted-foreground">Hanya Administrator yang dapat mengakses halaman monitoring chat.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-10">
        <h1 className="flex items-center gap-3 text-3xl font-black mb-2 text-primary font-headline">
          <div className="bg-primary text-white p-2.5 rounded-xl flex shadow-sm">
            <MessageSquare size={28} />
          </div>
          Monitoring Chat
        </h1>
        <p className="text-muted-foreground font-medium">Audit seluruh percakapan antar pengguna aplikasi secara real-time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-6 h-[70vh]">
        {/* Session List */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 overflow-y-auto">
          <h3 className="text-lg font-bold mb-4 px-2 text-slate-800">Sesi Aktif</h3>
          {sessions.length === 0 && !loading && <div className="text-center p-8 text-muted-foreground">Belum ada obrolan.</div>}
          {loading && <div className="text-center p-8 text-primary font-bold">Memuat data...</div>}
          
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => setSelectedSessionId(session.id)}
              className={`p-4 rounded-2xl cursor-pointer mb-2 transition-all duration-200 border-2 ${
                selectedSessionId === session.id 
                  ? 'border-primary bg-primary/10 shadow-sm' 
                  : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <div className="font-bold text-sm mb-1 text-slate-800">{session.user1} ↔ {session.user2}</div>
              <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis mb-2">
                {session.lastMessage}
              </div>
              <div className="text-[10px] font-bold text-primary">
                {new Date(session.timestamp).toLocaleString('id-ID')}
              </div>
            </div>
          ))}
        </div>

        {/* Content Viewer */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          {selectedSessionId ? (
            <>
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Detail Percakapan</h3>
                  <span className="text-xs text-muted-foreground font-mono">ID: {selectedSessionId}</span>
                </div>
                <button 
                  onClick={() => handleDeleteSession(selectedSessionId)}
                  className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs transition-colors"
                >
                  <Trash2 size={16} /> Hapus History
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {sessions.find(s => s.id === selectedSessionId)?.messages.map((msg: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">{msg.senderName}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{new Date(msg.timestamp).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border-l-4 border-l-primary text-sm shadow-sm text-slate-700 font-medium">
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <ShieldAlert size={64} className="mb-4 text-slate-200" />
              <p className="font-medium text-slate-500">Pilih salah satu sesi untuk melihat detail pesan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
