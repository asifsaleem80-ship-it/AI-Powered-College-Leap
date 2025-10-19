import React, { useState, useCallback, useRef, lazy, Suspense, useEffect } from 'react';
import { analyzeScoreReport, getStudentAnalysis } from './services/geminiService';
import { LOCATIONS, DEGREE_PROGRAMS, SCHOLARSHIP_TYPES, GRANT_AMOUNTS, UNIVERSITY_SIZES, CAMPUS_SETTINGS } from './constants';
import type { FileData, College, StudentAnalysis } from './types';
import { CollegeCard } from './components/CollegeCard';
import { SummaryCard } from './components/SummaryCard';
import { DegreePathways } from './components/DegreePathways';
import { UploadIcon, LocationIcon, RocketIcon, GraduationCapIcon, UserCircleIcon, ChevronDownIcon } from './components/icons';
import { useI18n } from './hooks/useI18n';
import { useError } from './hooks/useError';
import { locales } from './i18n/locales';
import { readFileWithProgress } from './utils/fileReader';
import { Logo } from './components/Logo';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Footer } from './components/Footer';

// Lazy-loaded components
const ScoreGenerator = lazy(() => import('./components/ScoreGenerator').then(module => ({ default: module.ScoreGenerator })));
const Modal = lazy(() => import('./components/Modal').then(module => ({ default: module.Modal })));
const ChatModal = lazy(() => import('./components/ChatModal').then(module => ({ default: module.ChatModal })));


const Loader: React.FC<{text: string}> = ({ text }) => (
    <div className="flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-fuchsia-500"></div>
        <p className="text-lg text-fuchsia-300">{text}</p>
    </div>
);

const ScrollToTopButton: React.FC<{ isVisible: boolean; onClick: () => void; }> = ({ isVisible, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-50 p-3 rounded-full 
        bg-slate-800/50 backdrop-blur-md border border-white/10 shadow-lg 
        text-fuchsia-400 hover:bg-slate-700/70 hover:scale-110
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-fuchsia-500
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}
      `}
      aria-label="Scroll to top"
    >
      <span className="text-xl font-bold" aria-hidden="true">↑</span>
    </button>
  );
};


const App: React.FC = () => {
    const { t, setLocale, locale } = useI18n();
    const { setError } = useError();
    const [scoreFile, setScoreFile] = useState<FileData | null>(null);
    const [studentPicture, setStudentPicture] = useState<FileData | null>(null);
    const [location, setLocation] = useState<string>('Any / Undecided');
    const [degreeProgram, setDegreeProgram] = useState<string>(DEGREE_PROGRAMS[0]);
    const [universitySize, setUniversitySize] = useState<string>(UNIVERSITY_SIZES[0]);
    const [campusSetting, setCampusSetting] = useState<string>(CAMPUS_SETTINGS[0]);
    const [prioritizeRankings, setPrioritizeRankings] = useState<boolean>(false);
    const [wantsScholarship, setWantsScholarship] = useState<boolean>(false);
    const [scholarshipTypes, setScholarshipTypes] = useState<string[]>([]);
    const [minGrantAmount, setMinGrantAmount] = useState<string>(GRANT_AMOUNTS[0]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [analysis, setAnalysis] = useState<StudentAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingText, setLoadingText] = useState<string>('');
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [pictureUploadProgress, setPictureUploadProgress] = useState<number | null>(null);
    
    const mainContentRef = useRef<HTMLDivElement>(null);

    const [isScrollButtonVisible, setIsScrollButtonVisible] = useState(false);

    const ALL_SCHOLARSHIPS_KEY = 'All';
    const scholarshipOptions = [ALL_SCHOLARSHIPS_KEY, ...SCHOLARSHIP_TYPES];

    const handleScroll = useCallback(() => {
        if (window.pageYOffset > 300) {
            setIsScrollButtonVisible(true);
        } else {
            setIsScrollButtonVisible(false);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleScoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        setScoreFile(null);
        setUploadProgress(null);

        if (selectedFile) {
            setUploadProgress(0);

            readFileWithProgress({
                file: selectedFile,
                onProgress: setUploadProgress,
                onLoad: (fileData) => {
                    setScoreFile(fileData);
                },
                onError: (errorMessage) => {
                    setError(errorMessage);
                    setUploadProgress(null);
                },
                t,
            });
        }
    };

    const handlePictureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        setStudentPicture(null);
        setPictureUploadProgress(null);

        if (selectedFile) {
            setPictureUploadProgress(0);

            readFileWithProgress({
                file: selectedFile,
                onProgress: setPictureUploadProgress,
                onLoad: (fileData) => {
                    setStudentPicture(fileData);
                },
                onError: (errorMessage) => {
                    setError(errorMessage);
                    setPictureUploadProgress(null);
                },
                t,
            });
        }
    };

    const handleScholarshipTypeChange = (type: string) => {
        if (type === ALL_SCHOLARSHIPS_KEY) {
            if (scholarshipTypes.length === SCHOLARSHIP_TYPES.length) {
                setScholarshipTypes([]);
            } else {
                setScholarshipTypes([...SCHOLARSHIP_TYPES]);
            }
        } else {
            setScholarshipTypes(prev =>
                prev.includes(type)
                    ? prev.filter(t => t !== type)
                    : [...prev, type]
            );
        }
    };
    
    const runAnalysis = useCallback(async () => {
        if (!scoreFile) {
            setError(t.form.error.fileMissing);
            return;
        }
        setIsLoading(true);
        setColleges([]);
        setAnalysis(null);
        setLoadingText(t.results.loading.comprehensiveAnalysis);

        try {
            const languageName = locales[locale].languageName;
            const finalDegreeProgram = degreeProgram === DEGREE_PROGRAMS[0] ? '' : degreeProgram;

            // --- PERFORMANCE OPTIMIZATION: Parallelize API calls ---
            const [studentAnalysis, collegeResults] = await Promise.all([
                getStudentAnalysis(scoreFile, languageName),
                analyzeScoreReport(
                    scoreFile, 
                    location, 
                    finalDegreeProgram,
                    universitySize,
                    campusSetting,
                    prioritizeRankings,
                    wantsScholarship,
                    scholarshipTypes,
                    minGrantAmount, 
                    languageName
                )
            ]);
            
            setAnalysis(studentAnalysis);
            setColleges(collegeResults);

        } catch (err) {
            console.error("Analysis failed:", err);
            setError(t.error.aiService, runAnalysis);
        } finally {
            setIsLoading(false);
            setLoadingText('');
        }
    }, [scoreFile, location, degreeProgram, universitySize, campusSetting, prioritizeRankings, wantsScholarship, scholarshipTypes, minGrantAmount, t, locale, setError]);


    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        runAnalysis();
    }, [runAnalysis]);


    const scrollToContent = useCallback(() => {
        mainContentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const handleGetStartedClick = () => {
        scrollToContent();
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white selection:bg-fuchsia-500 selection:text-white isolate">
             <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 left-0 w-96 h-96 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-full opacity-20 blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 right-10 w-96 h-96 bg-gradient-to-r from-amber-500 to-pink-500 rounded-full opacity-20 blur-3xl animate-pulse [animation-delay:3s]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full opacity-10 blur-3xl"></div>
            </div>
            
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="py-6 flex justify-between items-center">
                    <Logo />
                    <div className="flex items-center gap-4">
                         <LanguageSwitcher />
                    </div>
                </header>

                <section className="text-center flex flex-col items-center justify-center min-h-[80vh] sm:min-h-[calc(100vh-100px)] py-10">
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400">
                            {t.hero.title}
                        </span>
                    </h1>
                    <p className="mt-6 text-lg text-gray-300 max-w-3xl mx-auto">
                        {t.hero.subtitle}
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button 
                            onClick={handleGetStartedClick}
                            className="px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-full transition-transform transform hover:scale-105 shadow-lg shadow-purple-500/20"
                        >
                            {t.hero.cta}
                        </button>
                    </div>
                </section>

                <main ref={mainContentRef} className="py-12 sm:py-20">
                    <div className="bg-gray-900/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/20">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-fuchsia-400 mb-1">{t.form.step1}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                                <fieldset className="md:col-span-2">
                                    <h3 className="text-lg font-semibold text-gray-300 mb-2">{t.form.uploadTitle}</h3>
                                    <label
                                        htmlFor="file-upload"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              (document.getElementById('file-upload') as HTMLInputElement)?.click();
                                            }
                                        }}
                                        className="relative flex flex-col items-center justify-center w-full py-6 sm:py-8 px-4 transition bg-white/5 border-2 border-white/10 border-dashed rounded-lg appearance-none cursor-pointer hover:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-fuchsia-500 min-h-[140px]"
                                    >
                                        {uploadProgress !== null && uploadProgress < 100 ? (
                                            <div className="w-full max-w-xs px-4">
                                                <span className="font-medium text-gray-300 text-center mb-2 block">
                                                    {t.form.uploading.replace('{progress}', String(uploadProgress))}
                                                </span>
                                                <div className="w-full bg-white/10 rounded-full h-2.5">
                                                    <div className="bg-fuchsia-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <UploadIcon className="w-10 h-10 text-gray-400 mb-2" />
                                                <span className="font-medium text-gray-300 text-center">
                                                    {scoreFile ? scoreFile.name : t.form.uploadStatus}
                                                </span>
                                                <span className="text-sm block text-gray-500">{t.form.uploadInstruction}</span>
                                            </>
                                        )}
                                        <input
                                            id="file-upload"
                                            type="file"
                                            accept="image/png, image/jpeg, application/pdf"
                                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleScoreFileChange}
                                            aria-describedby="file-error"
                                        />
                                    </label>
                                    <div className="text-center mt-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsGeneratorOpen(true)}
                                            className="text-sm text-fuchsia-400 hover:text-fuchsia-300 underline"
                                        >
                                            {t.form.generateSample}
                                        </button>
                                    </div>
                                </fieldset>

                                <fieldset className="flex flex-col items-center">
                                    <h3 className="text-lg font-semibold text-gray-300 mb-2">{t.form.uploadPictureTitle}</h3>
                                    <label
                                        htmlFor="picture-upload"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            (document.getElementById('picture-upload') as HTMLInputElement)?.click();
                                            }
                                        }}
                                        className="relative flex flex-col items-center justify-center w-40 h-40 transition bg-white/5 border-2 border-white/10 border-dashed rounded-full appearance-none cursor-pointer hover:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-fuchsia-500 overflow-hidden"
                                    >
                                        {studentPicture ? (
                                            <img src={`data:${studentPicture.mimeType};base64,${studentPicture.base64}`} alt={t.form.pictureAlt} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center p-2">
                                                <UserCircleIcon className="w-16 h-16 text-gray-400 mx-auto" />
                                                <span className="mt-2 text-xs font-medium text-gray-300">{t.form.uploadPictureStatus}</span>
                                            </div>
                                        )}
                                        {pictureUploadProgress !== null && pictureUploadProgress < 100 && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <div className="w-20 h-20">
                                                    <svg className="w-full h-full" viewBox="0 0 36 36" transform="rotate(-90)">
                                                        <circle
                                                            className="text-white/20"
                                                            cx="18" cy="18" r="15.9155"
                                                            fill="none" stroke="currentColor" strokeWidth="4"
                                                        />
                                                        <circle
                                                            className="text-fuchsia-500 transition-all duration-300"
                                                            cx="18" cy="18" r="15.9155"
                                                            fill="none" stroke="currentColor" strokeWidth="4"
                                                            strokeDasharray={`${pictureUploadProgress}, 100`}
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
                                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{pictureUploadProgress}%</span>
                                                </div>
                                            </div>
                                        )}
                                        <input
                                            id="picture-upload"
                                            type="file"
                                            accept="image/png, image/jpeg"
                                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handlePictureFileChange}
                                        />
                                    </label>
                                    <p className="text-xs text-center text-gray-400 mt-2">{t.form.uploadPictureInstruction}</p>
                                </fieldset>
                            </div>
                            
                            <div>
                                <h2 className="text-2xl font-bold text-fuchsia-400 mb-1">{t.form.step2}</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <fieldset>
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">{t.form.locationTitle}</label>
                                        <div className="relative">
                                            <LocationIcon className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                            <select
                                                id="location"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 rtl:pl-4 rtl:pr-12 pr-10 py-3 text-white focus:ring-fuchsia-500 focus:border-fuchsia-500 appearance-none"
                                            >
                                                {LOCATIONS.map(loc => {
                                                    if (typeof loc === 'string') {
                                                        return <option key={loc} value={loc} className="bg-slate-800 text-white">{loc}</option>;
                                                    }
                                                    return (
                                                        <optgroup key={loc.label} label={loc.label} className="bg-slate-700 text-gray-300 font-bold">
                                                            {loc.options.map(option => (
                                                                <option key={option} value={option} className="bg-slate-800 text-white">{option}</option>
                                                            ))}
                                                        </optgroup>
                                                    );
                                                })}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                <ChevronDownIcon className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </fieldset>

                                    <fieldset>
                                        <label htmlFor="degree" className="block text-sm font-medium text-gray-300 mb-2">{t.form.degreeTitle}</label>
                                        <div className="relative">
                                            <GraduationCapIcon className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                            <select
                                                id="degree"
                                                value={degreeProgram}
                                                onChange={(e) => setDegreeProgram(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 rtl:pl-4 rtl:pr-12 pr-10 py-3 text-white focus:ring-fuchsia-500 focus:border-fuchsia-500 appearance-none"
                                            >
                                                {DEGREE_PROGRAMS.map(program => <option key={program} value={program} className="bg-slate-800 text-white">{program}</option>)}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                <ChevronDownIcon className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </fieldset>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <fieldset>
                                        <label htmlFor="university-size" className="block text-sm font-medium text-gray-300 mb-2">{t.form.universitySize}</label>
                                        <div className="relative">
                                            <select
                                                id="university-size"
                                                value={universitySize}
                                                onChange={(e) => setUniversitySize(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-white focus:ring-fuchsia-500 focus:border-fuchsia-500 appearance-none"
                                            >
                                                {UNIVERSITY_SIZES.map(size => <option key={size} value={size} className="bg-slate-800 text-white">{size}</option>)}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                <ChevronDownIcon className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </fieldset>

                                    <fieldset>
                                        <label htmlFor="campus-setting" className="block text-sm font-medium text-gray-300 mb-2">{t.form.campusSetting}</label>
                                        <div className="relative">
                                            <select
                                                id="campus-setting"
                                                value={campusSetting}
                                                onChange={(e) => setCampusSetting(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-white focus:ring-fuchsia-500 focus:border-fuchsia-500 appearance-none"
                                            >
                                                {CAMPUS_SETTINGS.map(setting => <option key={setting} value={setting} className="bg-slate-800 text-white">{setting}</option>)}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                <ChevronDownIcon className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </fieldset>
                                </div>
                                
                                <fieldset>
                                    <label className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer p-1 w-fit">
                                        <input 
                                            type="checkbox"
                                            checked={prioritizeRankings}
                                            onChange={(e) => setPrioritizeRankings(e.target.checked)}
                                            className="form-checkbox h-5 w-5 rounded text-blue-500 bg-white/10 border-white/20 focus:ring-blue-500 focus:ring-offset-slate-900"
                                        />
                                        <span className="text-gray-300">{t.form.programRankings}</span>
                                    </label>
                                </fieldset>

                                <fieldset>
                                    <label className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer p-1 w-fit">
                                        <input 
                                            type="checkbox"
                                            checked={wantsScholarship}
                                            onChange={(e) => setWantsScholarship(e.target.checked)}
                                            className="form-checkbox h-5 w-5 rounded text-blue-500 bg-white/10 border-white/20 focus:ring-blue-500 focus:ring-offset-slate-900"
                                        />
                                        <span className="text-gray-300">{t.form.scholarshipLabel}</span>
                                    </label>
                                    
                                    {wantsScholarship && (
                                        <div className="mt-4 pl-8 rtl:pl-0 rtl:pr-8 space-y-4 border-l-2 rtl:border-l-0 rtl:border-r-2 border-white/10">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">{t.form.scholarshipTypes}</label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {scholarshipOptions.map(type => {
                                                        const isAllCheckbox = type === ALL_SCHOLARSHIPS_KEY;
                                                        const isAllChecked = scholarshipTypes.length === SCHOLARSHIP_TYPES.length;
                                                        
                                                        return (
                                                            <label key={type} className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer text-sm text-gray-300 bg-white/5 p-3 rounded-md hover:bg-white/10">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={isAllCheckbox ? isAllChecked : scholarshipTypes.includes(type)}
                                                                    onChange={() => handleScholarshipTypeChange(type)}
                                                                    className="form-checkbox h-4 w-4 rounded text-blue-500 bg-white/10 border-white/20 focus:ring-blue-500"
                                                                />
                                                                <span>{isAllCheckbox ? t.form.allLabel : type}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                             <div>
                                                <label htmlFor="grant-amount" className="block text-sm font-medium text-gray-300 mb-2">{t.form.minGrantAmount}</label>
                                                <div className="relative">
                                                    <select
                                                        id="grant-amount"
                                                        value={minGrantAmount}
                                                        onChange={(e) => setMinGrantAmount(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-10 py-3 text-white focus:ring-fuchsia-500 focus:border-fuchsia-500 appearance-none"
                                                    >
                                                        {GRANT_AMOUNTS.map(amount => <option key={amount} value={amount} className="bg-slate-800 text-white">{amount}</option>)}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                        <ChevronDownIcon className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </fieldset>
                            </div>


                            <button
                                type="submit"
                                disabled={isLoading || !scoreFile}
                                className="w-full flex items-center justify-center text-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-purple-500/20"
                            >
                                <RocketIcon className="w-6 h-6 mr-2 rtl:ml-2 rtl:mr-0" />
                                {isLoading ? t.form.buttonTextLoading : t.form.buttonText}
                            </button>
                        </form>
                    </div>
                    
                    <div className="mt-12 sm:mt-16" role="status" aria-live="polite">
                        {isLoading && <Loader text={loadingText} />}
                        {!isLoading && (analysis || colleges.length > 0) && (
                            <div className="space-y-8 sm:space-y-12">
                                <h2 className="text-3xl sm:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400">
                                    {analysis?.studentName 
                                        ? t.results.analysisTitlePersonalized.replace('{name}', analysis.studentName)
                                        : t.results.analysisTitle
                                    }
                                </h2>
                                
                                {analysis && <SummaryCard analysis={analysis} studentPicture={studentPicture} onStartChat={() => setIsChatOpen(true)} locale={locale} />}
                                {analysis && <DegreePathways pathways={analysis.pathways} locale={locale} />}
                                
                                {colleges.length > 0 && analysis && (
                                    <div className="pt-8 space-y-6">
                                        <h2 className="text-3xl sm:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400">{t.results.matchesTitle}</h2>
                                        {colleges.map((college, index) => (
                                            <CollegeCard 
                                                key={index} 
                                                college={college} 
                                                studentSummary={analysis.summary}
                                                languageName={locales[locale].languageName}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
            
            <Footer />

            <Suspense fallback={null}>
                <Modal isOpen={isGeneratorOpen} onClose={() => setIsGeneratorOpen(false)} title={t.scoreGenerator.title}>
                    <ScoreGenerator />
                </Modal>

                {analysis && colleges.length > 0 && (
                    <ChatModal
                        isOpen={isChatOpen}
                        onClose={() => setIsChatOpen(false)}
                        analysis={analysis}
                        colleges={colleges}
                        locale={locale}
                    />
                )}
            </Suspense>
            <ScrollToTopButton isVisible={isScrollButtonVisible} onClick={scrollToTop} />
        </div>
    );
};

export default App;