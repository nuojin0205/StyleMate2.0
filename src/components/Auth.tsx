import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';

export default function Auth() {
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
            onClick={() => signInWithGoogle()}
            className="w-full bg-stone-900 text-white py-4 px-8 rounded-full font-medium shadow-xl shadow-stone-200 hover:bg-stone-800 transition-all flex items-center justify-center space-x-3"
          >
            <span>Continue with Google</span>
          </button>
        </div>
      </motion.div>
      
      <div className="absolute bottom-12 text-[10px] uppercase tracking-[0.2em] text-stone-300 font-bold">
        Elegance in every pixel
      </div>
    </div>
  );
}
