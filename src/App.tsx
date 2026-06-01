/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Film, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Users, 
  Search, 
  Sparkles, 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  Award,
  BookOpen,
  X,
  FileText,
  MessageSquare,
  Sparkle,
  ArrowRight,
  TrendingUp as TrendingUpIcon
} from "lucide-react";
import { DailyBoxOfficeItem, BoxOfficeResponse, MovieInfo, MovieInfoResponse } from "./types";

// Helper function to get yesterday's date in KST (Korean Standard Time) YYYY-MM-DD
const getYesterdayString = (): string => {
  const now = new Date();
  // Adjust to KST (UTC+9) to handle updates consistently
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (3600000 * 9));
  
  const yesterday = new Date(kst);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const yesterdayDateStr = getYesterdayString();
  const [selectedDate, setSelectedDate] = useState<string>(yesterdayDateStr);
  const [boxOfficeList, setBoxOfficeList] = useState<DailyBoxOfficeItem[]>([]);
  const [showRange, setShowRange] = useState<string>("");
  const [loadingBoxOffice, setLoadingBoxOffice] = useState<boolean>(false);
  const [boxOfficeError, setBoxOfficeError] = useState<string | null>(null);
  
  // Selected single movie for Dossier Modal
  const [selectedMovieCd, setSelectedMovieCd] = useState<string | null>(null);
  const [movieDetail, setMovieDetail] = useState<MovieInfo | null>(null);
  const [loadingMovie, setLoadingMovie] = useState<boolean>(false);
  const [movieError, setMovieError] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  // Client side filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterNewOnly, setFilterNewOnly] = useState<boolean>(false);

  // AI Review Composer states
  const [briefReview, setBriefReview] = useState<string>("");
  const [savedReviews, setSavedReviews] = useState<Record<string, string>>({});
  const [loadingExpansion, setLoadingExpansion] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Load reviews from local storage on mount
  useEffect(() => {
    try {
      const data = localStorage.getItem("editorial_movie_reviews");
      if (data) {
        setSavedReviews(JSON.parse(data));
      }
    } catch (e) {
      console.error("Failed to load saved reviews:", e);
    }
  }, []);

  // Fetch Box Office
  useEffect(() => {
    async function fetchBoxOffice() {
      if (!selectedDate) return;
      setLoadingBoxOffice(true);
      setBoxOfficeError(null);
      
      const targetDt = selectedDate.replace(/-/g, "");
      try {
        const res = await fetch(`/api/boxoffice?date=${targetDt}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "일일 박스오피스 데이터를 불러오는데 실패했습니다.");
        }
        
        const data: BoxOfficeResponse = await res.json();
        const list = data.boxOfficeResult?.dailyBoxOfficeList || [];
        setBoxOfficeList(list);
        setShowRange(data.boxOfficeResult?.showRange || "");
        
        // Quietly set selected Cd to first element but don't force open popup instantly
        if (list.length > 0) {
          setSelectedMovieCd(list[0].movieCd);
        } else {
          setSelectedMovieCd(null);
          setMovieDetail(null);
        }
      } catch (err: any) {
        setBoxOfficeError(err.message || "오류가 발생했습니다.");
        setBoxOfficeList([]);
        setSelectedMovieCd(null);
        setMovieDetail(null);
      } finally {
        setLoadingBoxOffice(false);
      }
    }
    
    fetchBoxOffice();
  }, [selectedDate]);

  // Fetch Movie Detail
  useEffect(() => {
    async function fetchMovieDetail() {
      if (!selectedMovieCd) return;
      setLoadingMovie(true);
      setMovieError(null);
      
      try {
        const res = await fetch(`/api/movie?movieCd=${selectedMovieCd}`);
        if (!res.ok) {
          throw new Error("영화 상세 정보를 불러오는데 실패했습니다.");
        }
        const data: MovieInfoResponse = await res.json();
        setMovieDetail(data.movieInfoResult?.movieInfo || null);
      } catch (err: any) {
        setMovieError(err.message || "오류가 발생했습니다.");
        setMovieDetail(null);
      } finally {
        setLoadingMovie(false);
      }
    }
    
    fetchMovieDetail();
  }, [selectedMovieCd]);

  // Reset review compose form when switching movie
  useEffect(() => {
    setBriefReview("");
    setReviewError(null);
  }, [selectedMovieCd]);

  // Handle Date Navigation
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    if (selectedDate >= yesterdayDateStr) return; // Prevent going beyond yesterday
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Format Helper: numbers with comma
  const formatNumber = (numStr: string) => {
    const number = parseInt(numStr, 10);
    return isNaN(number) ? numStr : number.toLocaleString();
  };

  // Filter lists
  const filteredList = boxOfficeList.filter(item => {
    const matchesSearch = item.movieNm.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNew = filterNewOnly ? item.rankOldAndNew === "NEW" : true;
    return matchesSearch && matchesNew;
  });

  // Calculate total statistics for loaded movies
  const totalAudience = boxOfficeList.reduce((acc, curr) => acc + parseInt(curr.audiCnt || "0", 10), 0);
  const totalScreens = boxOfficeList.reduce((acc, curr) => acc + parseInt(curr.scrnCnt || "0", 10), 0);

  // Formatting date to elegant editorial format: e.g. "VOLUME 2026 // ISSUE 05.28"
  const getIssueDateString = () => {
    if (!selectedDate) return "";
    const parts = selectedDate.split("-");
    if (parts.length < 3) return selectedDate;
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  };

  // Handle Item click to pop up Dossier
  const handleMovieClick = (movieCd: string) => {
    setSelectedMovieCd(movieCd);
    setIsDossierOpen(true);
  };

  // Expand simple user review into detailed critic critique using Gemini route
  const handleGenerateDetailedReview = async () => {
    if (!selectedMovieCd || !movieDetail || !briefReview.trim()) return;
    
    setLoadingExpansion(true);
    setReviewError(null);

    try {
      const res = await fetch("/api/review/expand", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieNm: movieDetail.movieNm,
          briefReview: briefReview,
          director: movieDetail.directors?.[0]?.peopleNm || "",
          genre: movieDetail.genres?.[0]?.genreNm || "",
        }),
      });

      if (!res.ok) {
        throw new Error("AI 평론 생성을 위한 서버 통신에 실패했습니다.");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const expandedText = data.expandedReview;
      
      // Update local and storage
      const updatedReviews = { ...savedReviews, [selectedMovieCd]: expandedText };
      setSavedReviews(updatedReviews);
      localStorage.setItem("editorial_movie_reviews", JSON.stringify(updatedReviews));
      
      setBriefReview("");
    } catch (err: any) {
      console.error(err);
      setReviewError(err.message || "평론을 완성하는 중에 에러가 일어났습니다.");
    } finally {
      setLoadingExpansion(false);
    }
  };

  // Delete saved editorial review for item
  const handleDeleteSavedReview = (movieCd: string) => {
    const updated = { ...savedReviews };
    delete updated[movieCd];
    setSavedReviews(updated);
    localStorage.setItem("editorial_movie_reviews", JSON.stringify(updated));
  };

  // Get Rank #1 item
  const rank1Movie = boxOfficeList.find(item => item.rank === "1");

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1C1C1C] flex flex-col antialiased font-sans select-none tracking-tight">
      
      {/* Outer paper wrapper with elegant thin border */}
      <div className="max-w-7xl w-full mx-auto p-4 md:p-8 lg:p-10 flex-grow flex flex-col gap-8 relative">
        
        {/* Newspaper Style Top Header Section */}
        <header className="border-b-[3px] border-black pb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-red-600 mb-2 font-mono">
              Volume {selectedDate ? selectedDate.substring(0, 4) : "2026"} // Issue {selectedDate ? selectedDate.substring(5, 7) + selectedDate.substring(8, 10) : "0528"}
            </span>
            <h1 className="text-6xl md:text-8xl font-serif font-black leading-none uppercase italic tracking-tighter">
              Box Office
            </h1>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-3">
            {/* Elegant custom date layout selection */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60 font-mono">Select Date</span>
              
              <div className="flex items-center bg-black text-white px-4 py-2 border border-black hover:bg-black/90 transition-colors gap-3 rounded-none relative">
                <span className="font-serif italic text-lg tracking-wide select-all">{getIssueDateString()}</span>
                <input 
                  type="date"
                  value={selectedDate}
                  max={yesterdayDateStr}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  id="date-native-trigger"
                />
                <Calendar className="w-4 h-4 text-white/80" />
              </div>
            </div>

            <p className="text-xs md:text-sm font-serif italic text-slate-600 max-w-sm md:text-right leading-relaxed">
              An exhaustive daily analysis of theatrical performance and cinematic distribution trends across the peninsula.
            </p>
          </div>
        </header>

        {/* Date Stepper Section */}
        <div className="flex justify-between items-center bg-[#E8E6E1]/40 border border-black/10 px-4 py-3 -mt-4">
          <button 
            onClick={handlePrevDay}
            className="flex items-center gap-1.5 text-xs font-serif italic font-bold hover:underline"
            id="btn-day-prev"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous Day
          </button>

          <span className="text-xs font-mono font-bold tracking-widest uppercase opacity-60">
            {selectedDate === yesterdayDateStr ? "LATEST CHART (YESTERDAY)" : "HISTORICAL RECORD"}
          </span>

          <button 
            onClick={handleNextDay}
            disabled={selectedDate >= yesterdayDateStr}
            className="flex items-center gap-1.5 text-xs font-serif italic font-bold hover:underline disabled:opacity-30 disabled:no-underline"
            id="btn-day-next"
          >
            Next Day <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Key Indicators Bar - Pure Editorial Grid layout */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 border-b border-black/10 pb-6 text-sm">
          <div className="border-r border-black/15 pr-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono mb-1">상영 기간 Range</p>
            <p className="text-base font-serif italic font-black">{showRange || "Fetching..."}</p>
          </div>
          <div className="md:border-r border-black/15 pr-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono mb-1">총 관객 Admissions</p>
            <p className="text-xl font-mono font-bold">{loadingBoxOffice ? "..." : `${formatNumber(String(totalAudience))} 명`}</p>
          </div>
          <div className="border-r border-black/15 pr-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono mb-1">총 스크린수 Screens</p>
            <p className="text-xl font-mono font-bold">{loadingBoxOffice ? "..." : `${formatNumber(String(totalScreens))} 개`}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono mb-1">데이터 동기화 Status</p>
            <div className="flex items-center gap-1.5 font-serif italic font-bold text-red-700 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> Verified OpenAPI
            </div>
          </div>
        </section>

        {/* Workspace splitting: Grid elements */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-grow">
          
          {/* LEFT: Box Office List (7 Cols) */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Search and Filters with black minimalist theme */}
            <div className="flex items-center gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="박스오피스 영화 제목 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#E8E6E1]/20 border border-black text-[#1C1C1C] text-sm pl-10 pr-4 py-2.5 rounded-none font-serif italic focus:outline-none focus:bg-[#E8E6E1]/40 transition-all"
                  id="editorial-search"
                />
              </div>

              <button
                onClick={() => setFilterNewOnly(!filterNewOnly)}
                className={`px-4 py-2.5 text-xs font-bold tracking-wider uppercase transition-all rounded-none border border-black ${
                  filterNewOnly 
                    ? "bg-black text-white" 
                    : "bg-transparent text-black hover:bg-black/5"
                }`}
                title="차트 신규 진입작 필터"
                id="editorial-filter-new"
              >
                <span className="flex items-center gap-1.5 font-mono">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>NEW ON CHART</span>
                </span>
              </button>
            </div>

            {/* List Header */}
            <div className="grid grid-cols-12 border-b-[2px] border-black text-[10px] font-mono font-bold uppercase tracking-widest pb-2 opacity-60">
              <div className="col-span-1">Rank</div>
              <div className="col-span-8 md:col-span-7">Title // Release</div>
              <div className="col-span-3 text-right">Daily Admissions</div>
              <div className="hidden md:block col-span-1 text-right">Share</div>
            </div>

            {/* List Body */}
            {loadingBoxOffice ? (
              <div className="flex flex-col">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="py-6 border-b border-black/10 animate-pulse flex justify-between">
                    <div className="h-6 bg-slate-300 w-12" />
                    <div className="h-6 bg-slate-300 w-48" />
                    <div className="h-6 bg-slate-300 w-24" />
                  </div>
                ))}
              </div>
            ) : boxOfficeError ? (
              <div className="border border-black p-8 text-center bg-[#E8E6E1]/30">
                <p className="font-serif italic text-lg text-red-800 font-bold">{boxOfficeError}</p>
                <button 
                  onClick={() => setSelectedDate(yesterdayDateStr)}
                  className="mt-4 px-6 py-2 bg-black text-white text-xs font-mono font-bold tracking-wider uppercase hover:bg-black/80 transition"
                  id="btn-error-reset"
                >
                  Reset To Latest Date
                </button>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="border border-dashed border-black/20 p-16 text-center text-slate-500 bg-[#E8E6E1]/10">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-45" />
                <p className="font-serif italic text-lg text-[#1C1C1C]">No records matching the search criterion.</p>
                <p className="text-xs font-mono mt-1">Please try modifying keywords or reset active toggles.</p>
              </div>
            ) : (
              <motion.div 
                className="flex flex-col"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.03 }
                  }
                }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredList.map((item) => {
                    const isSelected = selectedMovieCd === item.movieCd;
                    const changeVal = parseInt(item.rankInten, 10);
                    const hasMyReview = !!savedReviews[item.movieCd];
                    
                    return (
                      <motion.div
                        key={item.movieCd}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        onClick={() => handleMovieClick(item.movieCd)}
                        className={`grid grid-cols-12 items-center py-4 border-b border-black/10 cursor-pointer transition-all ${
                          isSelected 
                            ? "bg-[#E8E6E1]/40 border-l-[4px] border-l-black px-1" 
                            : "hover:bg-black/5"
                        } group`}
                        id={`movie-item-${item.movieCd}`}
                      >
                        {/* Rank */}
                        <div className="col-span-1 flex flex-col items-start justify-center pr-1 select-none">
                          <span className="font-serif italic text-2xl lg:text-3xl leading-none">
                            {String(item.rank).padStart(2, '0')}
                          </span>
                          
                          {/* Rank Shift Indicator */}
                          <div className="flex items-center text-[9px] mt-0.5 font-mono">
                            {item.rankOldAndNew === "NEW" ? (
                              <span className="text-red-700 font-black">NEW</span>
                            ) : changeVal > 0 ? (
                              <span className="text-emerald-700 flex items-center font-bold">▲{changeVal}</span>
                            ) : changeVal < 0 ? (
                              <span className="text-red-600 flex items-center font-bold">▼{Math.abs(changeVal)}</span>
                            ) : (
                              <span className="text-slate-400 font-bold">-</span>
                            )}
                          </div>
                        </div>

                        {/* Title & Release Info */}
                        <div className="col-span-8 md:col-span-7 flex flex-col pl-2 pr-4">
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif uppercase font-bold text-sm lg:text-base text-[#1C1C1C] truncate leading-tight group-hover:underline">
                              {item.movieNm}
                            </h3>
                            {hasMyReview && (
                              <span className="inline-flex items-center gap-0.5 bg-red-600/10 border border-red-600/20 text-red-700 text-[9px] font-mono font-bold px-1 rounded-sm">
                                <MessageSquare className="w-2.5 h-2.5" /> CRITIQUE
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500 mt-1">
                            <span>개봉일: {item.openDt || "N/A"}</span>
                            <span>•</span>
                            <span>누적: {formatNumber(item.audiAcc)}명</span>
                          </div>
                        </div>

                        {/* Daily Admissions */}
                        <div className="col-span-3 text-right pr-2">
                          <p className="font-mono text-sm lg:text-base font-bold leading-none">{formatNumber(item.audiCnt)}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">명 / DAY</p>
                        </div>

                        {/* Percentage Share visual column */}
                        <div className="hidden md:flex col-span-1 items-center justify-end pl-2">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-mono font-bold text-slate-700 bg-[#E8E6E1]/80 px-1.5 py-0.5 border border-black/5">
                              {item.salesShare}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </section>

          {/* RIGHT: Featured Daily dispatch / Spotlight (5 cols) */}
          <section className="lg:col-span-5 lg:sticky lg:top-8 flex flex-col gap-6">
            
            {/* Spotlight Card - Rank 1 Movie highlights (Matches design requirements) */}
            <div className="border-[2px] border-black bg-[#E8E6E1] p-6 flex flex-col gap-6 relative shadow-md">
              <div className="absolute top-4 right-4">
                <span className="bg-red-700 text-white font-mono font-bold text-[9px] tracking-widest px-2 py-0.5 uppercase">
                  DAILY LEADER
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1C1C1C]/60 block mb-1">
                  Spotlight Dispatch Box
                </span>
                <h2 className="text-2xl font-serif font-black uppercase italic leading-none text-[#1C1C1C]">
                  🏆 오늘의 흥행 왕좌
                </h2>
              </div>

              {loadingBoxOffice ? (
                <div className="flex flex-col gap-4 animate-pulse py-10">
                  <div className="h-8 bg-slate-300 w-2/3" />
                  <div className="h-4 bg-slate-300 w-1/2" />
                  <div className="h-24 bg-slate-400 w-full" />
                </div>
              ) : rank1Movie ? (
                <div className="flex flex-col">
                  {/* Visual Layout representing a retro article header */}
                  <div className="border-t border-b border-black/20 py-4 flex flex-col gap-2">
                    <span className="text-7xl font-serif italic text-slate-800 leading-none antialiased select-none font-black block">01</span>
                    <h3 className="text-2xl font-serif uppercase font-bold text-[#1C1C1C] tracking-tight leading-tight select-all">
                      {rank1Movie.movieNm}
                    </h3>
                    <p className="text-xs font-serif italic text-slate-600">
                      개봉 {rank1Movie.openDt || "정보 없음"} // 관객 점유율 {rank1Movie.salesShare}% 기록 중
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-2 text-sm">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Daily (일일)</span>
                      <span className="text-xl font-mono font-bold text-[#1C1C1C]">
                        {formatNumber(rank1Movie.audiCnt)} 명
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Accumulated (누적)</span>
                      <span className="text-lg font-mono font-bold text-slate-800">
                        {formatNumber(rank1Movie.audiAcc)} 명
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleMovieClick(rank1Movie.movieCd)}
                    className="mt-6 w-full py-3 bg-black text-white hover:bg-black/90 font-serif italic text-sm font-black flex items-center justify-center gap-2"
                    id="btn-spotlight-dossier"
                  >
                    <span>Open Critical Dossier</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-sm font-serif italic text-slate-500 py-10 text-center">
                  차트 정보가 온전히 준비되지 않았습니다.
                </p>
              )}
            </div>

            {/* Editorial column sidebar card */}
            <div className="border border-black/10 p-6 bg-[#FDFCF8] flex flex-col gap-3">
              <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-slate-400">
                Editorial Column
              </span>
              <h4 className="font-serif italic text-base font-bold">
                "매체 연동형 평론 작성 기능의 개막"
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                각 영화 카드를 터치하면 고풍스러운 매엽식 기밀 장부 형태의 <strong>'개별 영화 Dossier'</strong> 팝업이 전개됩니다. 
                그곳에서 수석 평론가의 유려한 상세 감상평 발송 기능을 통하여 나만의 평론록을 쌓아 올려 가십시오.
              </p>
              <div className="border-t border-black/10 pt-3 mt-1 flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Preserved Archive</span>
                <span>Korea Film Archive</span>
              </div>
            </div>

          </section>

        </div>

      </div>

      {/* RENDER MODAL: Dossier detailed overlay */}
      <AnimatePresence>
        {isDossierOpen && selectedMovieCd && (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-[#FDFCF8] border-[3px] border-black max-w-2xl w-full my-auto overflow-hidden shadow-2xl rounded-none flex flex-col relative"
              id="dossier-modal-container"
            >
              
              {/* Corner Close button */}
              <button 
                onClick={() => setIsDossierOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-black hover:bg-black/5 p-1.5 border border-black/10 transition-colors z-20"
                title="Dossier 닫기"
                id="btn-close-dossier"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Manila document folder styled header */}
              <div className="bg-[#E8E6E1]/50 p-6 md:p-8 border-b-2 border-black flex flex-col gap-1 pr-14 select-none">
                <span className="bg-red-700 text-white font-mono font-bold text-[9px] tracking-widest px-2 py-0.5 uppercase w-max mb-1">
                  OFFICIAL CINEMA DOSSIER
                </span>
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                  Subject Identifier // CD-{selectedMovieCd}
                </span>
                <h2 className="text-2xl md:text-3xl font-serif font-black uppercase italic tracking-tight text-[#1C1C1C]">
                  📂 개별 영화 보도자료철
                </h2>
              </div>

              {/* Dossier contents (Scrollable body) */}
              <div className="p-6 md:p-8 overflow-y-auto max-h-[65vh] flex flex-col gap-6">
                
                {loadingMovie ? (
                  <div className="flex flex-col gap-4 animate-pulse py-10">
                    <div className="h-6 bg-slate-300 w-1/3" />
                    <div className="h-20 bg-slate-300 w-full" />
                    <div className="h-6 bg-slate-300 w-2/3" />
                    <div className="h-24 bg-slate-300 w-full" />
                  </div>
                ) : movieError ? (
                  <div className="text-center py-10 border border-red-200 bg-red-50/50 p-6">
                    <p className="font-serif italic font-bold text-red-800 text-lg">{movieError}</p>
                    <p className="text-xs font-mono text-slate-500 mt-2">Could not sync detailed KOBIS records.</p>
                  </div>
                ) : movieDetail ? (
                  <div className="flex flex-col gap-6">
                    
                    {/* Film Profile Card */}
                    <div className="pb-5 border-b border-black/25">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-red-700">
                        {movieDetail.genres?.[0]?.genreNm || "Cinematic Art"}
                      </span>
                      <h3 className="text-3xl md:text-4xl font-serif font-black uppercase leading-tight mt-1 text-[#1C1C1C] select-all">
                        {movieDetail.movieNm}
                      </h3>
                      {movieDetail.movieNmEn && (
                        <p className="text-xs font-serif italic text-slate-600 mt-1">
                          {movieDetail.movieNmEn}
                        </p>
                      )}
                    </div>

                    {/* Metadata typewriter matrix */}
                    <table className="w-full text-xs text-left border-collapse font-sans select-text">
                      <tbody>
                        <tr className="border-b border-black/5">
                          <th className="py-2.5 font-mono font-bold text-slate-500 uppercase tracking-wider w-1/3">Running Time (상영시간)</th>
                          <td className="py-2.5 text-right font-mono font-bold text-[#1C1C1C]">{movieDetail.showTm || "N/A"} 분</td>
                        </tr>
                        <tr className="border-b border-black/5">
                          <th className="py-2.5 font-mono font-bold text-slate-500 uppercase tracking-wider">Production Year (제작년도)</th>
                          <td className="py-2.5 text-right font-mono font-bold text-[#1C1C1C]">{movieDetail.prdtYear || "N/A"}년</td>
                        </tr>
                        <tr className="border-b border-black/5">
                          <th className="py-2.5 font-mono font-bold text-slate-500 uppercase tracking-wider">Nation Origin (제작소재)</th>
                          <td className="py-2.5 text-right font-serif italic font-bold text-[#1C1C1C]">{movieDetail.nations?.[0]?.nationNm || "정보 없음"}</td>
                        </tr>
                        <tr className="border-b border-black/5">
                          <th className="py-2.5 font-mono font-bold text-slate-500 uppercase tracking-wider">Watch Grade (관람기준)</th>
                          <td className="py-2.5 text-right">
                            <span className="font-mono bg-black text-white px-2 py-0.5 text-[10px] font-bold uppercase">
                              {movieDetail.audits?.[0]?.watchGradeNm || "전체관람가"}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Directors & Genres */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border border-black/10 p-3 bg-black/5">
                        <p className="text-[9px] font-mono font-bold uppercase text-slate-400 mb-0.5">Director (감독)</p>
                        <p className="text-sm font-serif italic font-semibold text-[#1C1C1C]">
                          {movieDetail.directors && movieDetail.directors.length > 0 ? (
                            movieDetail.directors.map(dir => dir.peopleNm).join(", ")
                          ) : (
                            "감독 미상"
                          )}
                        </p>
                      </div>
                      <div className="border border-black/10 p-3 bg-black/5">
                        <p className="text-[9px] font-mono font-bold uppercase text-slate-400 mb-1.5">Genre Classification (장르)</p>
                        <div className="flex flex-wrap gap-1">
                          {movieDetail.genres && movieDetail.genres.length > 0 ? (
                            movieDetail.genres.map((g, idx) => (
                              <span key={idx} className="bg-black text-[#FDFCF8] font-mono text-[9px] font-bold px-1.5 py-0.5 uppercase">
                                {g.genreNm}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 font-serif text-xs">장르 없음</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actors */}
                    <div className="border-t border-black/10 pt-4">
                      <p className="text-[10px] font-mono font-bold uppercase text-slate-500 mb-2 flex justify-between items-center select-none">
                        <span>Cast Roll (주요 출연 배우)</span>
                        <Users className="h-3.5 w-3.5 opacity-60" />
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs font-sans max-h-36 overflow-y-auto pr-1 select-text">
                        {movieDetail.actors && movieDetail.actors.length > 0 ? (
                          movieDetail.actors.slice(0, 8).map((actor, idx) => (
                            <div key={idx} className="bg-slate-50 border border-black/5 p-2 flex flex-col justify-center">
                              <span className="font-bold text-[#1C1C1C]">{actor.peopleNm}</span>
                              {actor.cast && (
                                <span className="text-[10px] text-slate-500 font-mono mt-0.5 italic truncate">
                                  {actor.cast} 역
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 font-serif col-span-2 py-4 text-center">캐스팅 배역 정보 부재</span>
                        )}
                      </div>
                    </div>

                    {/* AI Critique Section (The active user review expands here) */}
                    <div className="border-t-2 border-black pt-5 mt-2 flex flex-col gap-4">
                      
                      <div className="flex items-center justify-between border-b border-black/10 pb-2">
                        <h4 className="text-lg font-serif font-black uppercase italic text-red-800 flex items-center gap-1.5">
                          <Award className="w-5 h-5" /> 수석 평론가 상세 평론 (Critique)
                        </h4>
                        
                        {savedReviews[selectedMovieCd] && (
                          <button 
                            onClick={() => handleDeleteSavedReview(selectedMovieCd)}
                            className="text-[10px] font-mono font-black text-slate-400 hover:text-red-700 underline uppercase"
                          >
                            초기화 (Reset)
                          </button>
                        )}
                      </div>

                      {/* Display synthesized critique if exists */}
                      {savedReviews[selectedMovieCd] ? (
                        <div className="bg-[#E8E6E1]/25 border-l-4 border-l-black p-4 md:p-6 transition-all select-text">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Type: Premium Expanded Review // Powered by Gemini
                          </p>
                          <div className="font-serif italic text-slate-800 text-sm md:text-base leading-relaxed whitespace-pre-line text-justify">
                            {savedReviews[selectedMovieCd]}
                          </div>
                          <p className="text-[10px] text-right font-serif opacity-50 mt-4">
                            - Dispatch Film Critic, Cultural Division Director
                          </p>
                        </div>
                      ) : (
                        <div className="border border-dashed border-black/20 p-6 text-center bg-black/5">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-35" />
                          <p className="font-serif italic text-sm text-[#1C1C1C] font-semibold">
                            현재 수석 평론가의 상세 연재글이 비어 있습니다.
                          </p>
                          <p className="text-xs text-slate-500 font-sans mt-1">
                            아래의 집필소에서 나만의 한줄평을 써 주시면 고급스러운 가사 해설서 평론으로 즉각 탈바꿈해 드립니다!
                          </p>
                        </div>
                      )}

                      {/* Review Composer composer writing container */}
                      <div className="border border-black p-4 bg-slate-50/50 flex flex-col gap-3">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-[#1C1C1C]" />
                          <label htmlFor="review-composer" className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#1C1C1C]">
                            Draft Critique (간단한 영화 평론 집필소)
                          </label>
                        </div>

                        <textarea
                          id="review-composer"
                          placeholder={`${movieDetail.movieNm} 영화에 대해 느낀 짧은 주관적 소감이나 평점을 인상 깊은 키워드와 함께 자유롭게 적어 보세요... (예: 전개가 무척 짜임새 있고, 배우 열연이 소름돋았음)`}
                          value={briefReview}
                          onChange={(e) => setBriefReview(e.target.value)}
                          disabled={loadingExpansion}
                          rows={3}
                          className="w-full bg-[#FDFCF8] border border-black/20 p-3 text-xs sm:text-sm font-sans focus:outline-none focus:border-black/60 transition-colors placeholder:text-slate-400 placeholder:italic select-text"
                          maxLength={300}
                        />

                        {reviewError && (
                          <p className="text-[11px] text-red-700 font-serif italic text-left">
                            ⚠️ {reviewError}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-4 mt-1 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-400 select-none">
                            {briefReview.length} / 300자 내외 집필
                          </span>

                          <button
                            onClick={handleGenerateDetailedReview}
                            disabled={loadingExpansion || !briefReview.trim()}
                            className="bg-black hover:bg-black/80 disabled:opacity-40 disabled:hover:bg-black text-[#FDFCF8] px-4 py-2 text-xs font-serif italic font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5"
                          >
                            {loadingExpansion ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-[#FDFCF8]/30 border-t-[#FDFCF8] rounded-full animate-spin" />
                                <span>Drafting by Gemini...</span>
                              </>
                            ) : (
                              <>
                                <Sparkle className="w-3.5 h-3.5 text-[#FDFCF8]" />
                                <span>AI 상세 평론 완성하기</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                ) : null}

              </div>

              {/* Manila Folder Footer bar inside detailed modal file */}
              <div className="border-t border-black p-4 bg-[#E8E6E1]/30 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase select-none">
                <span>Preserved dossier copy #01</span>
                <span>Dispatch Film Archives</span>
                <button 
                  onClick={() => setIsDossierOpen(false)}
                  className="font-bold underline text-black cursor-pointer hover:opacity-75"
                >
                  Close Record
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grid line background overlay purely for typographic aesthetics */}
      <footer className="border-t-[2px] border-black bg-[#E8E6E1]/20 py-8 text-xs relative z-10 w-full mt-auto select-none">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-serif font-black uppercase">The Box Office Daily Dispatch</p>
            <p className="text-slate-500 font-mono text-[10px] mt-0.5">© 2026 Korean Film Council (KOBIS) OpenAPI. All records preserved.</p>
          </div>
          <p className="font-mono text-[10px] text-slate-400 border border-black/15 px-2 py-1">
            POWERED BY GOOGLE AI STUDIO SANDBOX
          </p>
        </div>
      </footer>
    </div>
  );
}
