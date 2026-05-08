import { useState } from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';

export default function Auth() {
const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-sm"
      >
        <h1 className="text-5xl font-serif italic text-rose-500 tracking-tight">StyleMate</h1>
        <p className="text-stone-500 font-medium">
          Your AI-powered fashion concierge. 
          Curating your wardrobe for every weather, scene, and mood.
        </p>
        
        <div className="pt-8">
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-stone-900 text-white py-4 px-8 rounded-full font-medium shadow-xl shadow-stone-200 hover:bg-stone-800 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {isLoggingIn ? (
              <span className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting...</span>
              </span>
            ) : (
              <span>Continue with Google</span>
            )}
          </button>
        </div>
      </motion.div>
      
      <div className="absolute bottom-12 text-[10px] uppercase tracking-[0.2em] text-stone-300 font-bold">
        Elegance in every pixel
      </div>
    </div>
  );
}
