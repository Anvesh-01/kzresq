"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Activity, Clock, MapPin, Menu, Shield, X, Zap, Languages } from "lucide-react";

const translations = {
  en: {
    login: "Login",
    signUp: "Sign Up",
    emergencySystem: "24/7 Emergency Response System",
    heroTitle: "Smart Emergency Medical",
    heroSubtitle: "Response Network",
    emergencyQuestion: "Emergency Situation?",
    sos: "SOS",
    noLogin: "No login required",
    gpsCapture: "GPS auto-capture • Instant hospital notification",
    feature1Title: "Lightning Fast",
    feature1Desc: "Instant GPS-based hospital and police coordination with automated dispatch.",
    feature2Title: "Pre-Arrival Ready",
    feature2Desc: "Hospitals receive patient vitals and emergency details before arrival.",
    feature3Title: "Live Ambulance Tracking",
    feature3Desc: "Real-time tracking of assigned ambulances with ETA and route updates.",
    stat1Value: "<5 min",
    stat1Label: "Average Response",
    stat2Value: "24/7",
    stat2Label: "Always Active",
    stat3Value: "100+",
    stat3Label: "Partner Hospitals",
    stat4Value: "98%",
    stat4Label: "Success Rate",
    footerQuote: "Speeding care when it matters most.",
    translateBtn: "മലയാളം",
  },
  ml: {
    login: "ലോഗിൻ",
    signUp: "സൈൻ അപ്പ്",
    emergencySystem: "24/7 എമർജൻസി റെസ്പോൺസ് സിസ്റ്റം",
    heroTitle: "സ്മാർട്ട് എമർജൻസി മെഡിക്കൽ",
    heroSubtitle: "റെസ്പോൺസ് ശൃംഖല",
    emergencyQuestion: "അടിയന്തിര സാഹചര്യം?",
    sos: "SOS",
    noLogin: "ലോഗിൻ ആവശ്യമില്ല",
    gpsCapture: "GPS ഓട്ടോ-ക്യാപ്‌ചർ • തൽക്ഷണ ആശുപത്രി അറിയിപ്പ്",
    feature1Title: "മിന്നൽ വേഗത",
    feature1Desc: "തൽക്ഷണ GPS അധിഷ്ഠിത ആശുപത്രി, പോലീസ് ഏകോപനം.",
    feature2Title: "നേരത്തെയുള്ള തയ്യാറെടുപ്പ്",
    feature2Desc: "രോഗി എത്തുന്നതിന് മുമ്പ് തന്നെ ആശുപത്രികൾക്ക് വിവരങ്ങൾ ലഭിക്കുന്നു.",
    feature3Title: "ലൈവ് ആംബുലൻസ് ട്രാക്കിംഗ്",
    feature3Desc: "ആംബുലൻസുകളുടെ തത്സമയ ട്രാക്കിംഗും സമയ വിവരങ്ങളും.",
    stat1Value: "<5 മിനിറ്റ്",
    stat1Label: "ശരാശരി പ്രതികരണം",
    stat2Value: "24/7",
    stat2Label: "എപ്പോഴും സജ്ജം",
    stat3Value: "100+",
    stat3Label: "പങ്കാളി ആശുപത്രികൾ",
    stat4Value: "98%",
    stat4Label: "വിജയശതമാനം",
    footerQuote: "ഏറ്റവും ആവശ്യമുള്ള നിമിഷങ്ങളിൽ വേഗത്തിൽ പരിചരണം ഉറപ്പാക്കുന്നു.",
    translateBtn: "English",
  }
};

export default function LandingPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "ml">("en");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const t = translations[lang];

  const toggleLang = () => setLang(lang === "en" ? "ml" : "en");

  const closeMenu = (callback?: () => void) => {
    setIsClosing(true);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsClosing(false);
      if (callback) callback();
    }, 300); // Matches animate-slideUpFadeExit duration
  };

  const toggleMenu = () => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      setIsMenuOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50">
      {/* HEADER */}
      <header className="sticky top-0 z-50 glass-effect border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 md:w-14 md:h-14">
              <Image
                src="/KenLogo.png"
                alt="Ken Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">KEN</h1>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleLang}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-emerald-600 font-medium transition-colors"
            >
              <Languages className="w-5 h-5" />
              {t.translateBtn}
            </button>
            <button
              onClick={() => router.push("/user/sign-in")}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              {t.login}
            </button>
            <button
              onClick={() => router.push("/user/sign-up")}
              className="px-5 py-2.5 gradient-bg-success text-white rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              {t.signUp}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={toggleLang}
              className="p-2 text-gray-600 hover:text-emerald-600 transition-colors"
              title={t.translateBtn}
            >
              <Languages className="w-6 h-6" />
            </button>
            <button
              onClick={toggleMenu}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors z-[60]"
            >
              {isMenuOpen && !isClosing ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Professional Mobile Nav Overlay */}
        {(isMenuOpen || isClosing) && (
          <>
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black/20 z-[55] ${isClosing ? 'animate-backdrop-exit' : 'animate-backdrop-fade'}`}
              onClick={() => closeMenu()}
            />

            {/* Menu Content */}
            <div className={`fixed top-[88px] left-4 right-4 bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl z-[58] overflow-hidden ${isClosing ? 'animate-slideUpFadeExit' : 'animate-slideDownFade'}`}>
              <div className="flex flex-col p-6 gap-6">
                {/* Logo Section in Menu */}
                <div className="flex items-center gap-3 pb-2 animate-slideDownFade animate-stagger-1">
                  <div className="relative w-12 h-12">
                    <Image
                      src="/KenLogo.png"
                      alt="Ken Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-xl font-bold text-gray-900 tracking-tight">ResQNet</span>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => { closeMenu(() => router.push("/user/sign-in")); }}
                    className="w-full py-4 px-6 border border-gray-200 rounded-2xl text-gray-700 font-semibold text-center hover:bg-gray-50 active:bg-gray-100 transition-all animate-slideDownFade animate-stagger-2"
                  >
                    {t.login}
                  </button>
                  <button
                    onClick={() => { closeMenu(() => router.push("/user/sign-up")); }}
                    className="w-full py-4 px-6 gradient-bg-success text-white rounded-2xl font-bold text-center shadow-lg hover:shadow-xl active:scale-[0.98] transition-all animate-slideDownFade animate-stagger-3"
                  >
                    {t.signUp}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* HERO SECTION */}
      <main className="-mt-7 max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center text-center pt-12 md:pt-20 pb-12 md:pb-16 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs md:text-sm font-medium mb-6 animate-fade-in shadow-sm">
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse-slow"></div>
            {t.emergencySystem}
          </div>

          <h2 className="text-3xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight text-balance max-w-4xl leading-[1.1]">
            {t.heroTitle}{" "}
            <span className="text-2xl md:text-5xl bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
              {t.heroSubtitle}
            </span>
          </h2>


          {/* SOS SECTION */}
          <div className="bg-white border-2 border-emerald-200 rounded-[2rem] p-6 md:p-10 w-full max-w-sm md:max-w-md mb-16 shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-pulse-slow"></div>
              <p className="text-emerald-700 font-bold text-base md:text-lg">
                {t.emergencyQuestion}
              </p>
            </div>

            <button
              onClick={() => router.push("/user/sos")}
              className="w-40 h-40 md:w-56 md:h-56 gradient-bg-emergency text-white text-3xl md:text-4xl font-bold rounded-full shadow-lg hover:shadow-2xl active:scale-90 transition-all duration-300 animate-emergency-pulse mb-8 flex flex-col items-center justify-center gap-2 border-4 md:border-8 border-white ring-8 ring-red-50"
            >
              <Zap className="w-10 h-10 md:w-12 md:h-12" />
              {t.sos}
            </button>

            <div className="space-y-3 text-center">
              <p className="text-sm text-gray-700 flex items-center justify-center gap-2 font-medium">
                <Shield className="w-4 h-4 text-emerald-600" />
                {t.noLogin}
              </p>
              <p className="text-[11px] md:text-xs text-gray-500 max-w-[200px] md:max-w-none">
                {t.gpsCapture}
              </p>
            </div>
          </div>

          {/* FEATURES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl">
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-emerald-600" />}
              title={t.feature1Title}
              description={t.feature1Desc}
            />
            <FeatureCard
              icon={<Activity className="w-6 h-6 text-green-600" />}
              title={t.feature2Title}
              description={t.feature2Desc}
            />
            <FeatureCard
              icon={<MapPin className="w-6 h-6 text-teal-600" />}
              title={t.feature3Title}
              description={t.feature3Desc}
            />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white/50 mt-12 md:mt-20">
        <div className="max-w-7xl mx-auto px-6 py-10 md:py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 md:w-12 md:h-12">
                <Image
                  src="/KenLogo.png"
                  alt="Ken Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-gray-900 font-bold text-lg">KEN</span>
            </div>
            <p className="text-sm text-gray-600 text-center md:text-left">
              © {new Date().getFullYear()} ResQNet. {t.footerQuote}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Feature Card ---------- */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group bg-white border border-gray-200 rounded-2xl p-6 text-left shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300 transform hover:-translate-y-1">
      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-100 transition-colors duration-200">
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-2 text-lg">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* ---------- Stat Card ---------- */
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow duration-200">
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
