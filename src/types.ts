export interface DailyBoxOfficeItem {
  rnum: string;
  rank: string;
  rankInten: string;
  rankOldAndNew: "OLD" | "NEW";
  movieCd: string;
  movieNm: string;
  openDt: string;
  salesAmt: string;
  salesShare: string;
  salesInten: string;
  salesChange: string;
  salesAcc: string;
  audiCnt: string;
  audiInten: string;
  audiChange: string;
  audiAcc: string;
  scrnCnt: string;
  showCnt: string;
}

export interface BoxOfficeResponse {
  boxOfficeResult: {
    boxofficeType: string;
    showRange: string;
    dailyBoxOfficeList: DailyBoxOfficeItem[];
  };
}

export interface MovieInfoActor {
  peopleNm: string;
  peopleNmEn: string;
  cast: string;
  castEn: string;
}

export interface MovieInfoDirector {
  peopleNm: string;
  peopleNmEn: string;
}

export interface MovieInfoNation {
  nationNm: string;
}

export interface MovieInfoGenre {
  genreNm: string;
}

export interface MovieInfoAudit {
  auditNo: string;
  watchGradeNm: string;
}

export interface MovieInfoCompany {
  companyCd: string;
  companyNm: string;
  companyNmEn: string;
  companyPartNm: string;
}

export interface MovieInfo {
  movieCd: string;
  movieNm: string;
  movieNmEn: string;
  movieNmOg: string;
  showTm: string;
  openDt: string;
  prdtYear: string;
  typeNm: string;
  statusNm: string;
  nations: MovieInfoNation[];
  genres: MovieInfoGenre[];
  directors: MovieInfoDirector[];
  actors: MovieInfoActor[];
  companys: MovieInfoCompany[];
  audits: MovieInfoAudit[];
}

export interface MovieInfoResponse {
  movieInfoResult: {
    movieInfo: MovieInfo;
    source: string;
  };
}
