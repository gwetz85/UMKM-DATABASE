"use client"

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Search, User as UserIcon } from 'lucide-react';
import { useUser, useDatabase, useList, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { ref, query, equalTo, onValue, serverTimestamp, onDisconnect, update } from 'firebase/database';

export function ChatBubble() {
  const { user } = useUser();
  const database = useDatabase();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: allUsers } = useList(ref(database, 'system_users'));

  // Get current user profile - find in allUsers to avoid orderByChild
  const currentUserProfile = (allUsers || []).find((u: any) => u.uid === user?.uid) || {
    uid: user?.uid,
    fullName: user?.displayName || user?.email?.split('@')[0] || 'User',
    role: 'Pengguna'
  };

  const filteredUsers = (allUsers || []).filter((u: any) => 
    u.uid !== user?.uid && 
    u.isOnline === true &&
    (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.role?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Presence logic
  const presenceUpdatedRef = useRef(false);

  useEffect(() => {
    if (!user || !database || !currentUserProfile?.id) return;

    const userPresenceRef = ref(database, `system_users/${currentUserProfile.id}`);
    const connectedRef = ref(database, ".info/connected");

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Only update once per connection
        if (presenceUpdatedRef.current) return;
        presenceUpdatedRef.current = true;

        // When I disconnect, remove this device
        onDisconnect(userPresenceRef).update({ 
          isOnline: false,
          lastActive: serverTimestamp() 
        }).catch(err => console.error("onDisconnect error:", err));

        // When I am connected, update my status
        update(userPresenceRef, { 
          isOnline: true,
          lastActive: serverTimestamp() 
        }).catch(err => {
          if (err.code === 'PERMISSION_DENIED') {
            console.warn("Presence update permission denied.");
          }
        });
      } else {
        presenceUpdatedRef.current = false;
      }
    });

    return () => {
      unsubscribe();
      // Reset ref for potential re-mount
      presenceUpdatedRef.current = false;
    };
  }, [user?.uid, database, currentUserProfile?.id]);

  // Unread messages listener - manual filter
  useEffect(() => {
    if (!user || !database) return;
    const unreadRef = ref(database, 'chat_unread');
    const unsubscribe = onValue(unreadRef, (snapshot) => {
      let found = false;
      snapshot.forEach(child => {
        if (child.val().userId === user.uid) found = true;
      });
      setHasUnread(found);
    });
    return () => unsubscribe();
  }, [user, database]);

  // Real-time messages listener - manual filter
  useEffect(() => {
    if (!selectedUser || !user || !database) return;

    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    const messagesRef = ref(database, 'chat_messages');
    
    // Mark as read when opening
    if (isOpen) {
      deleteDocumentNonBlocking(ref(database, `chat_unread/${user.uid}_${chatId}`));
    }

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const msgList: any[] = [];
      snapshot.forEach(child => {
        const data = child.val();
        if (data.chatId === chatId) {
          msgList.push({
            id: child.key,
            ...data
          });
        }
      });
      msgList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(msgList);
    });

    return () => unsubscribe();
  }, [selectedUser, user, database, isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser || !user || !database) return;

    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    
    const messagesRef = ref(database, 'chat_messages');
    addDocumentNonBlocking(messagesRef, {
      chatId,
      senderId: user.uid,
      senderName: currentUserProfile?.fullName || 'User',
      receiverId: selectedUser.uid,
      text: inputText,
      timestamp: serverTimestamp()
    });

    const unreadRef = ref(database, `chat_unread/${selectedUser.uid}_${chatId}`);
    setDocumentNonBlocking(unreadRef, {
      userId: selectedUser.uid,
      chatId: chatId,
      hasUnread: true
    });

    setInputText('');
  };

  if (!user || !currentUserProfile) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[1000] print:hidden flex flex-col items-end">
      {/* Chat Bubble Button */}
      {!isOpen && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsOpen(true)}
            className="chat-bubble-active transition-transform hover:scale-105"
            style={{
              width: '60px', height: '60px', borderRadius: '30px', background: 'hsl(var(--primary))',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.5)', border: 'none', cursor: 'pointer'
            }}
          >
            <MessageSquare size={28} />
          </button>
          {hasUnread && (
            <div style={{
              position: 'absolute', top: 0, right: 0, width: '18px', height: '18px',
              background: '#ef4444', borderRadius: '50%', border: '2px solid white',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }} />
          )}
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="animate-in slide-in-from-bottom-5 fade-in duration-300 bg-white" style={{
          width: 'calc(100vw - 2rem)', maxWidth: '380px', height: '75vh', maxHeight: '550px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', 
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '24px',
          position: 'absolute', bottom: 'calc(100% + 1rem)', right: '0'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '1.25rem 1.5rem', background: 'hsl(var(--primary))', color: 'white',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {selectedUser ? (
                <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}>
                  ←
                </button>
              ) : <MessageSquare size={20} />}
              <span style={{ fontWeight: 800, fontSize: '1rem' }}>{selectedUser ? selectedUser.fullName : 'Pusat Diskusi'}</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}>
              <X size={20} />
            </button>
          </div>

          {!selectedUser ? (
            /* Contact List View */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
              <div style={{ padding: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, color: '#000' }} />
                  <input
                    type="text"
                    placeholder="Cari pengguna..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '14px',
                      background: 'white', border: '1px solid #e5e7eb',
                      color: '#1a1a1a', outline: 'none', fontSize: '0.9rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 1rem 0.75rem' }}>
                {filteredUsers.map((u: any) => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-gray-100 transition-colors"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                      borderRadius: '16px', cursor: 'pointer',
                      marginBottom: '0.5rem', background: 'white', border: '1px solid transparent'
                    }}
                  >
                    <div style={{ 
                      width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(37, 99, 235, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))'
                    }}>
                      <UserIcon size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a' }}>{u.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase' }}>{u.role}</div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center p-8 text-sm text-gray-500 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                       <Search size={24} />
                    </div>
                    <p className="font-medium">Tidak ada pengguna yang sedang online.</p>
                    <p className="text-[10px] uppercase tracking-wider opacity-60">Coba lagi beberapa saat lagi</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Conversation View */
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#fdfdfd' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: '2rem', color: '#9ca3af', fontSize: '0.85rem', padding: '0 2rem' }}>
                    Sapa {selectedUser.fullName} dengan pesan pertama Anda!
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.senderId === user.uid ? 'flex-end' : 'flex-start',
                      maxWidth: '85%', display: 'flex', flexDirection: 'column',
                      alignItems: msg.senderId === user.uid ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      padding: '0.75rem 1.1rem', borderRadius: '18px',
                      borderBottomLeftRadius: msg.senderId === user.uid ? '18px' : '4px',
                      borderBottomRightRadius: msg.senderId === user.uid ? '4px' : '18px',
                      background: msg.senderId === user.uid ? 'hsl(var(--primary))' : '#f3f4f6',
                      color: msg.senderId === user.uid ? 'white' : '#1f2937', 
                      fontSize: '0.95rem', lineHeight: '1.5', fontWeight: 500,
                      boxShadow: msg.senderId === user.uid ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none'
                    }}>
                      {msg.text}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.4rem', fontWeight: 500 }}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} style={{ padding: '1.25rem', background: 'white', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Tulis pesan..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{
                    flex: 1, padding: '0.85rem 1.25rem', borderRadius: '14px',
                    background: '#f9fafb', border: '1px solid #e5e7eb',
                    color: '#1a1a1a', outline: 'none', transition: 'all 0.2s',
                    fontSize: '0.95rem'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'hsl(var(--primary))'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="hover:scale-105 transition-transform"
                  style={{
                    width: '50px', height: '50px', borderRadius: '14px', background: 'hsl(var(--primary))',
                    color: 'white', border: 'none', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <Send size={20} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
