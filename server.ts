import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Lazy-initialized Google GenAI client getter
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const app = express();

// Middleware for parsing JSON bodies
app.use(express.json());

// API Routes
app.get("/api/boxoffice", async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: "date parameter is required (format: YYYYMMDD)" });
  }

  const key = process.env.KOBIS_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "KOBIS_API_KEY environment variable is not configured." });
  }

  try {
    const url = `http://kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=${key}&targetDt=${date}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`KOBIS API returned status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error(`[Error] Proxying Box Office:`, error);
    res.status(500).json({ error: error.message || "Failed to fetch box office data." });
  }
});

app.get("/api/movie", async (req, res) => {
  const { movieCd } = req.query;
  if (!movieCd) {
    return res.status(400).json({ error: "movieCd parameter is required" });
  }

  const key = process.env.KOBIS_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "KOBIS_API_KEY environment variable is not configured." });
  }

  try {
    const url = `http://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json?key=${key}&movieCd=${movieCd}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`KOBIS API returned status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error(`[Error] Proxying Movie Info:`, error);
    res.status(500).json({ error: error.message || "Failed to fetch movie info." });
  }
});

// AI Detailed Review generator endpoint
app.post("/api/review/expand", async (req, res) => {
  const { movieNm, briefReview, director, genre } = req.body;

  if (!movieNm || !briefReview) {
    return res.status(400).json({ error: "movieNm and briefReview parameters are required." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return beautiful fallback in case API key isn't provided yet
    return res.json({ 
      expandedReview: `[AI 데모 안내] API 키가 아직 설정되지 않았습니다. 설정되면 아래의 간단한 한줄평이 명망 높은 평론가의 정교한 해설글로 자동 변환됩니다:\n\n"영화 평론: ${movieNm}은(는) 관객들에게 깊은 울림을 전해준 작품입니다. 사용자 한줄평에 담긴 긍정적 여운을 바탕으로, 연출과 연기의 시너지가 훌륭했음을 평합니다."` 
    });
  }

  try {
    const prompt = `
당신은 전통 있고 품격 있는 일간지의 정예 수석 영화 평론가이자 문화부 디렉터입니다. 
사용자가 영화에 대해 남긴 아주 짧고 직관적인 감상평이나 키워드를 기반으로, 기사화할 수 있을 만큼 품격 있고 문학적인 수준의 상세 감상평(평론)을 한국어로 작성해 주세요.

대상 영화 정보:
- 제목: ${movieNm}
${director ? `- 감독: ${director}` : ""}
${genre ? `- 장르: ${genre}` : ""}

사용자의 한줄 감상평:
"${briefReview}"

작성 지침:
1. 영화 평론은 신뢰감 있고 단호하며 문학적 여운이 남는 깊이 있는 평론가 조의 연출 문체를 유지하세요.
2. 사용자의 핵심 경험과 감정을 해치지 않으면서, 그 감정이 들게 된 이유에 대해 연출적 요소(화면 미학, 연기 호흡, 전개 리듬감 등)를 가볍게 엮어서 유려한 비유를 섞어 상세히 전개해 줍니다.
3. 글의 길이는 2~3개 단락으로 잘 정돈되어 읽기 쉽게 기고문 스타일로 작성하세요.
4. 제목이나 서론적인 군더더기 없이 본문 내용만 품위 있는 고풍스러운 필체로 출력 결과를 즉시 반환해 주세요.
`;

    let response;
    try {
      console.log("Attempting review generation with gemini-3.5-flash...");
      response = await getAiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
    } catch (firstError: any) {
      console.warn("gemini-3.5-flash was unavailable or overloaded. Falling back to gemini-3.1-flash-lite...", firstError.message || firstError);
      response = await getAiClient().models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
      });
    }

    const expandedReview = response.text || "해당 감상평을 기반으로 평론을 작성할 수 없습니다. 다시 시도해 주세요.";
    res.json({ expandedReview });
  } catch (error: any) {
    console.error(`[Error] AI Review Expansion:`, error);
    
    // Resilient fallback critique if all API calls fail
    const fallbackReview = `[수석 평론가 예비 기고문]
현재 일간지 마감 시각 및 송출 과부하로 인하여 AI 전송망이 지연되고 있으나, 제출해 주신 가치 있는 소감을 수렴하여 아래와 같이 평론의 골자를 구성해 올립니다.

영화 《${movieNm}》${director ? `(감독 ${director})` : ""}${genre ? `은/는 장르적 미학인 '${genre}'` : "은/는 극적인 연출미"}의 관점을 영리하게 관통해 냅니다. 감상자께서 표명해 주신 "${briefReview}"라는 감상은 단지 주관적인 경험에 머물지 않고 현 사조의 사회적 정서와 미시적 화면 미학 속에서 정확히 공명하고 있습니다. 특히 극적 서사의 흐름과 배우진들의 몰입 가득한 연기력은 관객들로 하여금 깊은 여운을 자아내도록 기획되었습니다. 본 평론부는 감상자님의 의견대로 이번 작품이 지닌 깊이 있는 호소력에 동조하고자 합니다.

(※ 현재 AI 서비스 서버의 일시적인 높은 부하로 인하여 임시 기고 평론문으로 전개되었습니다. 잠시 후 다시 조율 및 평론작성을 시도해 보실 수 있습니다.)`;

    res.json({ expandedReview: fallbackReview });
  }
});

export default app;

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Failed to start server", err);
  });
}
