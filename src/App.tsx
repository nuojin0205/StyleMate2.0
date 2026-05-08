import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from './lib/utils';
import { Sparkles, Shirt, Smartphone, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components (to be created)
import Daily from './components/Daily';
import Wardrobe from './components/Wardrobe';
import Inspiration from './components/Inspiration';
import Auth from './components/Auth';

function Navigation({ user }: { user: User | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  if (!user || location.pathname === '/auth') return null;

  const tabs = [
    { path: '/daily', label: 'Daily', icon: Sparkles },
    { path: '/wardrobe', label: 'Wardrobe', icon: Shirt },
    { path: '/inspiration', label: 'Inspiration', icon: Smartphone },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[#EBE9E4] px-12 pb-safe pt-2 z-50">
      <div className="max-w-md mx-auto flex justify-between items-center h-20">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 transition-all relative px-4",
                isActive ? "text-[#5A5A40] scale-110" : "text-[#A09D96] opacity-60 hover:opacity-100"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                isActive ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" : ""
              )}>
                <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Wrapper for Tab-like navigation using Routes
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Initialize user profile if not exists
        const userRef = doc(db, 'users', u.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAF9F6]">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-rose-400 font-serif italic text-2xl"
        >
          StyleMate
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#FAF9F6] text-stone-900 pb-32 font-sans selection:bg-rose-100">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/daily" />} />
            <Route path="/daily" element={user ? <Daily /> : <Navigate to="/auth" />} />
            <Route path="/wardrobe" element={user ? <Wardrobe /> : <Navigate to="/auth" />} />
            <Route path="/inspiration" element={user ? <Inspiration /> : <Navigate to="/auth" />} />
            <Route path="/" element={<Navigate to={user ? "/daily" : "/auth"} />} />
          </Routes>
        </AnimatePresence>
        
        <Navigation user={user} />
      </div>
    </Router>
  );
}
