import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Cloud, CloudRain, Wind, Thermometer, Ruler, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { fetchWeather } from '../services/weatherService';
import { generateOutfitRecommendations, generateVirtualPreview } from '../services/geminiService';
import { WeatherData, Style, Scene, ClothingItem, OutfitRecommendation, UserProfile } from '../types';
import { cn } from '../lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Daily() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [style, setStyle] = useState<Style>('Any');
  const [scene, setScene] = useState<Scene>('Any');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBodyModal, setShowBodyModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeRecIndex, setActiveRecIndex] = useState(0);

  useEffect(() => {
    fetchWeather().then(setWeather);
    if (auth.currentUser) {
      getDoc(doc(db, 'users', auth.currentUser.uid)).then(snap => {
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      });
    }
  }, []);

  const handleGenerate = async () => {
    console.log("Recommend button clicked");
    if (!auth.currentUser) {
      alert("Please log in first to use AI styling.");
      return;
    }
    if (!weather) {
      alert("Fetching local weather... Please wait a moment.");
      return;
    }
    setIsGenerating(true);
    setRecommendations([]);
    setPreviews([]);
    setActiveRecIndex(0);
    try {
      console.log("Fetching wardrobe...");
      // 1. Fetch wardrobe
      let wardrobeSnap;
      try {
        wardrobeSnap = await getDocs(query(collection(db, 'users', auth.currentUser!.uid, 'wardrobe')));
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${auth.currentUser?.uid}/wardrobe`);
        return; // handleFirestoreError throws, but for TS completeness
      }
      
      const wardrobe = wardrobeSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClothingItem));

      if (wardrobe.length === 0) {
        alert("Your wardrobe is empty! Please add some clothes in the 'Wardrobe' tab first so StyleMate can suggest outfits from your own collection.");
        setIsGenerating(false);
        return;
      }

      console.log(`Generating recommendations for ${wardrobe.length} items...`);
      // 2. Generate recommendations
      const recs = await generateOutfitRecommendations(wardrobe, weather, style, scene, profile || undefined);
      console.log("Recommendations received:", recs?.length);

      if (!recs || recs.length === 0) {
        throw new Error("StyleMate couldn't find a perfect match. Try changing your style/occasion or add more items to your wardrobe.");
      }
      setRecommendations(recs);

      console.log("Generating virtual previews...");
      // 3. Generate previews in parallel
      const previewPromises = recs.map(rec => generateVirtualPreview(rec, profile || undefined).catch(e => {
        console.error("Preview failed for a look:", e);
        return "";
      }));
      const generatedPreviews = await Promise.all(previewPromises);
      setPreviews(generatedPreviews);
    } catch (error: any) {
      console.error("HandleGenerate Error:", error);
      alert(`Styling Error: ${error.message || 'Unknown error'}. 
      
If you are seeing this, please check:
1. Your internet connection.
2. If this is a preview, wait a few seconds and try again.
3. Make sure you have added clothes to your closet.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="daily-page-container" className="p-6 space-y-8 animate-in fade-in duration-700">
      {/* Weather Card */}
      {weather && (
        <section id="weather-card" className="bg-white rounded-3xl p-6 shadow-sm border border-[#EBE9E4] flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[#A09D96] font-medium text-[10px] uppercase tracking-widest">
              <Sun size={14} className="text-[#5A5A40]" />
              <span>{weather.city} • Today</span>
            </div>
            <div className="text-4xl font-light text-[#1A1A1A] mt-1">{weather.temperature}°C</div>
            <div className="text-[#6B705C] text-sm italic font-medium">{weather.condition}</div>
          </div>
          <div className="text-right space-y-2">
            <div className="flex items-center justify-end space-x-2 text-[#8A8782] text-xs font-medium">
              <Thermometer size={14} /> <span>{weather.low}° / {weather.high}°</span>
            </div>
            <div className="flex items-center justify-end space-x-2 text-[#8A8782] text-xs font-medium">
              <CloudRain size={14} /> <span>{weather.precipProb}% Rain</span>
            </div>
          </div>
        </section>
      )}

      {/* Style & Scene Selectors */}
      <section className="space-y-8">
        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest font-bold text-[#A09D96] block px-1">Style Direction</label>
          <div className="flex flex-wrap gap-2">
            {(['Any', 'Casual', 'Gentle', 'Formal', 'Fitness', 'Elegant'] as Style[]).map(s => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-xs font-medium transition-all border",
                  style === s 
                    ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-md shadow-[#5A5A40]/20" 
                    : "bg-white text-[#5A5A40] border-[#D5D2CC] hover:bg-[#FDFDFB]"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] uppercase tracking-widest font-bold text-[#A09D96] block px-1">Today's Occasion</label>
          <div className="flex flex-wrap gap-2">
            {(['Any', 'Class', 'Work', 'Date', 'Outdoor', 'Weekend', 'Family'] as Scene[]).map(sc => (
              <button
                key={sc}
                onClick={() => setScene(sc)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-xs font-medium transition-all border",
                  scene === sc 
                    ? "bg-[#EAE8E2] text-[#5A5A40] border-[#D5D2CC] shadow-sm" 
                    : "bg-white text-[#A09D96] border-[#D5D2CC] hover:border-[#5A5A40]"
                )}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Actions */}
      <div id="action-buttons-container" className="space-y-4">
        <button
          id="body-measurements-btn"
          onClick={() => setShowBodyModal(true)}
          className="w-full bg-white border border-[#EBE9E4] text-[#5A5A40] py-4 rounded-2xl font-medium text-sm flex items-center justify-center space-x-3 active:scale-[0.98] transition-all group"
        >
          <Ruler size={18} className="text-[#A09D96]" />
          <span>Body: {profile?.height || '---'}cm / {profile?.weight || '---'}kg</span>
          <ChevronRight size={14} className="text-[#C4C1B9] group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          id="generate-look-btn"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-[#5A5A40] text-white py-5 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-3 shadow-xl shadow-[#5A5A40]/10 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
          <span>{isGenerating ? "Style Analysis..." : "Get AI Suggested Look"}</span>
        </button>
      </div>

      {/* Recommendation Result */}
      {recommendations.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#A09D96]">AI Suggested Looks</h3>
            <div className="flex space-x-2">
              {recommendations.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveRecIndex(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    activeRecIndex === idx ? "bg-[#5A5A40] w-6" : "bg-[#D5D2CC]"
                  )}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
               key={activeRecIndex}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="pt-4"
            >
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-[#EBE9E4] space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#5A5A40] animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">Option {activeRecIndex + 1}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-3xl italic text-[#1A1A1A]">Look {activeRecIndex + 1}</h3>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">评分</span>
                      <div className="flex items-center space-x-1">
                        {[0, 1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              const newRecs = [...recommendations];
                              newRecs[activeRecIndex] = { ...newRecs[activeRecIndex], rating: num };
                              setRecommendations(newRecs);
                            }}
                            className={cn(
                              "w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all border",
                              recommendations[activeRecIndex].rating === num
                                ? "bg-[#5A5A40] text-white border-[#5A5A40]"
                                : "bg-white text-stone-300 border-stone-100 hover:border-stone-300 text-stone-400"
                            )}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    {recommendations[activeRecIndex].rating !== undefined && (
                      <button
                        onClick={async () => {
                          if (auth.currentUser) {
                            // In a real app, we might save this to a 'feedback' collection
                            await addDoc(collection(db, 'users', auth.currentUser.uid, 'feedback'), {
                              recommendation: recommendations[activeRecIndex],
                              rating: recommendations[activeRecIndex].rating,
                              timestamp: serverTimestamp()
                            });
                          }
                          setShowFeedbackModal(true);
                        }}
                        className="text-[9px] uppercase font-bold text-rose-400 tracking-widest hover:text-rose-600 transition-colors"
                      >
                        提交评分 →
                      </button>
                    )}
                  </div>
                </div>
                  <p className="text-[#6B705C] text-sm leading-relaxed font-medium">{recommendations[activeRecIndex].recommendationReason}</p>
                </div>

                {previews[activeRecIndex] && (
                  <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-[#F7F6F2] border border-[#F0EFEA] relative group">
                    <img src={previews[activeRecIndex]} alt="Virtual Preview" className="w-full h-full object-cover grayscale-[20%]" referrerPolicy="no-referrer" />
                    <div className="absolute bottom-4 left-4 right-4 bg-white/40 backdrop-blur-md p-3 rounded-xl border border-white/50 text-center">
                      <p className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest">Virtual Preview</p>
                    </div>
                  </div>
                )}

                <div className="bg-[#F7F6F2] p-6 rounded-2xl space-y-3">
                   <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]">Stylist's Fit Note</h4>
                   <p className="text-[#6B705C] text-xs italic leading-relaxed">
                     {recommendations[activeRecIndex].bodyAdaptationAdvice}
                   </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Body Measurements Modal */}
      <AnimatePresence>
        {showBodyModal && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBodyModal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-[3rem] p-8 space-y-6 pb-12"
            >
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto" />
              <div className="space-y-1 text-center">
                <h2 className="text-2xl font-serif italic">Personal Stats</h2>
                <p className="text-stone-400 text-xs">Used for tailored fit advice & virtual scales</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Height (cm)', key: 'height' },
                  { label: 'Weight (kg)', key: 'weight' },
                  { label: 'Chest (cm)', key: 'chest' },
                  { label: 'Waist (cm)', key: 'waist' },
                  { label: 'Hip (cm)', key: 'hip' },
                ].map((f) => (
                  <div key={f.key} className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-stone-400 ml-1">{f.label}</label>
                    <input
                      type="number"
                      placeholder="--"
                      className="w-full bg-stone-50 border-stone-100 border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all font-mono"
                      value={(profile as any)?.[f.key] || ''}
                      onChange={(e) => {
                         const val = parseFloat(e.target.value);
                         setProfile(prev => ({ ...prev, [f.key]: val } as UserProfile));
                      }}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={async () => {
                  if (auth.currentUser) {
                    await updateDoc(doc(db, 'users', auth.currentUser.uid), { ...profile, updatedAt: serverTimestamp() });
                    // If doesn't exist, use setDoc. For brevity we assume profile exists if fetched.
                  }
                  setShowBodyModal(false);
                }}
                className="w-full bg-stone-900 text-white py-5 rounded-[2rem] font-medium shadow-xl shadow-stone-200 mt-4 active:scale-95 transition-transform"
              >
                Save Profile
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Feedback Confirmation Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
              onClick={() => setShowFeedbackModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[3rem] p-10 shadow-2xl space-y-6 max-w-sm"
            >
              <div className="bg-[#5A5A40] w-16 h-16 rounded-full flex items-center justify-center mx-auto text-white">
                <Sparkles size={28} />
              </div>
              <div className="space-y-3">
                <h3 className="font-serif text-2xl italic text-stone-900">已经了解您的喜好</h3>
                <p className="text-stone-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  感谢您的反馈！今后我将更加精准地按照您的风格喜好进行搭配推荐。
                </p>
              </div>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-[#5A5A40]/10 active:scale-[0.98] transition-all"
              >
                好的，期待下一次搭配
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
